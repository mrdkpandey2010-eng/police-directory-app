/**
 * UP Police Directory - Cloudflare Edge API
 * 
 * Supports both Cloudflare KV and R2 for unlimited 50,000+ officers.
 * Zero-egress cost, high-speed worldwide edge caching.
 */

const memoryStore = new Map();

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
    const isPublicWritePath = path === '/api/register' || path === '/api/feedback' || path.startsWith('/api/calls') || path.startsWith('/api/presence');

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
          callData.status = 'ringing';
          callData.timestamp = Date.now();
          callData.candidates = callData.candidates || [];
          
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
          const { callId, answer } = JSON.parse(body);
          if (!callId) {
            return new Response(JSON.stringify({ error: 'Missing callId' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const callStr = await getItem(`call_${callId}`);
          if (callStr) {
            const callObj = JSON.parse(callStr);
            callObj.answer = answer;
            callObj.status = 'connected';
            callObj.answeredAt = Date.now();
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

          return new Response(callStr, {
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
