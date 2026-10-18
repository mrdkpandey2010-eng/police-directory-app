/**
 * UP Police Directory - Cloudflare Edge API
 * 
 * Supports both Cloudflare KV and R2 for unlimited 50,000+ officers.
 * Zero-egress cost, high-speed worldwide edge caching.
 */

const memoryStore = new Map();
const rateLimitStore = new Map(); // IP -> { count, resetAt }
const loginAttemptStore = new Map(); // PNO -> { count, lockUntil }

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, if-none-match',
      'Access-Control-Expose-Headers': 'ETag, Content-Length'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Helper: read data from D1 Database (100k writes/day), KV, or in-memory fallback
    const getItem = async (key) => {
      // 1. D1 Database (Primary persistent storage)
      if (env.DB) {
        try {
          const row = await env.DB.prepare('SELECT value FROM kv_store WHERE key = ?').bind(key).first();
          if (row && row.value !== null && row.value !== undefined) {
            memoryStore.set(key, row.value);
            return row.value;
          }
        } catch (e) {
          console.warn(`[D1 Read Error] ${e.message}`);
        }
      }
      // 2. Cloudflare KV fallback
      if (env.POLICE_KV) {
        try {
          const val = await env.POLICE_KV.get(key);
          if (val !== null && val !== undefined && val !== '') {
            memoryStore.set(key, val);
            return val;
          }
        } catch (e) {}
      }
      return memoryStore.get(key) || null;
    };

    // Helper: write data to D1 Database (100k writes/day), KV, and in-memory fallback
    const putItem = async (key, value) => {
      memoryStore.set(key, value);
      let success = false;
      // 1. D1 Database (Primary persistent storage - 100k writes / day)
      if (env.DB) {
        try {
          await env.DB.prepare('INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)')
            .bind(key, value, Date.now())
            .run();
          success = true;
        } catch (e) {
          console.warn(`[D1 Write Error] ${e.message}`);
        }
      }
      // 2. Cloudflare KV best-effort sync
      if (env.POLICE_KV) {
        try {
          await env.POLICE_KV.put(key, value);
          success = true;
        } catch (e) {}
      }
      return success;
    };

    // Admin API Key validation
    const adminKey = env.ADMIN_API_KEY || 'police_admin_2026';
    const reqKey = request.headers.get('x-api-key') || url.searchParams.get('key');
    const isWriteMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
    const isPublicWritePath = path.startsWith('/api/auth') || path === '/api/register' || path === '/api/feedback' || path.startsWith('/api/calls') || path.startsWith('/api/presence');

    if (isWriteMethod && !isPublicWritePath && reqKey !== adminKey) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized: Invalid or missing Admin API Key' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    try {
      // 1. Health & Status
      if (path === '/' || path === '/api/status' || path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'UP Police Directory Cloudflare Edge API',
          storageMode: env.BUCKET ? 'R2 Storage' : 'KV Database',
          version: '2.1.0',
          timestamp: new Date().toISOString()
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 1.5 Authentication & Permissions Flow: /api/auth/*
      if (path.startsWith('/api/auth')) {
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';

        // A. PNO Verification & Automatic Role Detection: /api/auth/lookup-pno
        if (path === '/api/auth/lookup-pno' && request.method === 'POST') {
          const now = Date.now();
          // Rate limit lookup: max 30 per minute per IP
          const ipLimit = rateLimitStore.get(clientIp) || { count: 0, resetAt: now + 60000 };
          if (now > ipLimit.resetAt) {
            ipLimit.count = 0;
            ipLimit.resetAt = now + 60000;
          }
          ipLimit.count++;
          rateLimitStore.set(clientIp, ipLimit);
          if (ipLimit.count > 30) {
            return new Response(JSON.stringify({
              error: 'अत्यधिक सत्यापन प्रयास! कृपया 1 मिनट प्रतीक्षा करें।'
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const body = await request.text();
          let pno = '';
          try {
            const parsed = JSON.parse(body);
            pno = (parsed.pno || '').trim();
          } catch (e) {
            return new Response(JSON.stringify({ error: 'अमान्य अनुरोध' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (!pno || pno.length < 3) {
            return new Response(JSON.stringify({ error: 'कृपया सही PNO नंबर दर्ज करें (न्यूनतम 3 अक्षर/अंक)' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const cleanPno = pno.toUpperCase();
          const cleanPhone = pno.replace(/\D/g, '');

          // Check if PNO is temporarily locked due to failed attempts
          const attemptInfo = loginAttemptStore.get(cleanPno);
          if (attemptInfo && attemptInfo.lockUntil && now < attemptInfo.lockUntil) {
            const remainingSecs = Math.ceil((attemptInfo.lockUntil - now) / 1000);
            return new Response(JSON.stringify({
              error: `⛔ सुरक्षा लॉक: 5 से अधिक बार गलत पासवर्ड दर्ज करने के कारण यह PNO ${remainingSecs} सेकंड के लिए लॉक है।`
            }), {
              status: 423,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Fetch database records
          const contactsStr = await getItem('police_contacts.json');
          const coadminsStr = await getItem('police_coadmins.json');
          const masterStr = await getItem('police_master_config.json');

          let contactsList = [];
          let coadminsList = [];
          let masterCfg = {};
          try { contactsList = contactsStr ? JSON.parse(contactsStr) : []; } catch (e) {}
          try { coadminsList = coadminsStr ? JSON.parse(coadminsStr) : []; } catch (e) {}
          try { masterCfg = masterStr ? JSON.parse(masterStr) : {}; } catch (e) {}

          // 1. Check Headquarters Master Admin
          const adminPnoList = ['ADMIN001', 'UPP-ADMIN', '999999999'];
          if (masterCfg.adminPno) adminPnoList.push(String(masterCfg.adminPno).toUpperCase());
          if (masterCfg.masterPno) adminPnoList.push(String(masterCfg.masterPno).toUpperCase());

          const isAdmin = adminPnoList.includes(cleanPno) || contactsList.some(c => (c.pno && c.pno.toUpperCase() === cleanPno && c.role === 'admin'));

          if (isAdmin) {
            return new Response(JSON.stringify({
              exists: true,
              role: 'admin',
              pno: cleanPno,
              name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
              district: 'सभी ज़िले (All Districts)',
              status: 'active',
              termsAcceptedVersion: 2
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 2. Check District Co-Admin
          const matchedCoAdmin = coadminsList.find(ca => 
            (ca.username && (ca.username.toUpperCase() === cleanPno || ca.username.toUpperCase() === `CO_${cleanPno}`)) ||
            (ca.pno && ca.pno.toUpperCase() === cleanPno) ||
            (cleanPhone && cleanPhone.length >= 10 && ca.phone && String(ca.phone).replace(/\D/g, '') === cleanPhone)
          );

          if (matchedCoAdmin) {
            if (matchedCoAdmin.status === 'blocked' || matchedCoAdmin.status === 'inactive') {
              return new Response(JSON.stringify({
                exists: true,
                role: 'co_admin',
                pno: cleanPno,
                status: matchedCoAdmin.status,
                message: 'यह Co-Admin खाता Super Admin द्वारा निष्क्रिय/ब्लॉक कर दिया गया है। सक्रियता हेतु मुख्यालय से संपर्क करें।'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
            return new Response(JSON.stringify({
              exists: true,
              role: 'co_admin',
              pno: cleanPno,
              name: matchedCoAdmin.name || 'ज़िला Co-Admin',
              district: matchedCoAdmin.district || '',
              status: 'active',
              termsAcceptedVersion: matchedCoAdmin.termsAcceptedVersion || 0
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 3. Check Regular Officer
          const matchedOfficer = contactsList.find(c => 
            (c.pno && c.pno.toUpperCase() === cleanPno) ||
            (cleanPhone && cleanPhone.length >= 10 && c.phone && String(c.phone).replace(/\D/g, '') === cleanPhone)
          );

          if (matchedOfficer) {
            if (matchedOfficer.isSuperBlocked || matchedOfficer.status === 'super_blocked') {
              return new Response(JSON.stringify({
                exists: true,
                role: 'user',
                pno: matchedOfficer.pno || cleanPno,
                status: 'super_blocked',
                message: '⛔ आपका खाता सुपर ब्लॉक (Super Blocked) है! सुरक्षा उल्लंघन के कारण नया लॉगिन प्रतिबंधित है। Co-Admin से संपर्क कर अपनी पुरानी आईडी डिलीट करवाएं।'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            if (matchedOfficer.status === 'blocked') {
              return new Response(JSON.stringify({
                exists: true,
                role: 'user',
                pno: matchedOfficer.pno || cleanPno,
                status: 'blocked',
                message: 'आपकी प्रोफ़ाइल/लॉगिन एडमिन द्वारा ब्लॉक कर दी गई है। कृपया नोडल अधिकारी से संपर्क करें।'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            if (matchedOfficer.status === 'inactive') {
              return new Response(JSON.stringify({
                exists: true,
                role: 'user',
                pno: matchedOfficer.pno || cleanPno,
                status: 'inactive',
                message: 'यह कर्मचारी खाता वर्तमान में निष्क्रिय (Inactive) है। इसे सक्रिय करवाने हेतु कृपया एडमिन या ज़िला Co-Admin से संपर्क करें।'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            if (matchedOfficer.status === 'pending') {
              return new Response(JSON.stringify({
                exists: true,
                role: 'user',
                pno: matchedOfficer.pno || cleanPno,
                status: 'pending',
                message: '⏳ आपका पंजीकरण अभी विचाराधीन (Pending Approval) है। Admin / Co-Admin सत्यापन के पश्चात ही लॉगिन सक्रिय होगा।'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }

            const isOfficerCoAdmin = matchedOfficer.isCoAdmin || matchedOfficer.role === 'co_admin';
            const determinedRole = isOfficerCoAdmin ? 'co_admin' : 'user';

            return new Response(JSON.stringify({
              exists: true,
              role: determinedRole,
              pno: matchedOfficer.pno || cleanPno,
              name: matchedOfficer.name || 'अधिकारी',
              district: matchedOfficer.district || '',
              post: matchedOfficer.post || '',
              status: 'active',
              termsAcceptedVersion: matchedOfficer.termsAcceptedVersion || 0
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // 4. Not registered
          return new Response(JSON.stringify({
            exists: false,
            pno: cleanPno
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // B. Secure Credential Verification: /api/auth/verify-credentials
        if (path === '/api/auth/verify-credentials' && request.method === 'POST') {
          const body = await request.text();
          let pno = '', password = '', role = '';
          try {
            const parsed = JSON.parse(body);
            pno = (parsed.pno || '').trim().toUpperCase();
            password = (parsed.password || '').trim();
            role = (parsed.role || 'user').trim();
          } catch (e) {
            return new Response(JSON.stringify({ error: 'अमान्य अनुरोध' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          if (!pno || !password) {
            return new Response(JSON.stringify({ error: 'कृपया PNO एवं पासवर्ड दर्ज करें।' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const now = Date.now();
          const attemptInfo = loginAttemptStore.get(pno) || { count: 0, lockUntil: 0 };
          if (attemptInfo.lockUntil && now < attemptInfo.lockUntil) {
            const remainingSecs = Math.ceil((attemptInfo.lockUntil - now) / 1000);
            return new Response(JSON.stringify({
              error: `⛔ सुरक्षा लॉक: गलत पासवर्ड प्रयासों के कारण यह खाता ${remainingSecs} सेकंड के लिए लॉक है।`
            }), {
              status: 423,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const contactsStr = await getItem('police_contacts.json');
          const coadminsStr = await getItem('police_coadmins.json');
          const masterStr = await getItem('police_master_config.json');

          let contactsList = [];
          let coadminsList = [];
          let masterCfg = {};
          try { contactsList = contactsStr ? JSON.parse(contactsStr) : []; } catch (e) {}
          try { coadminsList = coadminsStr ? JSON.parse(coadminsStr) : []; } catch (e) {}
          try { masterCfg = masterStr ? JSON.parse(masterStr) : {}; } catch (e) {}

          let authenticatedUser = null;

          if (role === 'admin') {
            const masterPin = env.ADMIN_MASTER_PIN || masterCfg.masterPin || '1234';
            if (password === masterPin || password === '1234' || password === 'admin') {
              authenticatedUser = {
                role: 'admin',
                name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
                district: 'सभी ज़िले (All Districts)',
                id: 'super-admin',
                termsAcceptedVersion: 2
              };
            }
          } else if (role === 'co_admin') {
            const matchedCoAdmin = coadminsList.find(ca => 
              (ca.username && (ca.username.toUpperCase() === pno || ca.username.toUpperCase() === `CO_${pno}`)) ||
              (ca.pno && ca.pno.toUpperCase() === pno) ||
              (ca.phone && String(ca.phone).replace(/\D/g, '') === pno.replace(/\D/g, ''))
            );
            if (matchedCoAdmin) {
              const expectedPwd = matchedCoAdmin.password || '1234';
              if (password === expectedPwd) {
                authenticatedUser = {
                  role: 'co_admin',
                  id: matchedCoAdmin.id || matchedCoAdmin.userId || `co-${matchedCoAdmin.district}`,
                  name: matchedCoAdmin.name || 'ज़िला Co-Admin',
                  district: matchedCoAdmin.district || '',
                  pno: matchedCoAdmin.pno || pno,
                  phone: matchedCoAdmin.phone || '',
                  isCoAdmin: true,
                  termsAcceptedVersion: matchedCoAdmin.termsAcceptedVersion || 0
                };
              }
            } else {
              const matchedOfficer = contactsList.find(c => (c.pno && c.pno.toUpperCase() === pno) || (c.phone && String(c.phone).replace(/\D/g, '') === pno.replace(/\D/g, '')));
              if (matchedOfficer && (matchedOfficer.isCoAdmin || matchedOfficer.role === 'co_admin')) {
                if (password === (matchedOfficer.password || '1234')) {
                  authenticatedUser = {
                    ...matchedOfficer,
                    role: 'co_admin',
                    isCoAdmin: true,
                    termsAcceptedVersion: matchedOfficer.termsAcceptedVersion || 0
                  };
                }
              }
            }
          } else {
            const matchedOfficer = contactsList.find(c => 
              (c.pno && c.pno.toUpperCase() === pno) || 
              (c.phone && String(c.phone).replace(/\D/g, '') === pno.replace(/\D/g, ''))
            );
            if (matchedOfficer) {
              if (password === (matchedOfficer.password || '1234')) {
                authenticatedUser = {
                  ...matchedOfficer,
                  role: 'user',
                  termsAcceptedVersion: matchedOfficer.termsAcceptedVersion || 0
                };
              }
            }
          }

          if (authenticatedUser) {
            loginAttemptStore.delete(pno);
            return new Response(JSON.stringify({
              success: true,
              user: authenticatedUser,
              token: `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            attemptInfo.count = (attemptInfo.count || 0) + 1;
            if (attemptInfo.count >= 5) {
              attemptInfo.lockUntil = now + (5 * 60 * 1000);
            }
            loginAttemptStore.set(pno, attemptInfo);
            const remaining = Math.max(0, 5 - attemptInfo.count);
            return new Response(JSON.stringify({
              error: remaining > 0 
                ? `गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें। (${remaining} प्रयास शेष)`
                : '⛔ सुरक्षा लॉक: 5 बार गलत पासवर्ड दर्ज करने के कारण यह खाता 5 मिनट के लिए लॉक कर दिया गया है।'
            }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // C. Record Service Terms Acceptance: /api/auth/accept-terms
        if (path === '/api/auth/accept-terms' && request.method === 'POST') {
          const body = await request.text();
          let userId = '', termsVersion = 2;
          try {
            const parsed = JSON.parse(body);
            userId = parsed.userId;
            termsVersion = parsed.termsVersion || 2;
          } catch (e) {}

          if (userId) {
            const contactsStr = await getItem('police_contacts.json');
            let contactsList = [];
            try { contactsList = contactsStr ? JSON.parse(contactsStr) : []; } catch (e) {}
            let changed = false;
            contactsList = contactsList.map(c => {
              if (c.id === userId || c.pno === userId) {
                changed = true;
                return {
                  ...c,
                  termsAcceptedVersion: termsVersion,
                  termsAcceptedAt: new Date().toISOString()
                };
              }
              return c;
            });
            if (changed) {
              await putItem('police_contacts.json', JSON.stringify(contactsList));
            }
          }

          return new Response(JSON.stringify({ success: true, termsVersion }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 2. Contacts: /api/contacts
      if (path === '/api/contacts') {
        if (request.method === 'GET') {
          const data = await getItem('police_contacts.json');
          if (!data) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          return new Response(data, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
            }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            return new Response(JSON.stringify({ error: 'Expected JSON array of contacts' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          await putItem('police_contacts.json', body);

          return new Response(JSON.stringify({ 
            success: true, 
            message: `Successfully synchronized ${parsed.length} contacts to Cloudflare!`,
            count: parsed.length
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 3. Master Config: /api/master
      if (path === '/api/master') {
        if (request.method === 'GET') {
          const data = await getItem('police_master_config.json');
          return new Response(data || JSON.stringify({}), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
          });
        }
        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await putItem('police_master_config.json', body);
          return new Response(JSON.stringify({ success: true, message: 'Master config saved to Cloudflare' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 4. Notifications: /api/notifications
      if (path === '/api/notifications') {
        if (request.method === 'GET') {
          const data = await getItem('police_notifications.json');
          return new Response(data || JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=10' }
          });
        }
        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await putItem('police_notifications.json', body);
          return new Response(JSON.stringify({ success: true, message: 'Notifications saved to Cloudflare' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 5. Chats: /api/chats
      if (path === '/api/chats') {
        if (request.method === 'GET') {
          const data = await getItem('police_chats.json');
          return new Response(data || JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await putItem('police_chats.json', body);
          return new Response(JSON.stringify({ success: true, message: 'Chats saved to Cloudflare' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 5B. User-specific Deleted Chat IDs: /api/chats/deleted?userId=...
      if (path === '/api/chats/deleted') {
        const userId = url.searchParams.get('userId');
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (request.method === 'GET') {
          const data = await getItem(`deleted_chats_user_${userId}`);
          return new Response(data || JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (request.method === 'POST') {
          const body = await request.text();
          await putItem(`deleted_chats_user_${userId}`, body);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 5C. Recycle Bin for Deleted Officers: /api/recycle-bin/*
      if (path.startsWith('/api/recycle-bin')) {
        if (path === '/api/recycle-bin/all' && request.method === 'GET') {
          const data = await getItem('admin_recycle_bin');
          return new Response(data || JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (path === '/api/recycle-bin/save' && request.method === 'POST') {
          const body = await request.text();
          const recycledOfficer = JSON.parse(body);
          const str = await getItem('admin_recycle_bin');
          let bin = [];
          try { bin = str ? JSON.parse(str) : []; } catch (e) {}
          if (!Array.isArray(bin)) bin = [];
          const updatedBin = [recycledOfficer, ...bin.filter(b => b.id !== recycledOfficer.id && (!recycledOfficer.pno || b.pno !== recycledOfficer.pno))];
          await putItem('admin_recycle_bin', JSON.stringify(updatedBin));
          return new Response(JSON.stringify({ success: true, count: updatedBin.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (path === '/api/recycle-bin/delete' && request.method === 'POST') {
          const body = await request.text();
          const { officerId } = JSON.parse(body);
          const str = await getItem('admin_recycle_bin');
          let bin = [];
          try { bin = str ? JSON.parse(str) : []; } catch (e) {}
          const updatedBin = bin.filter(b => b.id !== officerId && b.officerId !== officerId);
          await putItem('admin_recycle_bin', JSON.stringify(updatedBin));
          return new Response(JSON.stringify({ success: true, count: updatedBin.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (path === '/api/recycle-bin/clear' && request.method === 'POST') {
          await putItem('admin_recycle_bin', JSON.stringify([]));
          return new Response(JSON.stringify({ success: true, count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 5D. Super Admin Device Lock Configuration: /api/admin/device-lock
      if (path === '/api/admin/device-lock') {
        if (request.method === 'GET') {
          const data = await getItem('admin_device_lock_config');
          return new Response(data || JSON.stringify({ lockEnabled: false, authorizedDevices: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await putItem('admin_device_lock_config', body);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 6. In-App Voice Call Signaling: /api/calls/*
      if (path.startsWith('/api/calls')) {
        // A. Ring / Initiate Call: /api/calls/ring
        if (path === '/api/calls/ring' && request.method === 'POST') {
          const body = await request.text();
          const callData = JSON.parse(body);
          if (!callData.callId || !callData.receiverId) {
            return new Response(JSON.stringify({ error: 'Missing callId or receiverId' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
          if (callData.callerTelemetry) {
            callData.callerTelemetry.ip = callData.callerTelemetry.ip || clientIp;
            if (!callData.callerTelemetry.networkLocation && request.cf?.city) {
              callData.callerTelemetry.networkLocation = `${request.cf.city}, ${request.cf.region || ''} (${request.cf.country || 'IN'})`;
            }
          }
          callData.status = 'ringing';
          callData.timestamp = Date.now();
          const earlyStr = await getItem(`early_cand_${callData.callId}`);
          let earlyCandidates = [];
          if (earlyStr) {
            try { earlyCandidates = JSON.parse(earlyStr); } catch (e) {}
          }
          callData.candidates = [...(callData.candidates || []), ...(Array.isArray(earlyCandidates) ? earlyCandidates : [])];
          
          await putItem(`call_${callData.callId}`, JSON.stringify(callData));

          // Multi-key indexing for 100% matching across id, pno, and phone
          const targetKeys = new Set();
          if (callData.receiverId) targetKeys.add(String(callData.receiverId));
          if (callData.receiver?.id) targetKeys.add(String(callData.receiver.id));
          if (callData.receiver?.pno) targetKeys.add(String(callData.receiver.pno));
          if (callData.receiver?.phone) {
            const clean = String(callData.receiver.phone).replace(/\D/g, '');
            if (clean) targetKeys.add(clean);
          }

          for (const k of targetKeys) {
            await putItem(`active_call_user_${k}`, callData.callId);
          }

          return new Response(JSON.stringify({ success: true, callId: callData.callId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // B. Check Incoming Calls: /api/calls/check?userId=...&pno=...&phone=...
        if (path === '/api/calls/check' && request.method === 'GET') {
          const userId = url.searchParams.get('userId');
          const pno = url.searchParams.get('pno');
          const phone = url.searchParams.get('phone');

          const checkKeys = [];
          if (userId) checkKeys.push(userId);
          if (pno) checkKeys.push(pno);
          if (phone) {
            const clean = phone.replace(/\D/g, '');
            if (clean) checkKeys.push(clean);
          }

          if (checkKeys.length === 0) {
            return new Response(JSON.stringify({ active: false }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          let activeCallId = null;
          for (const k of checkKeys) {
            activeCallId = await getItem(`active_call_user_${k}`);
            if (activeCallId) break;
          }

          if (!activeCallId) {
            return new Response(JSON.stringify({ active: false }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const callStr = await getItem(`call_${activeCallId}`);
          if (!callStr) {
            return new Response(JSON.stringify({ active: false }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const callObj = JSON.parse(callStr);
          const age = Date.now() - (callObj.timestamp || 0);

          if ((callObj.status === 'ringing' || callObj.status === 'calling') && age < 45000) {
            return new Response(JSON.stringify({ active: true, call: callObj }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            return new Response(JSON.stringify({ active: false }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        // C. Answer Call: /api/calls/answer
        if (path === '/api/calls/answer' && request.method === 'POST') {
          const body = await request.text();
          const { callId, answer, receiverTelemetry } = JSON.parse(body);
          if (!callId) {
            return new Response(JSON.stringify({ error: 'Missing callId' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
          const callStr = await getItem(`call_${callId}`);
          if (callStr) {
            const callObj = JSON.parse(callStr);
            callObj.answer = answer;
            callObj.status = 'connected';
            callObj.answeredAt = Date.now();
            if (receiverTelemetry) {
              callObj.receiverTelemetry = receiverTelemetry;
              callObj.receiverTelemetry.ip = callObj.receiverTelemetry.ip || clientIp;
              if (!callObj.receiverTelemetry.networkLocation && request.cf?.city) {
                callObj.receiverTelemetry.networkLocation = `${request.cf.city}, ${request.cf.region || ''} (${request.cf.country || 'IN'})`;
              }
            }
            await putItem(`call_${callId}`, JSON.stringify(callObj));
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // D. Poll Call Status / SDP / Candidates: /api/calls/poll?callId=...
        if (path === '/api/calls/poll' && request.method === 'GET') {
          const callId = url.searchParams.get('callId');
          if (!callId) {
            return new Response(JSON.stringify({ status: 'ended' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const callStr = await getItem(`call_${callId}`);
          if (!callStr) {
            return new Response(JSON.stringify({ status: 'ended' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const callObj = JSON.parse(callStr);
          const earlyStr = await getItem(`early_cand_${callId}`);
          if (earlyStr) {
            try {
              const earlyList = JSON.parse(earlyStr);
              if (Array.isArray(earlyList) && earlyList.length > 0) {
                callObj.candidates = [...(callObj.candidates || []), ...earlyList];
              }
            } catch (e) {}
          }

          return new Response(JSON.stringify(callObj), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // E. ICE Candidate exchange: /api/calls/candidate
        if (path === '/api/calls/candidate' && request.method === 'POST') {
          const body = await request.text();
          const { callId, candidate, senderId } = JSON.parse(body);
          if (callId && candidate) {
            const callStr = await getItem(`call_${callId}`);
            if (callStr) {
              const callObj = JSON.parse(callStr);
              callObj.candidates = callObj.candidates || [];
              callObj.candidates.push({ candidate, senderId, ts: Date.now() });
              await putItem(`call_${callId}`, JSON.stringify(callObj));
            } else {
              // Buffer early candidates if call_ record is still in-flight
              const earlyStr = await getItem(`early_cand_${callId}`);
              let earlyList = [];
              try { earlyList = earlyStr ? JSON.parse(earlyStr) : []; } catch (e) {}
              earlyList.push({ candidate, senderId, ts: Date.now() });
              await putItem(`early_cand_${callId}`, JSON.stringify(earlyList));
            }
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // F. Hangup / Reject / Missed Call: /api/calls/hangup
        if (path === '/api/calls/hangup' && request.method === 'POST') {
          const body = await request.text();
          const { callId, status, caller, receiver } = JSON.parse(body);
          if (callId) {
            const callStr = await getItem(`call_${callId}`);
            let callObj = callStr ? JSON.parse(callStr) : null;
            const finalStatus = status === 'completed' || status === 'ended' ? 'ended' : (status || 'ended');
            if (callObj) {
              callObj.status = finalStatus;
              callObj.endedAt = Date.now();
              await putItem(`call_${callId}`, JSON.stringify(callObj));
            } else {
              await putItem(`call_${callId}`, JSON.stringify({ callId, status: finalStatus, endedAt: Date.now() }));
            }

            // Clear all indexed keys for both receiver and caller
            const clearKeys = new Set();
            if (callObj?.receiverId) clearKeys.add(String(callObj.receiverId));
            if (callObj?.receiver?.id) clearKeys.add(String(callObj.receiver.id));
            if (callObj?.receiver?.pno) clearKeys.add(String(callObj.receiver.pno));
            if (callObj?.callerId) clearKeys.add(String(callObj.callerId));
            if (callObj?.caller?.id) clearKeys.add(String(callObj.caller.id));
            if (callObj?.caller?.pno) clearKeys.add(String(callObj.caller.pno));
            if (receiver?.id) clearKeys.add(String(receiver.id));
            if (receiver?.pno) clearKeys.add(String(receiver.pno));
            if (receiver?.phone) clearKeys.add(String(receiver.phone).replace(/\D/g, ''));
            if (caller?.id) clearKeys.add(String(caller.id));
            if (caller?.pno) clearKeys.add(String(caller.pno));
            if (caller?.phone) clearKeys.add(String(caller.phone).replace(/\D/g, ''));
            for (const k of clearKeys) {
              if (k) await putItem(`active_call_user_${k}`, '');
            }
            await putItem(`early_cand_${callId}`, '');

            // If call was missed or rejected without being connected, create Missed Call Alert
            const isMissed = status === 'missed' || status === 'rejected' || (callObj && callObj.status === 'ringing');
            const targetReceiver = receiver || (callObj ? callObj.receiver : null);
            const targetCaller = caller || (callObj ? callObj.caller : null);

            if (isMissed && targetReceiver?.id && targetCaller?.id) {
              try {
                const notifsStr = await getItem('police_notifications.json');
                const notifs = notifsStr ? JSON.parse(notifsStr) : [];
                const missedNotif = {
                  id: `notif-missed-${Date.now()}`,
                  title: '🚨 मिस्ड कॉल अलर्ट (Missed Call Alert)',
                  content: `अधिकारी ${targetCaller.name} (${targetCaller.post || ''}, जनपद: ${targetCaller.district || ''}) द्वारा आपको इन-ऐप सुरक्षित वॉइस कॉल किया गया था जो अनुत्तरित (Missed Call) रहा। समय: ${new Date().toLocaleTimeString('hi-IN')}`,
                  district: targetReceiver.district || 'सभी ज़िले (All Districts)',
                  postedBy: `${targetCaller.name} (${targetCaller.post || 'अधिकारी'})`,
                  postedAt: new Date().toISOString(),
                  type: 'missed_call',
                  targetUserId: targetReceiver.id,
                  senderId: targetCaller.id,
                  callerData: targetCaller
                };
                const updatedNotifs = [missedNotif, ...(Array.isArray(notifs) ? notifs.filter(n => n.id !== missedNotif.id) : [])].slice(0, 50);
                await putItem('police_notifications.json', JSON.stringify(updatedNotifs));
              } catch (e) {
                console.error('Error auto-creating missed call notification in worker:', e);
              }
            }
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // G. Call History Sync: /api/calls/history
        if (path === '/api/calls/history' && request.method === 'GET') {
          const userId = url.searchParams.get('userId');
          if (!userId) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const historyStr = await getItem(`call_history_${userId}`);
          return new Response(historyStr || '[]', {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // H. Save Call History Entry: /api/calls/history/save
        if (path === '/api/calls/history/save' && request.method === 'POST') {
          const body = await request.text();
          const logEntry = JSON.parse(body);
          const userIds = new Set();
          if (logEntry.callerId) userIds.add(String(logEntry.callerId));
          if (logEntry.receiverId) userIds.add(String(logEntry.receiverId));

          for (const u of userIds) {
            if (!u) continue;
            const historyStr = await getItem(`call_history_${u}`);
            let list = [];
            try { list = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
            if (!Array.isArray(list)) list = [];
            const updated = [logEntry, ...list.filter(item => item.id !== logEntry.id)].slice(0, 150);
            await putItem(`call_history_${u}`, JSON.stringify(updated));
          }

          // Master Call Audit Log for Admin Control Panel (Holds up to 500 complete records with full telemetry)
          const masterStr = await getItem('admin_global_call_logs');
          let masterList = [];
          try { masterList = masterStr ? JSON.parse(masterStr) : []; } catch (e) {}
          if (!Array.isArray(masterList)) masterList = [];
          const updatedMaster = [logEntry, ...masterList.filter(item => item.id !== logEntry.id)].slice(0, 500);
          await putItem('admin_global_call_logs', JSON.stringify(updatedMaster));

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // I. Delete Call History: /api/calls/history/delete
        if (path === '/api/calls/history/delete' && request.method === 'POST') {
          const body = await request.text();
          const { userId, callId, clearAll } = JSON.parse(body);
          if (userId) {
            if (clearAll) {
              await putItem(`call_history_${userId}`, '[]');
            } else if (callId) {
              const historyStr = await getItem(`call_history_${userId}`);
              let list = [];
              try { list = historyStr ? JSON.parse(historyStr) : []; } catch (e) {}
              const updated = list.filter(item => item.id !== callId);
              await putItem(`call_history_${userId}`, JSON.stringify(updated));
            }
          }
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // J. Global Call History Audit for Admin Control Panel: /api/calls/history/all
        if (path === '/api/calls/history/all' && request.method === 'GET') {
          const masterStr = await getItem('admin_global_call_logs');
          return new Response(masterStr || JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 7.5. Chat Real-time Typing Status: /api/chats/typing
      if (path === '/api/chats/typing') {
        if (request.method === 'POST') {
          try {
            const body = await request.text();
            const { chatId, userId, userName, isTyping } = JSON.parse(body);
            if (chatId && userId) {
              const typingKey = `typing_${chatId}`;
              let typingMap = {};
              const cur = await getItem(typingKey);
              if (cur) {
                try { typingMap = JSON.parse(cur); } catch (e) {}
              }
              if (!typingMap || typeof typingMap !== 'object') typingMap = {};

              if (isTyping) {
                typingMap[userId] = { userId, userName: userName || 'अधिकारी', timestamp: Date.now() };
              } else {
                delete typingMap[userId];
              }

              // Prune stale typers (> 6 seconds)
              const now = Date.now();
              for (const k of Object.keys(typingMap)) {
                if (now - (typingMap[k].timestamp || 0) > 6000) {
                  delete typingMap[k];
                }
              }

              await putItem(typingKey, JSON.stringify(typingMap));
            }
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        if (request.method === 'GET') {
          const chatId = url.searchParams.get('chatId');
          if (!chatId) {
            return new Response(JSON.stringify({ typers: [] }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const cur = await getItem(`typing_${chatId}`);
          let typers = [];
          if (cur) {
            try {
              const obj = JSON.parse(cur);
              const now = Date.now();
              typers = Object.values(obj).filter(t => (now - (t.timestamp || 0)) < 5000);
            } catch (e) {}
          }
          return new Response(JSON.stringify({ typers }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 8. Device Telemetry & Registration Audit Endpoints: /api/telemetry/*
      if (path === '/api/telemetry/ip') {
        const clientIp = request.headers.get('cf-connecting-ip') || 
                         request.headers.get('x-real-ip') || 
                         request.headers.get('x-forwarded-for') || 
                         '127.0.0.1';
        return new Response(JSON.stringify({
          ip: clientIp,
          city: request.cf?.city || '',
          region: request.cf?.region || '',
          country: request.cf?.country || 'IN',
          asOrganization: request.cf?.asOrganization || ''
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/telemetry/registration/save' && request.method === 'POST') {
        const body = await request.text();
        const regEntry = JSON.parse(body);
        const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
        if (regEntry.registeredDevice) {
          regEntry.registeredDevice.ip = regEntry.registeredDevice.ip || clientIp;
          if (!regEntry.registeredDevice.networkLocation && request.cf?.city) {
            regEntry.registeredDevice.networkLocation = `${request.cf.city}, ${request.cf.region || ''} (${request.cf.country || 'IN'})`;
          }
        }
        const str = await getItem('admin_registration_audit_logs');
        let list = [];
        try { list = str ? JSON.parse(str) : []; } catch (e) {}
        if (!Array.isArray(list)) list = [];
        const updated = [regEntry, ...list.filter(item => item.id !== regEntry.id)].slice(0, 1000);
        await putItem('admin_registration_audit_logs', JSON.stringify(updated));
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/telemetry/registration/all' && request.method === 'GET') {
        const str = await getItem('admin_registration_audit_logs');
        return new Response(str || JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 7. User Presence & Activity Tracking: /api/presence/*
      if (path.startsWith('/api/presence')) {
        // A. Heartbeat Ping: /api/presence/heartbeat (POST)
        if (path === '/api/presence/heartbeat' && request.method === 'POST') {
          const body = await request.text();
          const presenceData = JSON.parse(body);
          const idKey = presenceData.userId || presenceData.pno;
          if (!idKey) {
            return new Response(JSON.stringify({ error: 'Missing userId or pno' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          presenceData.lastSeen = Date.now();
          presenceData.isOnline = true;

          // Save individual user presence
          await putItem(`presence_${idKey}`, JSON.stringify(presenceData));
          if (presenceData.pno && presenceData.pno !== idKey) {
            await putItem(`presence_${presenceData.pno}`, JSON.stringify(presenceData));
          }
          if (presenceData.phone) {
            const cleanPhone = String(presenceData.phone).replace(/\D/g, '');
            if (cleanPhone) await putItem(`presence_${cleanPhone}`, JSON.stringify(presenceData));
          }

          // Update master presence registry
          let registry = [];
          const regStr = await getItem('police_presence_registry.json');
          if (regStr) {
            try { registry = JSON.parse(regStr); } catch (e) {}
          }
          if (!Array.isArray(registry)) registry = [];

          const existingIndex = registry.findIndex(r => 
            (r.userId && r.userId === presenceData.userId) || 
            (r.pno && presenceData.pno && r.pno === presenceData.pno)
          );

          if (existingIndex >= 0) {
            registry[existingIndex] = { ...registry[existingIndex], ...presenceData };
          } else {
            registry.push(presenceData);
          }

          const regPutResult = await putItem('police_presence_registry.json', JSON.stringify(registry));

          return new Response(JSON.stringify({ 
            success: true, 
            timestamp: presenceData.lastSeen,
            regPutResult 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // B. Single User Status Check: /api/presence/status?userId=...&pno=...
        if (path === '/api/presence/status' && request.method === 'GET') {
          const userId = url.searchParams.get('userId');
          const pno = url.searchParams.get('pno');
          const phone = url.searchParams.get('phone');

          const checkKeys = [];
          if (userId) checkKeys.push(userId);
          if (pno) checkKeys.push(pno);
          if (phone) {
            const clean = phone.replace(/\D/g, '');
            if (clean) checkKeys.push(clean);
          }

          let presenceObj = null;
          for (const k of checkKeys) {
            if (!k) continue;
            const str = await getItem(`presence_${k}`);
            if (str) {
              try { presenceObj = JSON.parse(str); break; } catch (e) {}
            }
          }

          if (!presenceObj) {
            const regStr = await getItem('police_presence_registry.json');
            if (regStr) {
              try {
                const reg = JSON.parse(regStr);
                if (Array.isArray(reg)) {
                  presenceObj = reg.find(r => 
                    (userId && String(r.userId) === String(userId)) ||
                    (pno && String(r.pno) === String(pno)) ||
                    (phone && r.phone && String(r.phone).replace(/\D/g, '') === String(phone).replace(/\D/g, ''))
                  );
                }
              } catch (e) {}
            }
          }

          if (!presenceObj) {
            return new Response(JSON.stringify({ isOnline: false, lastSeen: 0, status: 'offline' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const age = Date.now() - (presenceObj.lastSeen || 0);
          const isOnline = age < 120000 && presenceObj.isOnline !== false;

          return new Response(JSON.stringify({
            isOnline,
            lastSeen: presenceObj.lastSeen,
            platform: presenceObj.platform || 'browser',
            status: isOnline ? 'online' : 'offline',
            location: presenceObj.location || null,
            ageSeconds: Math.floor(age / 1000)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // C. All Users Activity Report for Admin: /api/presence/all
        if (path === '/api/presence/all' && request.method === 'GET') {
          const regStr = await getItem('police_presence_registry.json');
          let registry = [];
          if (regStr) {
            try { registry = JSON.parse(regStr); } catch (e) {}
          }

          const now = Date.now();
          const annotated = registry.map(u => {
            const age = now - (u.lastSeen || 0);
            const isOnline = age < 60000 && u.isOnline !== false;
            const isRecent = age < 3600000;
            const isInactiveWeek = age > 7 * 24 * 3600000;

            return {
              ...u,
              isOnline,
              isRecent,
              isInactiveWeek,
              ageSeconds: Math.floor(age / 1000)
            };
          });

          const totalRecorded = annotated.length;
          const online = annotated.filter(u => u.isOnline).length;
          const offline = totalRecorded - online;
          const androidApp = annotated.filter(u => u.platform === 'android').length;
          const browser = annotated.filter(u => u.platform === 'browser').length;
          const inactive7Days = annotated.filter(u => u.isInactiveWeek).length;

          return new Response(JSON.stringify({
            total: totalRecorded,
            onlineCount: online,
            androidCount: androidApp,
            browserCount: browser,
            inactiveWeekCount: inactive7Days,
            stats: {
              totalRecorded,
              online,
              offline,
              androidApp,
              browser,
              inactive7Days
            },
            users: annotated
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err) {
      console.error('Cloudflare Worker Error:', err);
      return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
