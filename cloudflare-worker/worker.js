/**
 * UP Police Directory - Cloudflare Edge API
 * 
 * Supports both Cloudflare KV and R2 for unlimited 50,000+ officers.
 * Zero-egress cost, high-speed worldwide edge caching.
 */

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

    // Helper: read data from R2 or KV
    const getItem = async (key) => {
      if (env.BUCKET) {
        const obj = await env.BUCKET.get(key);
        return obj ? await obj.text() : null;
      }
      if (env.POLICE_KV) {
        return await env.POLICE_KV.get(key);
      }
      return null;
    };

    // Helper: write data to R2 or KV
    const putItem = async (key, value) => {
      if (env.BUCKET) {
        await env.BUCKET.put(key, value, {
          httpMetadata: { contentType: 'application/json' }
        });
        return true;
      }
      if (env.POLICE_KV) {
        await env.POLICE_KV.put(key, value);
        return true;
      }
      return false;
    };

    // Admin API Key validation
    const adminKey = env.ADMIN_API_KEY || 'police_admin_2026';
    const reqKey = request.headers.get('x-api-key') || url.searchParams.get('key');
    const isWriteMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
    const isPublicWritePath = path === '/api/register' || path === '/api/feedback';

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
