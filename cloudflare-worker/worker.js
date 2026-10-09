/**
 * UP Police Directory - Cloudflare Worker + R2 API
 * 
 * Provides ultra-fast, zero-egress, high-concurrency REST endpoints
 * backed by Cloudflare R2 Object Storage.
 * Supports 50,000+ simultaneous officers with zero quota bottleneck.
 */

export default {
  async fetch(request, env, ctx) {
    // Standard CORS Headers for Web & Mobile Capacitor
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

    // R2 Bucket Binding (from wrangler.toml)
    const bucket = env.POLICE_BUCKET || env.BUCKET;
    if (!bucket) {
      return new Response(JSON.stringify({ 
        error: 'R2 Bucket binding missing. Please bind BUCKET in wrangler.toml or Cloudflare dashboard.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Admin API Key validation for Mutation requests
    const adminKey = env.ADMIN_API_KEY || 'police_admin_2026';
    const reqKey = request.headers.get('x-api-key') || url.searchParams.get('key');
    const isWriteMethod = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';

    // Public registration & feedback can write without full admin key, but core sync requires key
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
      // 1. Health check & System Status
      if (path === '/' || path === '/api/status' || path === '/api/health') {
        const contactsObj = await bucket.head('police_contacts.json');
        return new Response(JSON.stringify({
          status: 'ok',
          service: 'UP Police Directory Cloudflare R2 API',
          version: '2.0.0',
          contactsLastModified: contactsObj?.uploaded?.toISOString() || null,
          contactsSize: contactsObj?.size || 0,
          timestamp: new Date().toISOString()
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }

      // 2. Contacts Collection: /api/contacts
      if (path === '/api/contacts') {
        if (request.method === 'GET') {
          const obj = await bucket.get('police_contacts.json');
          if (!obj) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'ETag': obj.httpEtag || `"${obj.size}-${obj.uploaded?.getTime()}"`,
              'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
            }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          // Validate valid JSON array
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            return new Response(JSON.stringify({ error: 'Expected JSON array of contacts' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          await bucket.put('police_contacts.json', body, {
            httpMetadata: { contentType: 'application/json' },
            customMetadata: { count: String(parsed.length), updatedAt: new Date().toISOString() }
          });

          return new Response(JSON.stringify({ 
            success: true, 
            message: `Successfully synchronized ${parsed.length} contacts to Cloudflare R2!`,
            count: parsed.length
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 3. Master Configuration (districts, posts, offices, coAdmins, terms, policies): /api/master
      if (path === '/api/master') {
        if (request.method === 'GET') {
          const obj = await bucket.get('police_master_config.json');
          if (!obj) {
            return new Response(JSON.stringify({}), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json', 
              'Cache-Control': 'public, max-age=60' 
            }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await bucket.put('police_master_config.json', body, {
            httpMetadata: { contentType: 'application/json' }
          });
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Master configuration updated in Cloudflare R2' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 4. Notifications: /api/notifications
      if (path === '/api/notifications') {
        if (request.method === 'GET') {
          const obj = await bucket.get('police_notifications.json');
          if (!obj) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json', 
              'Cache-Control': 'public, max-age=10' 
            }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await bucket.put('police_notifications.json', body, {
            httpMetadata: { contentType: 'application/json' }
          });
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Notifications updated in Cloudflare R2' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 5. Chats: /api/chats
      if (path === '/api/chats') {
        if (request.method === 'GET') {
          const obj = await bucket.get('police_chats.json');
          if (!obj) {
            return new Response(JSON.stringify([]), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          const data = await obj.text();
          return new Response(data, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (request.method === 'POST') {
          const body = await request.text();
          JSON.parse(body);
          await bucket.put('police_chats.json', body, {
            httpMetadata: { contentType: 'application/json' }
          });
          return new Response(JSON.stringify({ 
            success: true, 
            message: 'Chats updated in Cloudflare R2' 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // 6. Generic Files / Attachments / Photos: /api/files/:name
      if (path.startsWith('/api/files/')) {
        const fileName = path.replace('/api/files/', '').replace(/[^a-zA-Z0-9._-]/g, '_');
        if (request.method === 'GET') {
          const fileObj = await bucket.get(`files/${fileName}`);
          if (!fileObj) {
            return new Response('File Not Found', { status: 404, headers: corsHeaders });
          }
          return new Response(fileObj.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': fileObj.httpMetadata?.contentType || 'application/octet-stream',
              'Cache-Control': 'public, max-age=86400'
            }
          });
        }

        if (request.method === 'PUT' || request.method === 'POST') {
          const contentType = request.headers.get('content-type') || 'application/octet-stream';
          await bucket.put(`files/${fileName}`, request.body, {
            httpMetadata: { contentType }
          });
          return new Response(JSON.stringify({ 
            success: true, 
            fileUrl: `/api/files/${fileName}` 
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
