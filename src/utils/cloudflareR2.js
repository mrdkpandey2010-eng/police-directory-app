/**
 * UP Police Directory - Cloudflare R2 Engine
 * 
 * High-performance, zero-quota-bottleneck Cloud Storage client.
 * Communicates with Cloudflare Worker + R2 Bucket to serve 50,000+ officers.
 */

import { idbEnqueueSync, idbGetSyncQueue, idbClearSyncQueue } from './indexedDB';

const CLOUDFLARE_CONFIG_KEY = 'police_cloudflare_config_v1';

// Default configuration (can be updated via Admin Panel / Cloudflare Setup Modal)
const DEFAULT_CLOUDFLARE_CONFIG = {
  workerUrl: import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'https://police-directory-cloud-api.police-directory-app.workers.dev',
  adminApiKey: import.meta.env.VITE_CLOUDFLARE_API_KEY || 'police_admin_2026',
  bucketName: 'police-directory-bucket'
};

// ---------------- CONFIGURATION MANAGEMENT ----------------

export const getStoredCloudflareConfig = () => {
  try {
    const saved = localStorage.getItem(CLOUDFLARE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.workerUrl) {
        return parsed;
      }
    }
  } catch (err) {}

  if (import.meta.env.VITE_CLOUDFLARE_WORKER_URL) {
    return {
      workerUrl: import.meta.env.VITE_CLOUDFLARE_WORKER_URL,
      adminApiKey: import.meta.env.VITE_CLOUDFLARE_API_KEY || 'police_admin_2026',
      bucketName: 'police-directory-bucket'
    };
  }

  return DEFAULT_CLOUDFLARE_CONFIG;
};

export const isCloudflareConfigured = () => {
  const cfg = getStoredCloudflareConfig();
  return Boolean(cfg && cfg.workerUrl && cfg.workerUrl.trim().length > 0);
};

export const saveCloudflareConfig = async (config) => {
  try {
    localStorage.setItem(CLOUDFLARE_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('Failed to save Cloudflare config:', err);
    return false;
  }
};

export const clearCloudflareConfig = async () => {
  try {
    localStorage.removeItem(CLOUDFLARE_CONFIG_KEY);
    return true;
  } catch (err) {
    return false;
  }
};

// Helper: Normalize Worker Base URL
const getWorkerBaseUrl = () => {
  const cfg = getStoredCloudflareConfig();
  if (!cfg || !cfg.workerUrl) return '';
  return cfg.workerUrl.replace(/\/+$/, '');
};

const getAdminApiKey = () => {
  const cfg = getStoredCloudflareConfig();
  return cfg?.adminApiKey || 'police_admin_2026';
};

// ---------------- HEALTH CHECK / CONNECTION TEST ----------------

export const testCloudflareConnection = async (testUrl = null, testKey = null) => {
  const baseUrl = (testUrl || getWorkerBaseUrl()).replace(/\/+$/, '');
  const apiKey = testKey || getAdminApiKey();

  if (!baseUrl) {
    return { ok: false, message: 'Worker URL दर्ज नहीं किया गया है।' };
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(`${baseUrl}/api/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-api-key': apiKey
      },
      signal: ctrl.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return { 
        ok: true, 
        message: '✅ Cloudflare R2 से सफलतापूर्वक संपर्क स्थापित हो गया!', 
        data 
      };
    } else {
      return { 
        ok: false, 
        message: `Cloudflare सर्वर ने स्थिति ${res.status} लौटाया।` 
      };
    }
  } catch (err) {
    console.warn('Cloudflare connection test warning:', err);
    return { 
      ok: false, 
      message: err.name === 'AbortError' 
        ? 'कनेक्शन टाइमआउट: Cloudflare Worker ने समय पर उत्तर नहीं दिया।' 
        : `कनेक्शन त्रुटि: ${err.message || 'नेटवर्क समस्या'}` 
    };
  }
};

// ---------------- AUDIO CHIME ----------------

export const playNotificationChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone police chime (E5 -> G#5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc.frequency.setValueAtTime(830.61, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {}
};

// ---------------- CONTACTS SYNC (R2) ----------------

export const fetchContactsFromCloudflare = async () => {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return null;

  try {
    const res = await fetch(`${baseUrl}/api/contacts`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Cloudflare R2] Error fetching contacts:', err);
    return null;
  }
};

export const syncAllContactsToCloudflare = async (contacts, onProgress = null) => {
  const baseUrl = getWorkerBaseUrl();
  const apiKey = getAdminApiKey();
  if (!baseUrl || !Array.isArray(contacts)) return false;

  const validContacts = contacts.filter(c => c && c.id && !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
  if (validContacts.length === 0) return true;

  if (onProgress) {
    onProgress({
      chunkIndex: 1,
      totalChunks: 1,
      syncedCount: Math.round(validContacts.length * 0.5),
      totalCount: validContacts.length,
      percent: 50
    });
  }

  try {
    const res = await fetch(`${baseUrl}/api/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(validContacts)
    });

    if (onProgress) {
      onProgress({
        chunkIndex: 1,
        totalChunks: 1,
        syncedCount: validContacts.length,
        totalCount: validContacts.length,
        percent: 100
      });
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    console.log(`[Cloudflare R2] Successfully synchronized ${validContacts.length} contacts to R2`);
    return true;
  } catch (err) {
    console.error('[Cloudflare R2] Error syncing contacts:', err);
    throw err;
  }
};

export const saveCloudflareContact = async (contact) => {
  if (!contact || !contact.id) return false;
  try {
    const current = await fetchContactsFromCloudflare() || [];
    const index = current.findIndex(c => c.id === contact.id);
    const updatedContact = { ...contact, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      current[index] = updatedContact;
    } else {
      current.push(updatedContact);
    }
    return await syncAllContactsToCloudflare(current);
  } catch (err) {
    console.error('[Cloudflare R2] Save contact error:', err);
    return false;
  }
};

export const deleteCloudflareContact = async (contactId) => {
  if (!contactId) return false;
  try {
    const current = await fetchContactsFromCloudflare() || [];
    const filtered = current.filter(c => c.id !== contactId);
    return await syncAllContactsToCloudflare(filtered);
  } catch (err) {
    console.error('[Cloudflare R2] Delete contact error:', err);
    return false;
  }
};

// ---------------- MASTER CONFIG (DISTRICTS, POSTS, OFFICES) ----------------

export const fetchCloudflareMasterConfig = async () => {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return null;
  try {
    const res = await fetch(`${baseUrl}/api/master`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[Cloudflare R2] Fetch master config error:', err);
    return null;
  }
};

export const saveCloudflareMasterConfig = async (config) => {
  const baseUrl = getWorkerBaseUrl();
  const apiKey = getAdminApiKey();
  if (!baseUrl || !config) return false;

  try {
    // Merge with current master config
    const current = (await fetchCloudflareMasterConfig()) || {};
    const merged = { ...current, ...config, updatedAt: new Date().toISOString() };

    const res = await fetch(`${baseUrl}/api/master`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(merged)
    });
    return res.ok;
  } catch (err) {
    console.error('[Cloudflare R2] Error saving master config:', err);
    return false;
  }
};

export const initCloudflareMasterConfigIfEmpty = async (defaultConfig) => {
  try {
    const existing = await fetchCloudflareMasterConfig();
    if (!existing || Object.keys(existing).length === 0) {
      return await saveCloudflareMasterConfig(defaultConfig);
    }
    return true;
  } catch (err) {
    return false;
  }
};

export const saveCloudflareDistricts = async (districts) => {
  return saveCloudflareMasterConfig({ districts });
};

export const saveCloudflarePosts = async (posts) => {
  return saveCloudflareMasterConfig({ posts });
};

export const saveCloudflareOffices = async (offices) => {
  return saveCloudflareMasterConfig({ offices });
};

export const saveCloudflareCoAdmins = async (coAdmins) => {
  return saveCloudflareMasterConfig({ coAdmins });
};

export const saveCloudflareTerms = async (terms) => {
  return saveCloudflareMasterConfig({ terms });
};

export const saveCloudflarePolicies = async (policies) => {
  return saveCloudflareMasterConfig({ policies });
};

// ---------------- NOTIFICATIONS ----------------

export const fetchCloudflareNotifications = async () => {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return [];
  try {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

export const addCloudflareNotification = async (notif) => {
  const baseUrl = getWorkerBaseUrl();
  const apiKey = getAdminApiKey();
  if (!baseUrl || !notif) return false;

  try {
    const current = await fetchCloudflareNotifications();
    const updated = [notif, ...current.filter(n => n.id !== notif.id)];

    const res = await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(updated)
    });
    return res.ok;
  } catch (err) {
    console.error('[Cloudflare R2] Add notification error:', err);
    return false;
  }
};

// ---------------- CHATS ----------------

export const fetchCloudflareChats = async () => {
  const baseUrl = getWorkerBaseUrl();
  if (!baseUrl) return [];
  try {
    const res = await fetch(`${baseUrl}/api/chats`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    return [];
  }
};

export const syncAllChatsToCloudflare = async (chats) => {
  const baseUrl = getWorkerBaseUrl();
  const apiKey = getAdminApiKey();
  if (!baseUrl || !Array.isArray(chats)) return false;

  try {
    const res = await fetch(`${baseUrl}/api/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(chats)
    });
    return res.ok;
  } catch (err) {
    return false;
  }
};

export const saveCloudflareChat = async (chatObj) => {
  if (!chatObj || !chatObj.id) return false;
  try {
    const current = await fetchCloudflareChats();
    const idx = current.findIndex(c => c.id === chatObj.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...chatObj };
    } else {
      current.push(chatObj);
    }
    return await syncAllChatsToCloudflare(current);
  } catch (err) {
    return false;
  }
};

export const sendCloudflareMessage = async (chatId, messageObj) => {
  try {
    const current = await fetchCloudflareChats();
    const chat = current.find(c => c.id === chatId);
    if (chat) {
      chat.messages = [...(chat.messages || []), messageObj];
      chat.lastMessage = messageObj.text;
      chat.lastMessageTime = messageObj.timestamp;
      chat.updatedAt = new Date().toISOString();
    } else {
      current.push({
        id: chatId,
        messages: [messageObj],
        lastMessage: messageObj.text,
        lastMessageTime: messageObj.timestamp,
        type: 'direct',
        participants: [messageObj.senderId],
        createdAt: new Date().toISOString()
      });
    }
    return await syncAllChatsToCloudflare(current);
  } catch (err) {
    return false;
  }
};

export const createCloudflareGroupChat = async (groupData) => {
  return saveCloudflareChat(groupData);
};

export const deleteCloudflareChat = async (chatId) => {
  try {
    const current = await fetchCloudflareChats();
    const filtered = current.filter(c => c.id !== chatId);
    return await syncAllChatsToCloudflare(filtered);
  } catch (err) {
    return false;
  }
};

export const markCloudflareChatAsRead = async (chatId, userId) => {
  try {
    const current = await fetchCloudflareChats();
    const chat = current.find(c => c.id === chatId);
    if (!chat || !Array.isArray(chat.messages)) return false;

    let hasChange = false;
    chat.messages = chat.messages.map(m => {
      const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
      if (!readBy.includes(userId)) {
        hasChange = true;
        return { ...m, readBy: [...readBy, userId] };
      }
      return m;
    });

    if (hasChange) {
      return await syncAllChatsToCloudflare(current);
    }
    return true;
  } catch (err) {
    return false;
  }
};

// ---------------- LIVE SUBSCRIPTIONS (SMART POLLING) ----------------

export const subscribeToCloudflareContacts = (onUpdate, onError) => {
  if (!isCloudflareConfigured()) return () => {};

  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    try {
      const contacts = await fetchContactsFromCloudflare();
      if (contacts && !isCancelled) {
        onUpdate(contacts);
      }
    } catch (err) {
      if (onError && !isCancelled) onError(err);
    }
  };

  // Immediate first fetch
  poll();

  // Smart polling interval: 25 seconds
  const interval = setInterval(poll, 25000);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

export const subscribeToCloudflareNotifications = (onUpdate) => {
  if (!isCloudflareConfigured()) return () => {};

  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    try {
      const notifs = await fetchCloudflareNotifications();
      if (notifs && notifs.length > 0 && !isCancelled) {
        onUpdate(notifs);
      }
    } catch (err) {}
  };

  poll();
  const interval = setInterval(poll, 20000);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

export const subscribeToCloudflareChats = (onUpdate, onError) => {
  if (!isCloudflareConfigured()) return () => {};

  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    try {
      const chats = await fetchCloudflareChats();
      if (chats && !isCancelled) {
        onUpdate(chats);
      }
    } catch (err) {
      if (onError && !isCancelled) onError(err);
    }
  };

  poll();
  const interval = setInterval(poll, 6000); // 6s fast poll for live chats

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

export const subscribeToCloudflareMasterConfig = (onUpdate, onError) => {
  if (!isCloudflareConfigured()) return () => {};

  let isCancelled = false;
  const poll = async () => {
    if (isCancelled) return;
    try {
      const config = await fetchCloudflareMasterConfig();
      if (config && !isCancelled) {
        onUpdate(config);
      }
    } catch (err) {
      if (onError && !isCancelled) onError(err);
    }
  };

  poll();
  const interval = setInterval(poll, 45000);

  return () => {
    isCancelled = true;
    clearInterval(interval);
  };
};

// ---------------- OFFLINE QUEUE PROCESSOR ----------------

export const processOfflineSyncQueue = async () => {
  if (!isCloudflareConfigured()) return false;

  try {
    const queue = await idbGetSyncQueue();
    if (!queue || queue.length === 0) return true;

    console.log(`[Cloudflare R2] Processing ${queue.length} offline queued items...`);
    for (const item of queue) {
      try {
        if (item.type === 'save_contact' && item.payload) {
          await saveCloudflareContact(item.payload);
        } else if (item.type === 'delete_contact' && item.payload) {
          await deleteCloudflareContact(item.payload);
        } else if (item.type === 'save_chat' && item.payload) {
          await saveCloudflareChat(item.payload);
        }
      } catch (err) {
        console.warn('[Cloudflare R2] Single item sync notice:', err);
      }
    }
    await idbClearSyncQueue();
    console.log('[Cloudflare R2] Offline queue cleared successfully');
    return true;
  } catch (err) {
    console.warn('[Cloudflare R2] Offline queue processing error:', err);
    return false;
  }
};
