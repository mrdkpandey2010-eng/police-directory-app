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

    // Helper: read data from R2, KV, or in-memory fallback
    const getItem = async (key) => {
      if (env.BUCKET) {
        try {
          const obj = await env.BUCKET.get(key);
          if (obj) return await obj.text();
        } catch (e) {}
      }
      if (env.POLICE_KV) {
        try {
          const val = await env.POLICE_KV.get(key);
          if (val !== null && val !== undefined) return val;
        } catch (e) {}
      }
      return memoryStore.get(key) || null;
    };

    // Helper: write data to R2, KV, or in-memory fallback
    const putItem = async (key, value) => {
      memoryStore.set(key, value);
      if (env.BUCKET) {
        try {
          await env.BUCKET.put(key, value, {
            httpMetadata: { contentType: 'application/json' }
          });
          return true;
        } catch (e) {}
      }
      if (env.POLICE_KV) {
        try {
          await env.POLICE_KV.put(key, value);
          return true;
        } catch (e) {
          console.warn(`[KV Notice] ${e.message}. Using edge memory store.`);
        }
      }
      return true;
    };

    // Admin API Key validation
    const adminKey = env.ADMIN_API_KEY || 'police_admin_2026';
    const reqKey = request.headers.get('x-api-key') || url.searchParams.get('key');
    const isWriteMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
    const isPublicWritePath = path === '/api/register' || path === '/api/feedback' || path.startsWith('/api/calls');

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
          await putItem(`active_call_user_${callData.receiverId}`, callData.callId);

          return new Response(JSON.stringify({ success: true, callId: callData.callId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // B. Check Incoming Calls: /api/calls/check?userId=...
        if (path === '/api/calls/check' && request.method === 'GET') {
          const userId = url.searchParams.get('userId');
          if (!userId) {
            return new Response(JSON.stringify({ active: false }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const activeCallId = await getItem(`active_call_user_${userId}`);
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

          if (callObj.status === 'ringing' && age < 40000) {
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
            if (callObj) {
              callObj.status = status || 'ended';
              await putItem(`call_${callId}`, JSON.stringify(callObj));
              if (callObj.receiverId) {
                await putItem(`active_call_user_${callObj.receiverId}`, '');
              }
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
