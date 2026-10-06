import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  idbEnqueueSync, 
  idbGetSyncQueue, 
  idbClearSyncQueue 
} from './indexedDB';

const FIREBASE_CONFIG_KEY = 'police_firebase_config_v1';

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyARQNOHSveQVGpQE47l1d6t7ypRnnA-e-Q",
  authDomain: "police-directory-d8f0b.firebaseapp.com",
  projectId: "police-directory-d8f0b",
  storageBucket: "police-directory-d8f0b.firebasestorage.app",
  messagingSenderId: "258305668025",
  appId: "1:258305668025:web:dfbd44637f1bd5003cfc68"
};

// Read config from localStorage, Vite environment variables, or default project config
export const getStoredFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId === DEFAULT_FIREBASE_CONFIG.projectId && parsed.apiKey) {
        return parsed;
      }
      // Clear stale config from earlier attempts
      localStorage.removeItem(FIREBASE_CONFIG_KEY);
    }
  } catch (err) {}

  // Fallback to Vite environment variables if defined
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_API_KEY) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
    };
  }

  // Pre-configured project configuration
  return DEFAULT_FIREBASE_CONFIG;
};

// Check if Firebase is currently active and configured
export const isFirebaseConfigured = () => {
  const config = getStoredFirebaseConfig();
  return Boolean(config && config.projectId && config.apiKey);
};

// Initialize or retrieve Firebase app & db instances
let appInstance = null;
let dbInstance = null;

export const getFirebaseDB = () => {
  if (dbInstance) return dbInstance;
  const config = getStoredFirebaseConfig();
  if (!config) return null;

  try {
    if (!getApps().length) {
      appInstance = initializeApp(config);
    } else {
      appInstance = getApp();
    }
    dbInstance = getFirestore(appInstance);
    return dbInstance;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return null;
  }
};

export const db = getFirebaseDB();

// Save Firebase config into localStorage and re-init
export const saveFirebaseConfig = async (config) => {
  try {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    const apps = getApps();
    for (const app of apps) {
      try {
        await deleteApp(app);
      } catch (e) {}
    }
    appInstance = null;
    dbInstance = null;
    return getFirebaseDB() !== null;
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
    return false;
  }
};

// Clear Firebase configuration (revert to offline / localStorage mode)
export const clearFirebaseConfig = async () => {
  try {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    const apps = getApps();
    for (const app of apps) {
      try {
        await deleteApp(app);
      } catch (e) {}
    }
    appInstance = null;
    dbInstance = null;
    return true;
  } catch (err) {
    return false;
  }
};

// Play an instant audio notification chime when a new message or notice arrives
export const playNotificationChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Two-tone police chime (E5 -> G#5)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(830.61, ctx.currentTime + 0.12); // G#5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (err) {
    // AudioContext blocked or not supported
  }
};

// ---------------- FIRESTORE REALTIME SYNC (CHATS) ----------------

// Subscribe to real-time chat updates across all devices
export const subscribeToFirestoreChats = (onUpdate, onError) => {
  const db = getFirebaseDB();
  if (!db) return () => {};

  try {
    const chatsCol = collection(db, 'police_chats');
    const unsubscribe = onSnapshot(chatsCol, (snapshot) => {
      const chatsList = [];
      snapshot.forEach(docSnap => {
        chatsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (chatsList.length > 0) {
        onUpdate(chatsList);
      }
    }, (err) => {
      console.warn('Firestore chat subscription warning:', err);
      if (onError) onError(err);
    });

    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to chats:', err);
    return () => {};
  }
};

// Send a real-time message to Firestore
export const sendFirestoreMessage = async (chatId, messageObj) => {
  const db = getFirebaseDB();
  if (!db) return false;

  try {
    const chatDocRef = doc(db, 'police_chats', chatId);
    const docSnap = await getDoc(chatDocRef);

    if (docSnap.exists()) {
      await updateDoc(chatDocRef, {
        messages: arrayUnion(messageObj),
        lastMessage: messageObj.text,
        lastMessageTime: messageObj.timestamp,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new chat document if not existing
      await setDoc(chatDocRef, {
        id: chatId,
        messages: [messageObj],
        lastMessage: messageObj.text,
        lastMessageTime: messageObj.timestamp,
        type: 'direct',
        participants: [messageObj.senderId],
        createdAt: new Date().toISOString()
      });
    }
    return true;
  } catch (err) {
    console.error('Error sending message to Firestore:', err);
    return false;
  }
};

// Save or sync an entire chat object (direct or group) to Firestore
export const saveFirestoreChat = async (chatObj) => {
  const db = getFirebaseDB();
  if (!db || !chatObj || !chatObj.id) return false;

  try {
    const chatDocRef = doc(db, 'police_chats', chatObj.id);
    await setDoc(chatDocRef, chatObj, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving chat to Firestore:', err);
    return false;
  }
};

// Create or sync a group chat in Firestore
export const createFirestoreGroupChat = async (groupData) => {
  const db = getFirebaseDB();
  if (!db) return false;

  try {
    const chatDocRef = doc(db, 'police_chats', groupData.id);
    await setDoc(chatDocRef, groupData);
    return true;
  } catch (err) {
    console.error('Error creating group chat in Firestore:', err);
    return false;
  }
};

// Delete a chat from Firestore
export const deleteFirestoreChat = async (chatId) => {
  const db = getFirebaseDB();
  if (!db || !chatId) return false;

  try {
    const chatDocRef = doc(db, 'police_chats', chatId);
    await deleteDoc(chatDocRef);
    return true;
  } catch (err) {
    console.error('Error deleting chat from Firestore:', err);
    return false;
  }
};


// Mark a chat as read in Firestore
export const markFirestoreChatAsRead = async (chatId, userId) => {
  const db = getFirebaseDB();
  if (!db) return false;

  try {
    const chatDocRef = doc(db, 'police_chats', chatId);
    const docSnap = await getDoc(chatDocRef);
    if (!docSnap.exists()) return false;

    const data = docSnap.data();
    if (!Array.isArray(data.messages)) return false;

    let hasChange = false;
    const updatedMsgs = data.messages.map(m => {
      const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
      if (!readBy.includes(userId)) {
        hasChange = true;
        return { ...m, readBy: [...readBy, userId] };
      }
      return m;
    });

    if (hasChange) {
      await updateDoc(chatDocRef, { messages: updatedMsgs });
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Sync all local chats to Firestore (Initial Cloud Migration)
export const syncAllChatsToFirestore = async (localChats) => {
  const db = getFirebaseDB();
  if (!db || !Array.isArray(localChats)) return false;

  try {
    for (const chat of localChats) {
      const chatDocRef = doc(db, 'police_chats', chat.id);
      await setDoc(chatDocRef, chat, { merge: true });
    }
    return true;
  } catch (err) {
    console.error('Failed to sync chats to Firestore:', err);
    return false;
  }
};

// ---------------- FIRESTORE NOTIFICATIONS SYNC ----------------
export const subscribeToFirestoreNotifications = (onUpdate) => {
  const db = getFirebaseDB();
  if (!db) return () => {};

  try {
    const notifsCol = collection(db, 'police_notifications');
    return onSnapshot(notifsCol, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length > 0) {
        onUpdate(list);
      }
    });
  } catch (err) {
    return () => {};
  }
};

export const addFirestoreNotification = async (notif) => {
  const db = getFirebaseDB();
  if (!db) return false;

  try {
    const notifDocRef = doc(db, 'police_notifications', notif.id);
    await setDoc(notifDocRef, notif);
    return true;
  } catch (err) {
    return false;
  }
};

// ---------------- FIRESTORE CONTACTS SYNC (PERMANENT RETENTION RULE) ----------------
// Rule: Manually entered & registered officers are never automatically wiped

export const subscribeToFirestoreContacts = (onUpdate, onError) => {
  const db = getFirebaseDB();
  if (!db) return () => {};

  try {
    const contactsCol = collection(db, 'police_contacts');
    return onSnapshot(contactsCol, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (list.length > 0) {
        onUpdate(list);
      }
    }, (err) => {
      console.warn('Firestore contacts subscription notice:', err);
      if (onError) onError(err);
    });
  } catch (err) {
    console.error('Failed to subscribe to contacts in Firestore:', err);
    return () => {};
  }
};

export const saveFirestoreContact = async (contact) => {
  const db = getFirebaseDB();
  if (!db || !contact || !contact.id) return false;

  try {
    const contactDocRef = doc(db, 'police_contacts', contact.id);
    await setDoc(contactDocRef, { ...contact, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving contact to Firestore:', err);
    return false;
  }
};

export const deleteFirestoreContact = async (contactId) => {
  const db = getFirebaseDB();
  if (!db || !contactId) return false;

  try {
    const contactDocRef = doc(db, 'police_contacts', contactId);
    await deleteDoc(contactDocRef);
    return true;
  } catch (err) {
    console.error('Error deleting contact from Firestore:', err);
    return false;
  }
};

export const syncAllContactsToFirestore = async (contacts) => {
  const db = getFirebaseDB();
  if (!db || !Array.isArray(contacts) || contacts.length === 0) return false;

  try {
    const validContacts = contacts.filter(c => c && c.id && !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
    const CHUNK_SIZE = 400; // Firestore batch maximum is 500
    for (let i = 0; i < validContacts.length; i += CHUNK_SIZE) {
      const chunk = validContacts.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const c of chunk) {
        const docRef = doc(db, 'police_contacts', c.id);
        batch.set(docRef, { ...c, updatedAt: c.updatedAt || new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
    }
    console.log(`[Firebase] Batch synced ${validContacts.length} contacts to cloud successfully`);
    return true;
  } catch (err) {
    console.error('Failed to sync contacts to Firestore batch:', err);
    return false;
  }
};

/**
 * Process offline mutation queue when connectivity is restored
 */
export const processOfflineSyncQueue = async () => {
  const db = getFirebaseDB();
  if (!db) return false;

  try {
    const queue = await idbGetSyncQueue();
    if (!queue || queue.length === 0) return true;

    console.log(`[Firebase] Processing ${queue.length} offline queued actions...`);
    for (const item of queue) {
      try {
        if (item.type === 'save_contact' && item.payload) {
          await saveFirestoreContact(item.payload);
        } else if (item.type === 'delete_contact' && item.payload) {
          await deleteFirestoreContact(item.payload);
        } else if (item.type === 'save_chat' && item.payload) {
          await saveFirestoreChat(item.payload);
        }
      } catch (subErr) {
        console.warn('[Firebase] Single item sync notice:', subErr);
      }
    }
    await idbClearSyncQueue();
    console.log('[Firebase] Offline queue cleared successfully');
    return true;
  } catch (err) {
    console.warn('[Firebase] Offline queue processing error:', err);
    return false;
  }
};

/**
 * Sync dynamic master configs (posts, offices, districts, policies) in Firestore
 */
export const saveFirestoreMasterConfig = async (config) => {
  const db = getFirebaseDB();
  if (!db || !config) return false;
  try {
    const docRef = doc(db, 'police_system', 'master_config');
    await setDoc(docRef, { ...config, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    return false;
  }
};

export const subscribeToFirestoreMasterConfig = (onUpdate) => {
  const db = getFirebaseDB();
  if (!db) return () => {};
  try {
    const docRef = doc(db, 'police_system', 'master_config');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data());
      }
    });
  } catch (err) {
    return () => {};
  }
};


