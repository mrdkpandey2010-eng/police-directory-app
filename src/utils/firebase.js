/**
 * Cloudflare R2 Cloud Storage Adapter
 * Re-exports Cloudflare R2 methods under compatible names
 * Completely replaces Firebase with Cloudflare R2!
 */

export * from './cloudflareR2';

// Compatibility aliases for legacy Firebase names
export {
  isCloudflareConfigured as isFirebaseConfigured,
  getStoredCloudflareConfig as getStoredFirebaseConfig,
  saveCloudflareConfig as saveFirebaseConfig,
  clearCloudflareConfig as clearFirebaseConfig,
  testCloudflareConnection as testFirebaseConnection,
  syncAllContactsToCloudflare as syncAllContactsToFirestore,
  fetchContactsFromCloudflare as fetchContactsFromFirestore,
  subscribeToCloudflareContacts as subscribeToFirestoreContacts,
  saveCloudflareContact as saveFirestoreContact,
  deleteCloudflareContact as deleteFirestoreContact,
  saveCloudflareMasterConfig as saveFirestoreMasterConfig,
  fetchCloudflareMasterConfig as getFirestoreMasterConfig,
  initCloudflareMasterConfigIfEmpty as initFirestoreMasterConfigIfEmpty,
  subscribeToCloudflareMasterConfig as subscribeToFirestoreMasterConfig,
  subscribeToCloudflareNotifications as subscribeToFirestoreNotifications,
  addCloudflareNotification as addFirestoreNotification,
  subscribeToCloudflareChats as subscribeToFirestoreChats,
  sendCloudflareMessage as sendFirestoreMessage,
  saveCloudflareChat as saveFirestoreChat,
  createCloudflareGroupChat as createFirestoreGroupChat,
  saveCloudflareDistricts as saveFirestoreDistricts,
  saveCloudflarePosts as saveFirestorePosts,
  saveCloudflareOffices as saveFirestoreOffices,
  saveCloudflareCoAdmins as saveFirestoreCoAdmins,
  saveCloudflareTerms as saveFirestoreTerms,
  saveCloudflarePolicies as saveFirestorePolicies,
  deleteCloudflareChat as deleteFirestoreChat,
  markCloudflareChatAsRead as markFirestoreChatAsRead,
  syncAllChatsToCloudflare as syncAllChatsToFirestore,
  processOfflineSyncQueue,
  playNotificationChime
} from './cloudflareR2';

export const getFirebaseDB = () => null;
export const db = null;
