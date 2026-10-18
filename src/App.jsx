import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import SearchFilters from './components/SearchFilters';
import ContactList from './components/ContactList';
import Header from './components/Header';
import UniformPhotoGate from './components/UniformPhotoGate';
import AuthGateway from './components/AuthGateway';
import HeaderMenuDrawer from './components/HeaderMenuDrawer';
import MobileBottomNav from './components/MobileBottomNav';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { initNativeApp, setupHardwareBackButton } from './utils/nativeBridge';

import AdminPanel from './components/AdminPanel';
import ErrorBoundary from './components/ErrorBoundary';

// Dynamic / Lazy-loaded heavy modal dialogs for 60%+ smaller bundle & fast load speed
const RegistrationModal = lazy(() => import('./components/RegistrationModal'));
const EditContactModal = lazy(() => import('./components/EditContactModal'));
const LoginModal = lazy(() => import('./components/LoginModal'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const NotificationsModal = lazy(() => import('./components/NotificationsModal'));
const FeedbackModal = lazy(() => import('./components/FeedbackModal'));
const MessageBoxModal = lazy(() => import('./components/MessageBoxModal'));
const FirebaseSetupModal = lazy(() => import('./components/CloudflareSetupModal'));
const PolicyModal = lazy(() => import('./components/PolicyModal'));
const LoginDisclaimerModal = lazy(() => import('./components/LoginDisclaimerModal'));
const Admin2FAModal = lazy(() => import('./components/Admin2FAModal'));
const ActiveCallModal = lazy(() => import('./components/ActiveCallModal'));
const RecentCallsModal = lazy(() => import('./components/RecentCallsModal'));
import ServiceTermsScreen from './components/ServiceTermsScreen';
import PermissionOnboardingScreen from './components/PermissionOnboardingScreen';
import {
  isFirebaseConfigured,
  subscribeToFirestoreChats,
  saveFirestoreChat,
  markFirestoreChatAsRead,
  playNotificationChime,
  subscribeToFirestoreContacts,
  saveFirestoreContact,
  deleteFirestoreContact,
  deleteFirestoreChat,
  syncAllContactsToFirestore,
  processOfflineSyncQueue,
  saveFirestoreMasterConfig,
  saveFirestoreDistricts,
  saveFirestorePosts,
  saveFirestoreOffices,
  saveFirestoreCoAdmins,
  saveFirestoreTerms,
  saveFirestorePolicies,
  subscribeToFirestoreMasterConfig,
  initFirestoreMasterConfigIfEmpty
} from './utils/firebase';
import { 
  getStoredContacts, 
  loadContactsFromPermanentStorage,
  saveContacts,
  getStoredCoAdmins,
  saveCoAdmins,
  getStoredNotifications,
  getStoredFeedbacks,
  getStoredChats,
  saveChats,
  getStoredSession,
  saveSession,
  getStoredPosts,
  savePosts,
  getStoredOffices,
  saveOffices,
  getStoredDistricts,
  saveDistricts,
  addPost,
  editPost,
  deletePost,
  addOffice,
  editOffice,
  deleteOffice,
  addDistrict,
  editDistrict,
  deleteDistrict,
  loadAll75Districts,
  loadStandardPolicePosts,
  resetMasterDataToClean,
  registerNewOfficer, 
  approveOfficer, 
  rejectOfficer, 
  editOfficerProfile, 
  requestUserProfileUpdate,
  toggleBlockOfficer, 
  toggleUserActive,
  deleteOfficerProfile,
  resetUserPassword,
  addCoAdmin,
  deleteCoAdmin,
  toggleCoAdminActive,
  promoteUserToCoAdmin,
  revokeCoAdmin,
  requestDistrictTransfer,
  forwardDistrictTransferToAdmin,
  approveDistrictTransferByAdmin,
  rejectDistrictTransfer,
  addNotification,
  deleteNotification,
  addFeedback,
  toggleResolveFeedback,
  sendDirectMessage,
  createGroupChat,
  sendGroupMessage,
  addGroupParticipants,
  removeGroupParticipant,
  leaveGroupChat,
  deleteGroupChat,
  clearChatMessages,
  getDeletedChatIds,
  removeDeletedChatId,
  appendMessageToChat,
  markChatAsRead,
  getUnreadMessagesCountForUser,
  updateUserUniformPhoto,
  resetToDefaultContacts,
  getStoredTerms,
  saveTerms,
  DEFAULT_TERMS,
  checkAndTrigger6HourBackup,
  createBackupSlot,
  getStoredBackups,
  getStoredPhonePermissions,
  respondPhonePermission,
  getStored2FAConfig,
  getStoredPolicies,
  DEFAULT_POLICIES,
  addCustomPolicy,
  editPolicyItem,
  deleteCustomPolicyItem,
  savePolicies,
  getStoredCallLogs,
  saveCallLog,
  deleteCallLog,
  clearCallLogs,
  markCallLogsAsSeen,
  getUnseenMissedCallsCount,
  updateOfficerDeviceAudit,
  saveRecycleBinItem,
  getUserDeletedChatIds,
  saveUserDeletedChatIdsLocal,
  addUserDeletedChatIdLocal
} from './utils/storage';
import { getNotificationPermissionStatus, requestAppNotificationPermission } from './utils/notifications';
import TermsFooter from './components/TermsFooter';
import MandatoryPermissionModal from './components/MandatoryPermissionModal';
import { MapPin, Shield, Search, Lock, Menu, ShieldCheck, Eye, PhoneCall, PhoneMissed } from 'lucide-react';
import { callManager } from './utils/webrtc';
import { 
  sendPresenceHeartbeat, 
  fetchAllUsersPresence,
  fetchCallHistoryFromCloudflare, 
  deleteCallHistoryFromCloudflare, 
  saveRegistrationAuditLogToCloud,
  fetchUserDeletedChatIds,
  saveUserDeletedChatIds,
  saveRecycleBinItemToCloud
} from './utils/cloudflareR2';
import { captureFullDeviceTelemetry } from './utils/deviceTelemetry';

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [coAdmins, setCoAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [chats, setChats] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [policies, setPolicies] = useState(DEFAULT_POLICIES);

  // Dynamic Master Configuration Lists
  const [posts, setPosts] = useState([]);
  const [offices, setOffices] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedPost, setSelectedPost] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');

  // User District Scoping ('my_district' = only their posted district, 'all' = search across all)
  const [userDistrictScope, setUserDistrictScope] = useState('my_district');
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerPrefillPno, setRegisterPrefillPno] = useState('');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminInitialTab, setAdminInitialTab] = useState('pending');
  const [isAdmin2FAModalOpen, setIsAdmin2FAModalOpen] = useState(false);
  const [is2FAVerifiedThisSession, setIs2FAVerifiedThisSession] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotifsModalOpen, setIsNotifsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isFirebaseSetupOpen, setIsFirebaseSetupOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(isFirebaseConfigured());

  // Recent Calls & Call History Modal State
  const [isCallHistoryModalOpen, setIsCallHistoryModalOpen] = useState(false);
  const [callLogs, setCallLogs] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermissionStatus());
  const [isNotifBannerDismissed, setIsNotifBannerDismissed] = useState(false);

  // Policy Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState('disclaimer');

  // Post-Login Mandatory Service Terms & Permission Gates
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isPermissionsCompleted, setIsPermissionsCompleted] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(true);
  const [isPhotoGateDismissed, setIsPhotoGateDismissed] = useState(false);

  // Toggle Slide Menu Drawer
  const [isMenuDrawerOpen, setIsMenuDrawerOpen] = useState(false);

  // Phone privacy permissions
  const [phonePermissions, setPhonePermissions] = useState([]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Android Native Hardware Back Button Handler Ref (Modal & Drawer Stack)
  const backHandlerRef = useRef(null);
  backHandlerRef.current = () => {
    if (isFilterSidebarOpen) {
      setIsFilterSidebarOpen(false);
      return true;
    }
    if (isPolicyModalOpen) {
      setIsPolicyModalOpen(false);
      return true;
    }
    if (isEditModalOpen) {
      setIsEditModalOpen(false);
      setEditingContact(null);
      return true;
    }
    if (isMenuDrawerOpen) {
      setIsMenuDrawerOpen(false);
      return true;
    }
    if (isFirebaseSetupOpen) {
      setIsFirebaseSetupOpen(false);
      return true;
    }
    if (isFeedbackModalOpen) {
      setIsFeedbackModalOpen(false);
      return true;
    }
    if (isCallHistoryModalOpen) {
      setIsCallHistoryModalOpen(false);
      return true;
    }
    if (isNotifsModalOpen) {
      setIsNotifsModalOpen(false);
      return true;
    }
    if (isChatModalOpen) {
      if (activeChatId) {
        setActiveChatId(null);
        return true;
      }
      setIsChatModalOpen(false);
      return true;
    }
    if (isProfileModalOpen) {
      setIsProfileModalOpen(false);
      return true;
    }
    if (isAdmin2FAModalOpen) {
      setIsAdmin2FAModalOpen(false);
      return true;
    }
    if (isAdminModalOpen) {
      setIsAdminModalOpen(false);
      return true;
    }
    if (isRegisterModalOpen) {
      setIsRegisterModalOpen(false);
      return true;
    }
    if (isLoginModalOpen) {
      setIsLoginModalOpen(false);
      return true;
    }
    if (searchQuery && searchQuery.trim() !== '') {
      setSearchQuery('');
      return true;
    }
    return false;
  };

  // Load all data on mount
  useEffect(() => {
    // Native Android Engine Setup (Status Bar & Splash Screen)
    initNativeApp();

    // Android Hardware / Gesture Back Button
    const cleanupBackButton = setupHardwareBackButton(
      () => (backHandlerRef.current ? backHandlerRef.current() : false),
      showToast
    );

    setContacts(getStoredContacts());
    setCoAdmins(getStoredCoAdmins());
    setNotifications(getStoredNotifications());
    setFeedbacks(getStoredFeedbacks());
    setChats(getStoredChats());
    setPosts(getStoredPosts());
    setOffices(getStoredOffices());
    setDistricts(getStoredDistricts());
    setTerms(getStoredTerms());
    setPolicies(getStoredPolicies());
    setPhonePermissions(getStoredPhonePermissions());
    setCallLogs(getStoredCallLogs());
    
    // Load and verify from high-capacity permanent IndexedDB vault (500MB+)
    loadContactsFromPermanentStorage().then((vaultContacts) => {
      if (Array.isArray(vaultContacts) && vaultContacts.length > 0) {
        setContacts((prev) => {
          if (!prev || vaultContacts.length >= prev.length) {
            return vaultContacts;
          }
          return prev;
        });
      }
    });

    // Auto-process offline queue when network is active
    if (navigator.onLine && isFirebaseConfigured()) {
      processOfflineSyncQueue();
    }

    const handleOnline = () => {
      console.log('[Network] Internet restored, syncing offline queue...');
      processOfflineSyncQueue();
      const current = getStoredContacts();
      if (current && current.length > 0 && isFirebaseConfigured()) {
        syncAllContactsToFirestore(current);
      }
    };
    window.addEventListener('online', handleOnline);

    // Check and trigger rolling 6-hour automated backup
    checkAndTrigger6HourBackup();

    // Setup periodic backup check every 30 minutes
    const backupInterval = setInterval(() => {
      checkAndTrigger6HourBackup();
    }, 30 * 60 * 1000);

    // Anti-Screenshot & Screen Recording Protections (IT Act & Police Regulations)
    const handleContextMenu = (e) => {
      e.preventDefault();
      showToast('⚠️ शासकीय सुरक्षा सूचना: पोर्टल पर राइट-क्लिक एवं सामग्री प्रतिलिपि पूर्णतः प्रतिबंधित है।');
      return false;
    };

    const handleKeyDown = (e) => {
      // PrintScreen Key Block
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        try { navigator.clipboard.writeText(''); } catch(err) {}
        alert('⚠️ शासकीय सुरक्षा सूचना: उत्तर प्रदेश पुलिस पोर्टल का स्क्रीनशॉट या स्क्रीन रिकॉर्डिंग पूर्णतः प्रतिबंधित है। विभागीय नियमावली एवं आईटी एक्ट 2000 के अंतर्गत आपका सत्र एवं पहचान सुरक्षित की जा रही है।');
        return false;
      }

      // Print (Ctrl+P), Save (Ctrl+S), View Source (Ctrl+U)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'u')) {
        e.preventDefault();
        showToast('⚠️ शासकीय सुरक्षा सूचना: इस पृष्ठ का प्रिंट अथवा लोकल सेव प्रतिबंधित है।');
        return false;
      }

      // Developer Tools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
        showToast('⚠️ डेवलपर टूल्स का उपयोग प्रतिबंधित है।');
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // Restore saved user session permanently (No auto-logout)
    const savedUser = getStoredSession();
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role === 'user' || savedUser.role === 'co_admin') {
        setSelectedDistrict(savedUser.district || '');
      }
      const hasAcceptedTerms = (savedUser.termsAcceptedVersion >= 2) || 
        (localStorage.getItem(`police_terms_v2_${savedUser.id}`) === 'true');
      setIsTermsAccepted(hasAcceptedTerms);

      const hasDonePerms = localStorage.getItem(`police_permissions_onboarding_${savedUser.id}`) === 'true';
      setIsPermissionsCompleted(hasDonePerms);

      setDisclaimerAgreed(true);
      setIsDisclaimerModalOpen(false);
    } else {
      // Front screen login wall if no active session
      setCurrentUser(null);
      setIsTermsAccepted(false);
      setIsPermissionsCompleted(false);
    }

    return () => {
      cleanupBackButton();
      clearInterval(backupInterval);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Auto-open Employee Search Sidebar on first authenticated Home page initialization (Section 1)
  const hasAutoOpenedSearchRef = useRef(false);

  useEffect(() => {
    const isAuthComplete = Boolean(currentUser && isTermsAccepted && isPermissionsCompleted);
    if (isAuthComplete) {
      if (!hasAutoOpenedSearchRef.current) {
        hasAutoOpenedSearchRef.current = true;
        setIsFilterSidebarOpen(true);
      }
    } else {
      hasAutoOpenedSearchRef.current = false;
    }
  }, [currentUser, isTermsAccepted, isPermissionsCompleted]);

  // ---------------- FIRESTORE CONTACTS REAL-TIME SYNC (PERMANENT RETENTION) ----------------
  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    if (!isConfigured) return;

    const unsubscribe = subscribeToFirestoreContacts((cloudContacts) => {
      if (!Array.isArray(cloudContacts)) return;

      const localList = getStoredContacts();

      // Two-Way Sync: If cloud is completely empty, push all local contacts to Firestore immediately
      if (cloudContacts.length === 0) {
        if (localList && localList.length > 0) {
          const cleanLocal = localList.filter(c => c && c.id && !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
          if (cleanLocal.length > 0) {
            console.log(`[Two-Way Sync] Cloud is empty; uploading ${cleanLocal.length} local contacts to Firestore...`);
            syncAllContactsToFirestore(cleanLocal);
          }
        }
        return;
      }

      setContacts((prevContacts) => {
        const contactMap = new Map();
        const currentList = (prevContacts && prevContacts.length > 0) ? prevContacts : localList;
        currentList.forEach(c => {
          if (c && c.id) contactMap.set(c.id, c);
        });

        let hasChange = false;
        cloudContacts.forEach(cloudC => {
          if (!cloudC || !cloudC.id) return;
          // Filter out any legacy dummy mock records
          if (/^pol-1(0[1-9]|1[0-5])$/.test(cloudC.id)) return;

          const local = contactMap.get(cloudC.id);
          if (!local) {
            contactMap.set(cloudC.id, cloudC);
            hasChange = true;
          } else {
            // Non-destructive preservation: keep local uniform photo & password if cloud lacks them
            const merged = {
              ...local,
              ...cloudC,
              uniformPhoto: cloudC.uniformPhoto || local.uniformPhoto,
              password: local.password || cloudC.password
            };
            const isCloudNewer = cloudC.updatedAt && (!local.updatedAt || cloudC.updatedAt > local.updatedAt);
            if (isCloudNewer || cloudC.status !== local.status || (!local.uniformPhoto && cloudC.uniformPhoto)) {
              contactMap.set(cloudC.id, merged);
              hasChange = true;
            }
          }
        });

        // Two-Way Sync: If there are local officers not yet uploaded to Firestore, push them up
        const cloudIds = new Set(cloudContacts.map(c => c.id));
        const localOnlyList = localList.filter(c => c && c.id && !cloudIds.has(c.id) && !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
        if (localOnlyList.length > 0) {
          console.log(`[Two-Way Sync] Detected ${localOnlyList.length} local-only officers; syncing to Firestore...`);
          syncAllContactsToFirestore(Array.from(contactMap.values()));
        }

        if (hasChange) {
          const merged = Array.from(contactMap.values());
          saveContacts(merged);
          return merged;
        }
        return prevContacts;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isFirebaseConnected]);

  // ---------------- FIRESTORE MASTER CONFIG REAL-TIME SYNC (DISTRICTS, POSTS, OFFICES, CO-ADMINS, TERMS, POLICIES) ----------------
  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    if (!isConfigured) return;

    // Bootstrap Firestore master_config if empty
    initFirestoreMasterConfigIfEmpty({
      districts: getStoredDistricts(),
      posts: getStoredPosts(),
      offices: getStoredOffices(),
      coAdmins: getStoredCoAdmins(),
      terms: getStoredTerms(),
      policies: getStoredPolicies()
    });

    const unsubscribe = subscribeToFirestoreMasterConfig((cloudConfig) => {
      if (!cloudConfig) return;

      // 1. Sync Districts across all devices
      if (Array.isArray(cloudConfig.districts) && cloudConfig.districts.length > 1) {
        setDistricts(cloudConfig.districts);
        saveDistricts(cloudConfig.districts);
      }

      // 2. Sync Posts across all devices
      if (Array.isArray(cloudConfig.posts) && cloudConfig.posts.length > 1) {
        setPosts(cloudConfig.posts);
        savePosts(cloudConfig.posts);
      }

      // 3. Sync Offices / Thanas across all devices
      if (Array.isArray(cloudConfig.offices)) {
        setOffices(cloudConfig.offices);
        saveOffices(cloudConfig.offices);
      }

      // 4. Sync Co-Admins across all devices
      if (Array.isArray(cloudConfig.coAdmins)) {
        setCoAdmins(cloudConfig.coAdmins);
        saveCoAdmins(cloudConfig.coAdmins);
      }

      // 5. Sync Terms
      if (cloudConfig.terms && typeof cloudConfig.terms === 'object') {
        setTerms(cloudConfig.terms);
        saveTerms(cloudConfig.terms);
      }

      // 6. Sync Policies
      if (Array.isArray(cloudConfig.policies) && cloudConfig.policies.length > 0) {
        setPolicies(cloudConfig.policies);
        savePolicies(cloudConfig.policies);
      }
    }, (err) => {
      console.warn('Firestore master_config sync notice:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isFirebaseConnected]);

  // Listen to real-time chat updates from Firebase Firestore
  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    setIsFirebaseConnected(isConfigured);
    if (!isConfigured) return;

    const unsubscribe = subscribeToFirestoreChats((cloudChats) => {
      if (!Array.isArray(cloudChats) || cloudChats.length === 0) return;

      const userDeleted = currentUser?.id ? getUserDeletedChatIds(currentUser.id) : [];
      const globalDeleted = getDeletedChatIds();
      const allDeletedIds = Array.from(new Set([...globalDeleted, ...userDeleted]));

      setChats((prevChats) => {
        const mergedMap = new Map();
        (prevChats || []).forEach((c) => {
          if (!allDeletedIds.includes(c.id)) {
            mergedMap.set(c.id, c);
          }
        });

        let hasNewIncoming = false;

        cloudChats.forEach((cloudChat) => {
          // If this chat is in user's deleted list, skip it! Do not resurrect!
          if (allDeletedIds.includes(cloudChat.id)) return;

          const local = mergedMap.get(cloudChat.id);
          if (!local) {
            mergedMap.set(cloudChat.id, cloudChat);
            if (cloudChat.messages && cloudChat.messages.length > 0) {
              const lastMsg = cloudChat.messages[cloudChat.messages.length - 1];
              if (currentUser && lastMsg && lastMsg.senderId !== currentUser.id) {
                hasNewIncoming = true;
              }
            }
          } else {
            const localCount = local.messages?.length || 0;
            const cloudCount = cloudChat.messages?.length || 0;
            const isCloudNewer = cloudChat.lastUpdated && (!local.lastUpdated || cloudChat.lastUpdated > local.lastUpdated);

            if (isCloudNewer || cloudCount > localCount) {
              mergedMap.set(cloudChat.id, { ...local, ...cloudChat });
              const lastMsg = cloudChat.messages?.[cloudChat.messages.length - 1];
              if (currentUser && lastMsg && lastMsg.senderId !== currentUser.id) {
                hasNewIncoming = true;
              }
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        saveChats(mergedList);

        if (hasNewIncoming) {
          playNotificationChime();
        }
        return mergedList;
      });
    }, (err) => {
      console.warn('Real-time chat sync error:', err);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isFirebaseConnected, currentUser]);

  // Cross-Device Chat Synchronization: Fetch user-deleted chat IDs from Cloudflare Edge (Requirement 2)
  useEffect(() => {
    if (!currentUser?.id) return;
    fetchUserDeletedChatIds(currentUser.id).then(cloudDeletedIds => {
      if (Array.isArray(cloudDeletedIds) && cloudDeletedIds.length > 0) {
        const local = getUserDeletedChatIds(currentUser.id);
        const combined = Array.from(new Set([...local, ...cloudDeletedIds]));
        saveUserDeletedChatIdsLocal(currentUser.id, combined);
        
        // Exclude these deleted chats from active chat state immediately across all devices
        setChats(prev => {
          const filtered = (prev || []).filter(c => !combined.includes(c.id));
          if (filtered.length !== (prev || []).length) {
            saveChats(filtered);
            return filtered;
          }
          return prev;
        });
      }
    }).catch(err => console.warn('Fetch user deleted chats note:', err));
  }, [currentUser?.id]);

  // Listen for incoming in-app voice calls across devices (Cloudflare KV + WebRTC)
  useEffect(() => {
    if (currentUser) {
      callManager.listenForUserCalls(currentUser);
      // Fetch cloud call history
      fetchCallHistoryFromCloudflare(currentUser.id).then(cloudLogs => {
        if (Array.isArray(cloudLogs) && cloudLogs.length > 0) {
          cloudLogs.forEach(c => saveCallLog(c));
          setCallLogs(getStoredCallLogs());
        }
      }).catch(() => {});
    } else {
      callManager.listenForUserCalls(null);
    }
  }, [currentUser]);

  // ---------------- USER REAL-TIME PRESENCE & HEARTBEAT ENGINE ----------------
  const [userLocationCoords, setUserLocationCoords] = useState(null);

  // Check and read location silently if permission was granted
  useEffect(() => {
    if (!navigator.geolocation) return;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'granted') {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setUserLocationCoords({
                  latitude: Number(pos.coords.latitude.toFixed(6)),
                  longitude: Number(pos.coords.longitude.toFixed(6)),
                  accuracy: Math.round(pos.coords.accuracy),
                  updatedAt: Date.now()
                });
              },
              () => {},
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
            );
          }
        }).catch(() => {});
      }
    } catch (e) {}
  }, []);

  // Send periodic presence heartbeat to Cloudflare Edge KV
  useEffect(() => {
    if (!currentUser) return;

    const doSendHeartbeat = () => {
      const isNative = !!(window.Capacitor?.isNativePlatform?.());
      const platform = isNative ? 'android' : 'browser';

      sendPresenceHeartbeat({
        userId: currentUser.id,
        name: currentUser.name,
        post: currentUser.post,
        district: currentUser.district,
        office: currentUser.office || '',
        pno: currentUser.pno || '',
        phone: currentUser.phone || '',
        platform, // 'android' | 'browser'
        isOnline: navigator.onLine,
        location: userLocationCoords,
        lastSeen: Date.now()
      });
    };

    // Send immediately upon mount / user login
    doSendHeartbeat();

    // Regular pulse every 25 seconds
    const heartbeatInterval = setInterval(doSendHeartbeat, 25000);

    const onOnline = () => doSendHeartbeat();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        doSendHeartbeat();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [currentUser, userLocationCoords]);

  // ---------------- ALL USERS REAL-TIME ONLINE PRESENCE TRACKING ----------------
  useEffect(() => {
    let isCancelled = false;
    const loadPresence = async () => {
      try {
        const data = await fetchAllUsersPresence();
        if (isCancelled || !data) return;
        const users = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
        const map = {};
        users.forEach(u => {
          const info = {
            isOnline: !!u.isOnline,
            lastSeen: u.lastSeen,
            platform: u.platform,
            district: u.district,
            post: u.post
          };
          if (u.userId) map[u.userId] = info;
          if (u.id) map[u.id] = info;
          if (u.pno) map[u.pno] = info;
          if (u.phone) {
            const clean = String(u.phone).replace(/\D/g, '');
            if (clean) map[clean] = info;
          }
        });
        setPresenceMap(map);
      } catch (err) {
        console.warn('Error loading presence map:', err);
      }
    };

    loadPresence();
    const presenceTimer = setInterval(loadPresence, 15000);
    return () => {
      isCancelled = true;
      clearInterval(presenceTimer);
    };
  }, [currentUser]);

  // Update current user session on login
  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    saveSession(userObj);
    localStorage.setItem('police_last_activity_time', String(Date.now()));
    if (userObj.role === 'user' || userObj.role === 'co_admin') {
      setUserDistrictScope('my_district');
      setSelectedDistrict(userObj.district || '');
    } else {
      setSelectedDistrict('');
    }

    const hasAcceptedTerms = (userObj.termsAcceptedVersion >= 2) || 
      (localStorage.getItem(`police_terms_v2_${userObj.id}`) === 'true');
    setIsTermsAccepted(hasAcceptedTerms);

    const hasDonePerms = localStorage.getItem(`police_permissions_onboarding_${userObj.id}`) === 'true';
    setIsPermissionsCompleted(hasDonePerms);

    setIsDisclaimerModalOpen(false);
    setDisclaimerAgreed(true);
    setIsPhotoGateDismissed(false);

    // Telemetry & Device Change Audit (Non-intrusive, zero extra permissions)
    if (userObj.id && userObj.role !== 'admin') {
      captureFullDeviceTelemetry().then(telemetry => {
        const { updatedContacts, officer } = updateOfficerDeviceAudit(contacts, userObj.id, telemetry);
        if (updatedContacts && updatedContacts.length > 0) {
          setContacts(updatedContacts);
          if (isFirebaseConfigured() && officer) {
            saveFirestoreContact(officer);
          }
        }
      }).catch(err => console.warn('Login telemetry audit error:', err));
    }

    showToast(`सफलतापूर्वक लॉगिन: ${userObj.name} (${userObj.role === 'admin' ? 'Super Admin' : userObj.role === 'co_admin' ? `Co-Admin ${userObj.district}` : 'User'})`);
  };

  const handleTermsAccepted = (version = 2) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, termsAcceptedVersion: version };
      setCurrentUser(updatedUser);
      saveSession(updatedUser);
      localStorage.setItem(`police_terms_v${version}_${currentUser.id}`, 'true');
    }
    setIsTermsAccepted(true);
    showToast('✅ सेवा शर्तें एवं शासकीय गोपनीयता नीति स्वीकृत।');
  };

  const handlePermissionsCompleted = () => {
    if (currentUser) {
      localStorage.setItem(`police_permissions_onboarding_${currentUser.id}`, 'true');
    }
    setIsPermissionsCompleted(true);
    showToast('✅ अनुमतियां सत्यापित! निर्देशिका में आपका स्वागत है।');
  };

  const handleAgreeDisclaimer = () => {
    if (currentUser) {
      sessionStorage.setItem(`police_disclaimer_agreed_${currentUser.id}`, 'true');
    }
    setDisclaimerAgreed(true);
    setIsDisclaimerModalOpen(false);
    showToast('✅ आपने आधिकारिक अस्वीकरण एवं सेवा शर्तों को स्वीकार कर लिया है।');
  };

  const handleOpenAdminPanel = (tab = 'pending') => {
    const targetTab = typeof tab === 'string' ? tab : 'pending';
    setAdminInitialTab(targetTab);
    const cfg = getStored2FAConfig();
    if (cfg.enabled && !is2FAVerifiedThisSession) {
      setIsAdmin2FAModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handle2FASuccess = () => {
    setIs2FAVerifiedThisSession(true);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'co_admin')) {
      const superAdminUser = {
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      };
      setCurrentUser(superAdminUser);
      saveSession(superAdminUser);
    }
    setDisclaimerAgreed(true);
    setIsDisclaimerModalOpen(false);
    setIsAdmin2FAModalOpen(false);
    setIsAdminModalOpen(true);
    showToast('✅ 2FA द्वि-चरणीय सत्यापन सफल! एडमिन कंट्रोल पैनल सक्रिय।');
  };

  const handleOpenPolicy = (type = 'disclaimer') => {
    setActivePolicyType(type);
    setIsPolicyModalOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveSession(null);
    setIsTermsAccepted(false);
    setIsPermissionsCompleted(false);
    localStorage.removeItem('police_last_activity_time');
    setIsChatModalOpen(false);
    setIs2FAVerifiedThisSession(false);
    showToast('आप पोर्टल से लॉगआउट हो गए हैं। सुरक्षा हेतु विवरण छुपा दिए गए हैं।');
  };

  // Filtered approved & active contacts (Scoped by role & district)
  const filteredContacts = useMemo(() => {
    if (!currentUser) return [];

    return contacts.filter(c => {
      // Non-approved, inactive, or blocked entries are hidden from caller directory
      const isCardActive = c.status === 'approved' || c.status === 'active';
      if (!isCardActive) return false;

      // Co-Admin and Regular Employee User:
      // If in "केवल मेरा जनपद" mode, strictly show their district
      if (currentUser?.role === 'user' || currentUser?.role === 'co_admin') {
        if (userDistrictScope === 'my_district') {
          const userDist = (currentUser.district || '').trim().toLowerCase();
          const contactDist = (c.district || '').trim().toLowerCase();
          if (userDist && contactDist !== userDist) return false;
        }
      }

      // Explicit District Filter dropdown
      if (selectedDistrict && (c.district || '').trim().toLowerCase() !== selectedDistrict.trim().toLowerCase()) {
        return false;
      }

      // Post Filter
      if (selectedPost && c.post !== selectedPost) {
        return false;
      }

      // Office Filter
      if (selectedOffice && c.office !== selectedOffice) {
        return false;
      }

      // Free Text Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (c.name || '').toLowerCase().includes(q);
        const matchesPno = (c.pno || '').toLowerCase().includes(q);
        const matchesPhone = (c.phone || '').includes(q);
        const matchesDistrict = (c.district || '').toLowerCase().includes(q);
        const matchesPost = (c.post || '').toLowerCase().includes(q);
        const matchesOffice = (c.office || '').toLowerCase().includes(q);

        if (!matchesName && !matchesPno && !matchesPhone && !matchesDistrict && !matchesPost && !matchesOffice) {
          return false;
        }
      }

      return true;
    });

    // Deterministic ordering for results (Section 5)
    matches.sort((a, b) => {
      const nameComp = (a.name || '').localeCompare(b.name || '', 'hi');
      if (nameComp !== 0) return nameComp;
      return (a.pno || '').localeCompare(b.pno || '');
    });

    return matches;
  }, [contacts, searchQuery, selectedDistrict, selectedPost, selectedOffice, currentUser, userDistrictScope]);

  // Maximum 200 Contact Cards displayed on home screen (Section 5)
  const displayedContacts = useMemo(() => {
    return filteredContacts.slice(0, 200);
  }, [filteredContacts]);

  // Handler: Execute Search from Sidebar
  const handleExecuteSearch = ({ query, district, post, office }) => {
    setSearchQuery(query || '');
    setSelectedDistrict(district || '');
    setSelectedPost(post || '');
    setSelectedOffice(office || '');
    setUserDistrictScope(district ? 'all' : 'my_district');
  };

  // Handler: Self Registration
  const handleRegistrationSubmit = async (formData) => {
    // 1. Auto-register office/thana into master list if new
    if (formData.office && formData.office.trim()) {
      const officeName = formData.office.trim();
      const officeDist = formData.district || '';
      const updatedOffices = addOffice(officeName, officeDist);
      setOffices(updatedOffices);
      if (isFirebaseConfigured()) {
        saveFirestoreOffices(updatedOffices);
      }
    }

    // 2. Register new officer locally and in IndexedDB vault
    const { updatedList, newOfficer } = registerNewOfficer(contacts, formData);
    setContacts(updatedList);

    // 3. Immediately sync to Firebase Firestore
    if (isFirebaseConfigured() && newOfficer) {
      const saved = await saveFirestoreContact(newOfficer);
      if (saved) {
        showToast('✅ पंजीकरण क्लाउड डेटाबेस (Firebase) पर सुरक्षित सबमिट हुआ! Admin / Co-Admin Approval के बाद सक्रिय होगा।');
      } else {
        showToast('⚠️ स्थानीय रूप से सुरक्षित। नेटवर्क कनेक्टिविटी पर क्लाउड सिंक होगा।');
      }
    } else {
      showToast('पंजीकरण सबमिट हो गया है! Admin / Co-Admin Approval के बाद प्रोफ़ाइल एक्टिव होगी।');
    }

    // 4. Sync registration device telemetry audit log to Cloudflare Edge
    if (newOfficer) {
      saveRegistrationAuditLogToCloud(newOfficer).catch(err => console.warn('Cloud reg audit log error:', err));
    }
  };

  // Handler: Admin / Co-Admin Approve
  const handleApproveContact = (id) => {
    const updated = approveOfficer(contacts, id);
    setContacts(updated);
    const target = updated.find(c => c.id === id);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    showToast('कर्मचारी की प्रोफ़ाइल सफलतापूर्वक स्वीकृत (Approved) की गई!');
  };

  // Handler: Admin / Co-Admin Reject
  const handleRejectContact = (id) => {
    if (window.confirm('क्या आप इस आवेदन को निरस्त (Reject) करना चाहते हैं?')) {
      const updated = rejectOfficer(contacts, id);
      setContacts(updated);
      if (isFirebaseConfigured()) {
        deleteFirestoreContact(id);
      }
      showToast('आवेदन निरस्त (Rejected) कर दिया गया।');
    }
  };

  // Handler: Edit Profile
  const handleStartEdit = (contact) => {
    setEditingContact(contact);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (updatedData) => {
    const updated = editOfficerProfile(contacts, updatedData);
    setContacts(updated);
    const target = updated.find(c => c.id === updatedData.id);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    showToast('अधिकारी प्रोफ़ाइल अद्यतन (Updated) कर दी गई है!');
  };

  // Handler: User Self Profile Update Request
  const handleUserProfileUpdateRequest = (userId, updatedFields) => {
    const updated = requestUserProfileUpdate(contacts, userId, updatedFields);
    setContacts(updated);
    const target = updated.find(c => c.id === userId);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updatedFields, status: 'pending' }));
    }
    showToast('प्रोफ़ाइल अपडेट अनुरोध सबमिट हो गया है (Admin approval pending)!');
  };

  // Handler: Active / Inactive Toggle for User (Admin & Co-Admin)
  const handleToggleUserActive = (id) => {
    const updated = toggleUserActive(contacts, id);
    setContacts(updated);
    setCoAdmins(getStoredCoAdmins());
    const target = updated.find(c => c.id === id);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    const isNowActive = target && (target.status === 'approved' || target.status === 'active');
    showToast(isNowActive ? 'कर्मचारी को सक्रिय (Active) कर दिया गया!' : 'कर्मचारी को निष्क्रिय (Inactive) कर दिया गया!');
  };

  // Handler: Block / Unblock User
  const handleToggleBlock = (id) => {
    const updated = toggleBlockOfficer(contacts, id);
    setContacts(updated);
    setCoAdmins(getStoredCoAdmins());
    const target = updated.find(c => c.id === id);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    showToast(target?.status === 'blocked' ? 'लॉगिन एवं प्रोफ़ाइल ब्लॉक की गई! मुख्य पैनल से हटा दिया गया।' : 'प्रोफ़ाइल अनब्लॉक कर दी गई!');
  };

  // Handler: District Transfer Workflow (Strict 2-tier approval chain)
  const handleRequestDistrictTransfer = (userId, toDistrict, reason) => {
    const updated = requestDistrictTransfer(contacts, userId, toDistrict, reason);
    setContacts(updated);
    if (currentUser && currentUser.id === userId) {
      const updatedUser = updated.find(c => c.id === userId);
      setCurrentUser(updatedUser);
      saveSession(updatedUser);
    }
    showToast('जनपद स्थानांतरण अनुरोध सबमिट हुआ! वर्तमान ज़िला Co-Admin समीक्षा करेंगे।');
  };

  const handleForwardDistrictTransfer = (userId, coAdminName) => {
    const updated = forwardDistrictTransferToAdmin(contacts, userId, coAdminName);
    setContacts(updated);
    showToast('स्थानांतरण अनुरोध मुख्यालय (Super Admin) को फ़ॉरवर्ड कर दिया गया!');
  };

  const handleApproveDistrictTransfer = (userId, adminName) => {
    const updated = approveDistrictTransferByAdmin(contacts, userId, adminName);
    setContacts(updated);
    setCoAdmins(getStoredCoAdmins());
    const target = updated.find(c => c.id === userId);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    if (currentUser && currentUser.id === userId) {
      const updatedUser = updated.find(c => c.id === userId);
      setCurrentUser(updatedUser);
      saveSession(updatedUser);
    }
    showToast('स्थानांतरण आधिकारिक रूप से स्वीकृत! कर्मचारी का नया जनपद लागू हुआ।');
  };

  const handleRejectDistrictTransfer = (userId) => {
    const updated = rejectDistrictTransfer(contacts, userId);
    setContacts(updated);
    if (currentUser && currentUser.id === userId) {
      const updatedUser = updated.find(c => c.id === userId);
      setCurrentUser(updatedUser);
      saveSession(updatedUser);
    }
    showToast('स्थानांतरण अनुरोध निरस्त/रद्द कर दिया गया।');
  };

  // Handler: Super Block User on Device Change violation (Requirement 3)
  const handleSuperBlockUser = (userId, updatedUser) => {
    setContacts(prev => {
      const next = prev.map(c => c.id === userId ? updatedUser : c);
      saveContacts(next);
      return next;
    });
    if (isFirebaseConfigured() && updatedUser) {
      saveFirestoreContact(updatedUser);
    }
  };

  // Handler: Restore Officer from Recycle Bin (Requirement 4 & 5)
  const handleRestoreContact = (restoredOfficer) => {
    if (!restoredOfficer) return;
    setContacts(prev => {
      const exists = prev.some(c => c.id === restoredOfficer.id);
      const next = exists 
        ? prev.map(c => c.id === restoredOfficer.id ? restoredOfficer : c)
        : [restoredOfficer, ...prev];
      saveContacts(next);
      return next;
    });
    if (isFirebaseConfigured()) {
      saveFirestoreContact(restoredOfficer);
    }
    showToast(`✅ ${restoredOfficer.name} को सक्रिय डायरेक्टरी में पुनर्स्थापित कर दिया गया!`);
  };

  // Handler: Delete Contact (Requirement 4 & 5: Moves to Recycle Bin for audit trail & frees for re-registration)
  const handleDeleteContact = (id) => {
    const targetOfficer = contacts.find(c => c.id === id);
    if (!targetOfficer) return;

    const confirmMsg = targetOfficer.isSuperBlocked
      ? `क्या आप सुपर ब्लॉक अधिकारी "${targetOfficer.name}" की पुरानी आईडी डिलीट करके रीसायकल बिन में भेजना चाहते हैं?\n(इससे उनका पुराना रिकॉर्ड रीसायकल बिन में सुरक्षित रहेगा और वे नए डिवाइस से नया पंजीकरण कर सकेंगे)`
      : `क्या आप अधिकारी "${targetOfficer.name}" को डिलीट करके रीसायकल बिन (Recycle Bin) में स्थानांतरित करना चाहते हैं?`;

    if (window.confirm(confirmMsg)) {
      // 1. Move old officer data to Recycle Bin
      const isSuperAdmin = currentUser?.role === 'admin';
      const recycledEntry = {
        ...targetOfficer,
        deletedAt: new Date().toISOString(),
        deletedBy: isSuperAdmin ? 'Super Admin (मुख्यालय)' : (currentUser?.name ? `${currentUser.name} (${currentUser.district || 'Co-Admin'})` : 'Admin'),
        deletedByRole: isSuperAdmin ? 'superadmin' : 'coadmin',
        deletionReason: targetOfficer.isSuperBlocked 
          ? 'डिवाइस परिवर्तन / सुपर ब्लॉक उपरांत पुनः पंजीकरण हेतु हटाया गया' 
          : 'एडमिन / Co-Admin द्वारा हटाया गया',
        originalRegisteredDevice: targetOfficer.registeredDevice || targetOfficer.currentDevice || null
      };

      saveRecycleBinItem(recycledEntry);
      saveRecycleBinItemToCloud(recycledEntry).catch(err => console.warn('Cloud recycle save warning:', err));

      // 2. Remove from active contacts
      const updated = deleteOfficerProfile(contacts, id);
      setContacts(updated);
      if (isFirebaseConfigured()) {
        deleteFirestoreContact(id);
      }
      showToast('✅ अधिकारी रिकॉर्ड सुरक्षित रूप से रीसायकल बिन (Recycle Bin) में भेज दिया गया!');
    }
  };

  // Handler: Password Reset (Admin & Co-Admin)
  const handleResetPassword = (userId, newPass) => {
    const updated = resetUserPassword(contacts, userId, newPass);
    setContacts(updated);
    showToast(`पासवर्ड रीसेट कर दिया गया (New Password: ${newPass})`);
  };

  // Handler: User Self Password Change
  const handleChangeMyPassword = (userId, newPass) => {
    const updated = resetUserPassword(contacts, userId, newPass);
    setContacts(updated);
    showToast('आपका पासवर्ड सफलतापूर्वक बदल दिया गया है!');
  };

  // Handler: Bulk Excel Import
  const handleContactsImported = async (newContactsList) => {
    setContacts(newContactsList);
    const currentDistricts = getStoredDistricts();
    const currentPosts = getStoredPosts();
    const currentOffices = getStoredOffices();
    setDistricts(currentDistricts);
    setPosts(currentPosts);
    setOffices(currentOffices);

    if (isFirebaseConfigured() && Array.isArray(newContactsList) && newContactsList.length > 0) {
      try {
        await syncAllContactsToFirestore(newContactsList);
        await saveFirestoreMasterConfig({
          districts: currentDistricts,
          posts: currentPosts,
          offices: currentOffices
        });
        showToast('✅ एक्सेल डेटा एवं मास्टर लिस्ट Firebase क्लाउड पर लाइव सिंक हो गया!');
      } catch (err) {
        console.warn('[Sync] Background cloud sync note:', err);
        showToast('⚠️ स्थानीय डेटाबेस अपडेट हुआ (क्लाउड सिंक बैकग्राउंड में पुनः प्रयास करेगा)');
      }
    } else {
      showToast('✅ एक्सेल शीट से डेटा स्थानीय डेटाबेस में सफलतापूर्वक अपडेट हुआ!');
    }
  };

  // Handler: Promote User to Co-Admin (Admin Only)
  const handlePromoteUserToCoAdmin = (userId, district) => {
    const { updatedContacts, updatedCoAdmins } = promoteUserToCoAdmin(contacts, coAdmins, userId, district);
    setContacts(updatedContacts);
    setCoAdmins(updatedCoAdmins);
    if (isFirebaseConfigured()) {
      saveFirestoreCoAdmins(updatedCoAdmins);
      const promotedUser = updatedContacts.find(c => c.id === userId);
      if (promotedUser) saveFirestoreContact(promotedUser);
    }
    showToast('कर्मचारी को सफलतापूर्वक ज़िला Co-Admin नियुक्त किया गया!');
  };

  // Handler: Revoke Co-Admin (Admin Only)
  const handleRevokeCoAdmin = (coAdminId) => {
    if (window.confirm('क्या आप इस Co-Admin पद को हटाना चाहते हैं?')) {
      const { updatedContacts, updatedCoAdmins } = revokeCoAdmin(contacts, coAdmins, coAdminId);
      setContacts(updatedContacts);
      setCoAdmins(updatedCoAdmins);
      if (isFirebaseConfigured()) {
        saveFirestoreCoAdmins(updatedCoAdmins);
      }
      showToast('Co-Admin पद वापस ले लिया गया।');
    }
  };

  // Handler: Co-Admin Active / Inactive Toggle (Admin Only)
  const handleToggleCoAdminActive = (id) => {
    const updated = toggleCoAdminActive(id);
    setCoAdmins(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreCoAdmins(updated);
    }
    const target = updated.find(c => c.id === id);
    const isNowActive = target.status !== 'inactive';
    showToast(isNowActive ? 'Co-Admin को सक्रिय (Active) किया गया!' : 'Co-Admin को निष्क्रिय (Inactive) किया गया!');
  };

  // Handler: Co-Admin Management (Super Admin only)
  const handleAddCoAdmin = (data) => {
    const updated = addCoAdmin(data);
    setCoAdmins(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreCoAdmins(updated);
    }
    showToast(`नया ज़िला Co-Admin (${data.district}) सफलतापूर्वक जोड़ा गया!`);
  };

  const handleDeleteCoAdmin = (id) => {
    if (window.confirm('क्या आप इस ज़िला Co-Admin को हटाना चाहते हैं?')) {
      const updated = deleteCoAdmin(id);
      setCoAdmins(updated);
      if (isFirebaseConfigured()) {
        saveFirestoreCoAdmins(updated);
      }
      showToast('Co-Admin हटा दिया गया।');
    }
  };

  // Dynamic Master Data Handlers
  const handleAddPost = (postName) => {
    const updated = addPost(postName);
    setPosts(updated);
    if (isFirebaseConfigured()) {
      saveFirestorePosts(updated);
    }
    showToast(`नया पद "${postName}" जोड़ा गया!`);
  };

  const handleEditPost = (oldName, newName) => {
    const updated = editPost(oldName, newName);
    setPosts(updated);
    setContacts(getStoredContacts());
    if (isFirebaseConfigured()) {
      saveFirestorePosts(updated);
    }
    showToast(`पद "${oldName}" को बदलकर "${newName}" किया गया!`);
  };

  const handleDeletePost = (postName) => {
    const updated = deletePost(postName);
    setPosts(updated);
    if (isFirebaseConfigured()) {
      saveFirestorePosts(updated);
    }
    showToast(`पद "${postName}" हटा दिया गया।`);
  };

  const handleAddOffice = (officeName, districtName = '') => {
    const updated = addOffice(officeName, districtName);
    setOffices(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreOffices(updated);
    }
    showToast(`नया कार्यालय/थाना "${officeName}" (${districtName}) जोड़ा गया!`);
  };

  const handleEditOffice = (officeIdOrName, newName, newDistrict = null) => {
    const updated = editOffice(officeIdOrName, newName, newDistrict);
    setOffices(updated);
    setContacts(getStoredContacts());
    if (isFirebaseConfigured()) {
      saveFirestoreOffices(updated);
    }
    showToast(`कार्यालय/थाना "${newName}" सफलतापूर्वक संशोधित किया गया!`);
  };

  const handleDeleteOffice = (officeIdOrName) => {
    const updated = deleteOffice(officeIdOrName);
    setOffices(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreOffices(updated);
    }
    showToast(`कार्यालय/थाना सूची से हटाया गया।`);
  };

  const handleAddDistrict = (distName) => {
    const updated = addDistrict(distName);
    setDistricts(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreDistricts(updated);
    }
    showToast(`नया ज़िला "${distName}" जोड़ा गया!`);
  };

  const handleEditDistrict = (oldName, newName) => {
    const updated = editDistrict(oldName, newName);
    setDistricts(updated);
    setContacts(getStoredContacts());
    setCoAdmins(getStoredCoAdmins());
    setOffices(getStoredOffices());
    if (isFirebaseConfigured()) {
      saveFirestoreDistricts(updated);
    }
    showToast(`ज़िला "${oldName}" को बदलकर "${newName}" किया गया!`);
  };

  const handleDeleteDistrict = (distName) => {
    const updated = deleteDistrict(distName);
    setDistricts(updated);
    if (isFirebaseConfigured()) {
      saveFirestoreDistricts(updated);
    }
    showToast(`ज़िला "${distName}" हटा दिया गया।`);
  };

  const handleLoadAllDistricts = () => {
    const list = loadAll75Districts();
    setDistricts(list);
    if (isFirebaseConfigured()) {
      saveFirestoreDistricts(list);
    }
    showToast('✅ उ.प्र. के सभी 75 जनपद सफलतापूर्वक लोड हो गए।');
  };

  const handleLoadStandardPosts = () => {
    const list = loadStandardPolicePosts();
    setPosts(list);
    if (isFirebaseConfigured()) {
      saveFirestorePosts(list);
    }
    showToast('✅ पुलिस विभाग के सभी मानक पद सफलतापूर्वक लोड हो गए।');
  };

  const handleResetMasterData = () => {
    const res = resetMasterDataToClean();
    setDistricts(res.districts);
    setPosts(res.posts);
    setOffices(res.offices);
    if (isFirebaseConfigured()) {
      saveFirestoreDistricts(res.districts);
      saveFirestorePosts(res.posts);
      saveFirestoreOffices(res.offices);
    }
    showToast('🗑️ मास्टर डेटाबेस खाली (Zero) कर दिया गया।');
  };

  // ---------------- PEER-TO-PEER MESSAGE BOX & GROUP CHAT HANDLERS ----------------
  const handleOpenChatWithContact = async (targetContact) => {
    if (!currentUser) return;
    if (currentUser.id === targetContact.id) {
      showToast('यह आपकी स्वयं की प्रोफ़ाइल है। अन्य अधिकारियों के साथ संदेश भेजें।');
      return;
    }
    // Check if direct chat already exists
    const existing = chats.find(c => 
      c.type === 'direct' && 
      c.participants?.includes(currentUser.id) && 
      c.participants?.includes(targetContact.id)
    );

    if (existing) {
      removeDeletedChatId(existing.id);
      setActiveChatId(existing.id);
    } else {
      // Initialize clean direct chat without auto-sending any message (Point 3)
      const targetChatId = `chat-p2p-${currentUser.id}-${targetContact.id}`;
      removeDeletedChatId(targetChatId);
      const newChatObj = {
        id: targetChatId,
        type: "direct",
        title: `${targetContact.name} (${targetContact.district || 'उत्तर प्रदेश'})`,
        participants: [currentUser.id, targetContact.id],
        district: targetContact.district || 'उत्तर प्रदेश',
        lastMessage: 'चैट शुरू हुई',
        lastUpdated: new Date().toISOString(),
        messages: []
      };
      const updatedChats = [newChatObj, ...chats];
      setChats(updatedChats);
      saveChats(updatedChats);
      setActiveChatId(targetChatId);

      if (isFirebaseConfigured()) {
        saveFirestoreChat(newChatObj);
      }
    }
    setIsChatModalOpen(true);
  };

  const handleSendDirectMessage = async (sender, recipient, text, file = null) => {
    const { updatedChats, targetChatId } = sendDirectMessage(chats, contacts, sender, recipient, text, file);
    setChats(updatedChats);
    if (targetChatId) setActiveChatId(targetChatId);
    setNotifications(getStoredNotifications());
    showToast(`संदेश प्रेषित! प्राप्तकर्ता ${recipient.name} को नया संदेश नोटिफिकेशन भेजा गया।`);

    if (isFirebaseConfigured() && targetChatId) {
      const updatedChat = updatedChats.find(c => c.id === targetChatId);
      if (updatedChat) {
        saveFirestoreChat(updatedChat);
      }
    }
  };

  const handleSendGroupMessage = async (groupId, sender, text, file = null) => {
    const updated = sendGroupMessage(chats, groupId, sender, text, file);
    setChats(updated);
    showToast('समूह संदेश प्रेषित!');

    if (isFirebaseConfigured() && groupId) {
      const updatedChat = updated.find(c => c.id === groupId);
      if (updatedChat) {
        saveFirestoreChat(updatedChat);
      }
    }
  };

  const handleAppendMessage = async (chatId, sender, text, file = null) => {
    const updated = appendMessageToChat(chats, chatId, sender, text, file);
    setChats(updated);
    setNotifications(getStoredNotifications());
    showToast('संदेश प्रेषित!');

    if (isFirebaseConfigured() && chatId) {
      const updatedChat = updated.find(c => c.id === chatId);
      if (updatedChat) {
        saveFirestoreChat(updatedChat);
      }
    }
  };

  const handleCreateGroupChat = async (groupTitle, participantIds, description = '') => {
    const { updatedChats, newGroupId } = createGroupChat(chats, currentUser, groupTitle, participantIds, description);
    removeDeletedChatId(newGroupId);
    setChats(updatedChats);
    setActiveChatId(newGroupId);
    showToast(`नया पुलिस समूह "${groupTitle}" सफलतापूर्वक बनाया गया!`);

    if (isFirebaseConfigured() && newGroupId) {
      const updatedChat = updatedChats.find(c => c.id === newGroupId);
      if (updatedChat) {
        saveFirestoreChat(updatedChat);
      }
    }
  };

  const handleAddGroupParticipants = async (groupId, newParticipantIds) => {
    if (!groupId || !newParticipantIds?.length) return;
    const { updatedChats, updatedChat } = addGroupParticipants(chats, groupId, newParticipantIds, currentUser, contacts);
    setChats(updatedChats);
    showToast('समूह में नए सदस्य सफलतापूर्वक जोड़े गए!');

    if (isFirebaseConfigured() && updatedChat) {
      saveFirestoreChat(updatedChat);
    }
  };

  const handleRemoveGroupParticipant = async (groupId, participantIdToRemove) => {
    if (!groupId || !participantIdToRemove) return;
    const { updatedChats, updatedChat } = removeGroupParticipant(chats, groupId, participantIdToRemove, currentUser, contacts);
    setChats(updatedChats);
    showToast('सदस्य को समूह से हटा दिया गया।');

    if (isFirebaseConfigured() && updatedChat) {
      saveFirestoreChat(updatedChat);
    }
  };

  const handleLeaveGroupChat = async (groupId) => {
    if (!groupId || !currentUser) return;
    const { updatedChats, updatedChat } = leaveGroupChat(chats, groupId, currentUser);
    setChats(updatedChats);
    setActiveChatId(null);
    showToast('आप समूह से बाहर हो गए हैं।');

    if (isFirebaseConfigured() && updatedChat) {
      saveFirestoreChat(updatedChat);
    }
  };

  const handleDeleteGroupChat = async (groupId) => {
    if (!groupId) return;
    const updatedChats = deleteGroupChat(chats, groupId);
    setChats(updatedChats);
    if (activeChatId === groupId) {
      setActiveChatId(null);
    }
    showToast('चैट सफलतापूर्वक हटा दी गई।');

    // Real-time Cloud Synchronization of deleted chat (Requirement 2)
    if (currentUser?.id) {
      addUserDeletedChatIdLocal(currentUser.id, groupId);
      const userDeletedList = getUserDeletedChatIds(currentUser.id);
      saveUserDeletedChatIds(currentUser.id, userDeletedList).catch(err => console.warn('Cloud deleted chats sync:', err));
    }

    if (isFirebaseConfigured()) {
      deleteFirestoreChat(groupId);
    }
  };

  const handleClearChatMessages = async (chatId) => {
    if (!chatId || !currentUser) return;
    const { updatedChats, updatedChat } = clearChatMessages(chats, chatId, currentUser.id);
    setChats(updatedChats);
    showToast('चैट संदेश सफलतापूर्वक साफ़ कर दिए गए (Chat Cleared)।');

    if (isFirebaseConfigured() && updatedChat) {
      saveFirestoreChat(updatedChat);
    }
  };

  const handleMarkChatAsRead = async (chatId) => {
    if (!currentUser || !chatId) return;
    const updated = markChatAsRead(chats, chatId, currentUser.id);
    if (updated !== chats) {
      setChats(updated);
      if (isFirebaseConfigured()) {
        markFirestoreChatAsRead(chatId, currentUser.id);
      }
    }
  };

  const handleUpdateUniformPhoto = (userId, photoBase64) => {
    const updatedContacts = updateUserUniformPhoto(contacts, userId, photoBase64);
    setContacts(updatedContacts);
    const target = updatedContacts.find(c => c.id === userId);
    if (isFirebaseConfigured() && target) {
      saveFirestoreContact(target);
    }
    if (currentUser && currentUser.id === userId) {
      const updatedUser = { 
        ...currentUser, 
        uniformPhoto: photoBase64, 
        uniformPhotoUploaded: true 
      };
      setCurrentUser(updatedUser);
      saveSession(updatedUser);
    }
    showToast('✅ वर्दी (यूनिफॉर्म) फोटो सत्यापित! ऐप का संचालन सक्रिय कर दिया गया है।');
  };

  // Handler: Notifications
  const handleAddNotification = (notifData) => {
    const updated = addNotification(notifData);
    setNotifications(updated);
    showToast('सूचना सफलतापूर्वक जारी कर दी गई!');
  };

  const handleDeleteNotification = (id) => {
    const updated = deleteNotification(id);
    setNotifications(updated);
    showToast('सूचना हटा दी गई।');
  };

  // Handler: Phone Access Permission Response
  const handleRespondPhonePermission = (requestId, status) => {
    const updated = respondPhonePermission(requestId, status);
    setPhonePermissions(updated);
    showToast(status === 'approved' ? '✅ फोन नंबर देखने की अनुमति स्वीकृत कर दी गई!' : '❌ अनुरोध अस्वीकार कर दिया गया।');
  };

  // Handler: Feedback
  const handleSubmitFeedback = (data) => {
    const updated = addFeedback(data);
    setFeedbacks(updated);
    showToast('फीडबैक सबमिट कर दिया गया है!');
  };

  const handleToggleResolveFeedback = (id) => {
    const updated = toggleResolveFeedback(id);
    setFeedbacks(updated);
    showToast('फीडबैक स्थिति अद्यतन की गई!');
  };

  const handleSaveTerms = (updatedTerms) => {
    const saved = saveTerms(updatedTerms);
    setTerms(saved);
    showToast('📜 शासकीय गोपनीयता नियम व शर्तें सफलतापूर्वक अपडेट हुईं!');
  };

  const handleAddPolicy = (newPolicyData) => {
    const updated = addCustomPolicy(newPolicyData);
    setPolicies(updated);
    showToast('✅ नई नीति / कस्टम लिंक सफलतापूर्वक जोड़ा गया!');
  };

  const handleEditPolicy = (policyId, updatedData) => {
    const updated = editPolicyItem(policyId, updatedData);
    setPolicies(updated);
    showToast('✅ नीति / लिंक सामग्री सफलतापूर्वक अद्यतन हुई!');
  };

  const handleDeletePolicy = (policyId) => {
    const updated = deleteCustomPolicyItem(policyId);
    setPolicies(updated);
    showToast('🗑️ कस्टम लिंक हटा दिया गया!');
  };

  // Demo Data Reset
  const handleResetData = () => {
    if (window.confirm('क्या आप डिफ़ॉल्ट पुलिस संपर्क, Co-Admins, सूचनाएं, चैट एवं ग्रुप्स रीसेट करना चाहते हैं?')) {
      const res = resetToDefaultContacts();
      setContacts(res.contacts);
      setCoAdmins(res.coAdmins);
      setNotifications(res.notifications);
      setFeedbacks(res.feedbacks);
      setChats(res.chats);
      setPosts(res.posts);
      setOffices(res.offices);
      setDistricts(res.districts);
      showToast('डिफ़ॉल्ट डेटा रीसेट हो गया है!');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    if ((currentUser?.role === 'user' || currentUser?.role === 'co_admin') && userDistrictScope === 'my_district') {
      setSelectedDistrict(currentUser.district || '');
    } else {
      setSelectedDistrict('');
    }
    setSelectedPost('');
    setSelectedOffice('');
  };

  const handleSelectMyDistrict = () => {
    setUserDistrictScope('my_district');
    setSelectedDistrict(currentUser?.district || '');
    setSelectedPost('');
    setSelectedOffice('');
    setSearchQuery('');
    setIsFilterSidebarOpen(false);
  };

  const handleOpenFilterSidebar = () => {
    setUserDistrictScope('all');
    setIsFilterSidebarOpen(true);
  };

  const handleNavigateHome = () => {
    setIsChatModalOpen(false);
    setActiveChatId(null);
    setIsNotifsModalOpen(false);
    setIsFeedbackModalOpen(false);
    setIsAdminModalOpen(false);
    setIsAdmin2FAModalOpen(false);
    setIsProfileModalOpen(false);
    setIsEditModalOpen(false);
    setEditingContact(null);
    setIsMenuDrawerOpen(false);
    setIsPolicyModalOpen(false);
    setIsFirebaseSetupOpen(false);
    setIsRegisterModalOpen(false);
    setIsLoginModalOpen(false);
    setIsPhotoGateDismissed(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasActiveFilters = Boolean(
    searchQuery || 
    (selectedDistrict && (currentUser?.role === 'admin' || userDistrictScope === 'all' || selectedDistrict !== currentUser?.district)) || 
    selectedPost || 
    selectedOffice
  );

  // Scoped pending counts
  const pendingCount = useMemo(() => {
    if (currentUser?.role === 'co_admin') {
      return contacts.filter(c => c.status === 'pending' && c.district === currentUser.district).length;
    }
    return contacts.filter(c => c.status === 'pending').length;
  }, [contacts, currentUser]);

  const approvedCount = useMemo(() => {
    return contacts.filter(c => c.status === 'approved' || c.status === 'active').length;
  }, [contacts]);

  const unreadMessagesCount = getUnreadMessagesCountForUser(chats, currentUser?.id);

  // Missed calls count strictly for Call tab badge
  const missedCallsCount = useMemo(() => {
    return getUnseenMissedCallsCount(currentUser);
  }, [currentUser, callLogs]);

  // Official notifications count strictly for Notifications tab badge (excluding chats & calls)
  const officialNotifCount = useMemo(() => {
    if (!currentUser) return 0;
    const isAdmin = currentUser.role === 'admin';
    const isCoAdmin = currentUser.role === 'co_admin';
    return (notifications || []).filter(n => {
      // Exclude direct messages and missed calls from official notices count
      if (n.type === 'direct_message' || n.type === 'missed_call') return false;
      if (n.targetUserId || n.targetPno || n.targetPhone) {
        const match = (
          (n.targetUserId && (n.targetUserId === currentUser.id || n.targetUserId === currentUser.pno)) ||
          (n.targetPno && (n.targetPno === currentUser.pno || n.targetPno === currentUser.id)) ||
          (n.targetPhone && (n.targetPhone === currentUser.phone))
        );
        return match || isAdmin;
      }
      if (isCoAdmin && n.district !== currentUser.district && n.district !== 'सभी ज़िले (All Districts)') return false;
      if (currentUser.role === 'user' && n.district !== currentUser.district && n.district !== 'सभी ज़िले (All Districts)') return false;
      return true;
    }).length;
  }, [notifications, currentUser]);

  // Real-time unhandled missed calls for logged-in user
  const missedCallAlerts = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(n => n.type === 'missed_call' && n.targetUserId === currentUser.id);
  }, [notifications, currentUser]);

  // ---------------- SECURITY CHECK: MANDATORY LOGIN GATEWAY ----------------
  if (!currentUser) {
    return (
      <div className="app-container">
        {toastMessage && (
          <div className="toast-notice">
            <span>{toastMessage}</span>
          </div>
        )}

        <AuthGateway
          onLoginSuccess={handleLoginSuccess}
          onRegisterSubmit={handleRegistrationSubmit}
          contacts={contacts}
          coAdmins={coAdmins}
          posts={posts}
          districts={districts}
          offices={offices}
          terms={terms}
          onOpenPolicy={handleOpenPolicy}
        />

        {/* Policy Details Modals (Lazy) */}
        <Suspense fallback={null}>
          <PolicyModal
            isOpen={isPolicyModalOpen}
            activePolicy={activePolicyType}
            policies={policies}
            onClose={() => setIsPolicyModalOpen(false)}
          />
        </Suspense>
      </div>
    );
  }

  // ---------------- SECURITY CHECK 2: MANDATORY SERVICE TERMS ACCEPTANCE (POST-LOGIN) ----------------
  if (!isTermsAccepted) {
    return (
      <div className="app-container">
        {toastMessage && (
          <div className="toast-notice">
            <span>{toastMessage}</span>
          </div>
        )}
        <ServiceTermsScreen
          user={currentUser}
          terms={terms}
          onAccepted={handleTermsAccepted}
          onOpenPolicy={handleOpenPolicy}
        />
        <Suspense fallback={null}>
          <PolicyModal
            isOpen={isPolicyModalOpen}
            activePolicy={activePolicyType}
            policies={policies}
            onClose={() => setIsPolicyModalOpen(false)}
          />
        </Suspense>
      </div>
    );
  }

  // ---------------- SECURITY CHECK 3: POST-LOGIN PERMISSION ONBOARDING ----------------
  if (!isPermissionsCompleted) {
    return (
      <div className="app-container">
        {toastMessage && (
          <div className="toast-notice">
            <span>{toastMessage}</span>
          </div>
        )}
        <PermissionOnboardingScreen
          user={currentUser}
          onComplete={handlePermissionsCompleted}
        />
      </div>
    );
  }

  // ---------------- AUTHENTICATED USER DIRECTORY VIEW ----------------
  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Official Uttar Pradesh Police Top Header Bar */}
      <Header
        currentUser={currentUser}
        userDistrictScope={userDistrictScope}
        onSelectMyDistrict={handleSelectMyDistrict}
        onOpenFilterSidebar={handleOpenFilterSidebar}
        totalApprovedCount={approvedCount}
        pendingCount={pendingCount}
        notifCount={officialNotifCount}
        chatsCount={unreadMessagesCount}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onOpenAdmin={handleOpenAdminPanel}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenNotifications={() => setIsNotifsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenChat={() => setIsChatModalOpen(true)}
        onLogout={handleLogout}
        onResetData={handleResetMasterData}
        onOpenMenu={() => setIsMenuDrawerOpen(prev => !prev)}
        onNavigateHome={handleNavigateHome}
      />

      {/* Official Notification Permission Prompt Banner */}
      {currentUser && notificationPermission === 'default' && !isNotifBannerDismissed && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(30, 58, 138, 0.95), rgba(15, 23, 42, 0.98))',
          borderBottom: '1px solid rgba(196, 151, 86, 0.4)',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          fontSize: '0.82rem',
          color: '#f8fafc',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          position: 'sticky',
          top: 0,
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🔔</span>
            <span>
              <strong>महत्वपूर्ण अलर्ट्स:</strong> आपातकालीन पुलिस कॉल व आवश्यक विभागीय संदेश पाने हेतु नोटिफिकेशन चालू करें।
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={async () => {
                const res = await requestAppNotificationPermission();
                setNotificationPermission(res);
                if (res === 'granted') {
                  showToast('✅ पुलिस कॉल व संदेश नोटिफिकेशन सक्षम हो गए!');
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: '#fff',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              अनुमति दें
            </button>
            <button
              onClick={() => setIsNotifBannerDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 6px',
                fontSize: '0.9rem'
              }}
              title="बंद करें"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Uniform Photo Verification Gate (Dismissible to access home screen) */}
      {currentUser && currentUser.role === 'user' && !currentUser.uniformPhoto && !isPhotoGateDismissed && (
        <UniformPhotoGate 
          currentUser={currentUser}
          onSavePhoto={(photo) => handleUpdateUniformPhoto(currentUser.id, photo)}
          onLogout={handleLogout}
          onDismiss={() => setIsPhotoGateDismissed(true)}
        />
      )}

      {/* Subtle Anti-Screenshot & Screen Recording Security Watermark */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9995,
        overflow: 'hidden',
        display: 'flex',
        flexWrap: 'wrap',
        alignContent: 'space-around',
        justifyContent: 'space-around',
        opacity: 0.035,
        userSelect: 'none'
      }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{
            transform: 'rotate(-25deg)',
            fontSize: '1rem',
            fontWeight: 800,
            color: '#c49756',
            textAlign: 'center',
            padding: '2.5rem',
            whiteSpace: 'nowrap'
          }}>
            UP POLICE CONFIDENTIAL • {currentUser ? `${currentUser.name} (PNO: ${currentUser.pno || 'N/A'})` : 'OFFICIAL'} • SCREENSHOT / RECORDING STRICTLY PROHIBITED
          </div>
        ))}
      </div>



      {/* Real-time In-App Missed Call Alert Banner */}
      {missedCallAlerts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(185, 28, 28, 0.95), rgba(153, 27, 27, 0.98))',
          border: '1.5px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: '#fff',
              color: '#dc2626',
              borderRadius: '50%',
              padding: '8px',
              display: 'flex'
            }}>
              <PhoneMissed size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🚨 मिस्ड कॉल अलर्ट (Missed Call Alert)</span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '12px' }}>
                  {missedCallAlerts.length} कॉल छूटी
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', opacity: 0.95, marginTop: '2px' }}>
                {missedCallAlerts[0].content}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {missedCallAlerts[0].callerData && (
              <button
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
                onClick={() => {
                  callManager.startCall(currentUser, missedCallAlerts[0].callerData);
                }}
              >
                <PhoneCall size={14} />
                वापस कॉल करें (Call Back)
              </button>
            )}
            <button
              className="btn"
              style={{
                background: 'rgba(255,255,255,0.18)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.35)',
                padding: '6px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => handleDeleteNotification(missedCallAlerts[0].id)}
            >
              खारिज करें
            </button>
            {missedCallAlerts.length > 1 && (
              <button
                className="btn"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                onClick={() => setIsNotifsModalOpen(true)}
              >
                सभी {missedCallAlerts.length} देखें
              </button>
            )}
          </div>
        </div>
      )}

      {/* Multi-Criteria Search & Filter Left Sidebar Drawer (Requirement 2 & 3) */}
      <SearchFilters
        isOpen={isFilterSidebarOpen}
        onClose={() => setIsFilterSidebarOpen(false)}
        searchQuery={searchQuery}
        selectedDistrict={selectedDistrict}
        selectedPost={selectedPost}
        selectedOffice={selectedOffice}
        onExecuteSearch={handleExecuteSearch}
        districts={districts}
        posts={posts}
        offices={offices}
        currentUser={currentUser}
      />

      {/* Active Filter Strip on Main Screen */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(196, 151, 86, 0.08)',
          border: '1px solid var(--khaki-border, rgba(196,151,86,0.3))',
          borderRadius: '8px',
          padding: '6px 12px',
          margin: '0.4rem 0 0.8rem 0',
          fontSize: '0.8rem',
          color: '#e2e8f0',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--khaki-light, #dfb97e)', fontWeight: 700 }}>सक्रिय फ़िल्टर:</span>
            {selectedDistrict && <span className="pill" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>ज़िला: {selectedDistrict}</span>}
            {selectedPost && <span className="pill" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>पद: {selectedPost}</span>}
            {selectedOffice && <span className="pill" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>थाना: {selectedOffice}</span>}
            {searchQuery && <span className="pill" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>सर्च: "{searchQuery}"</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              type="button" 
              onClick={() => setIsFilterSidebarOpen(true)}
              style={{
                background: 'transparent',
                border: '1px solid var(--khaki-primary, #c49756)',
                color: 'var(--khaki-light, #dfb97e)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              फ़िल्टर बदलें
            </button>
            <button 
              type="button" 
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: '1px solid rgba(248,113,113,0.5)',
                color: '#f87171',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                cursor: 'pointer'
              }}
            >
              ✕ साफ़ करें
            </button>
          </div>
        </div>
      )}

      {/* Contact Cards Grid (Scoped by authenticated district - Max 10 cards displayed for load reduction) */}
      <ContactList
        contacts={displayedContacts}
        totalCount={filteredContacts.length}
        currentUser={currentUser}
        permissions={phonePermissions}
        presenceMap={presenceMap}
        onEditContact={handleStartEdit}
        onToggleBlockContact={handleToggleBlock}
        onToggleActiveContact={handleToggleUserActive}
        onPromoteCoAdminContact={(userId, district) => handlePromoteUserToCoAdmin(userId, district)}
        onRevokeCoAdminContact={handleRevokeCoAdmin}
        onDeleteContact={handleDeleteContact}
        onResetFilters={handleResetFilters}
        onOpenChatWithContact={handleOpenChatWithContact}
        onPermissionUpdated={() => setPhonePermissions(getStoredPhonePermissions())}
      />

      {/* Official Departmental Copyright Footer */}
      <TermsFooter onOpenPolicy={() => handleOpenPolicy('disclaimer')} />

      {/* Lazy-Loaded Modals Section */}
      <ErrorBoundary fallbackTitle="मॉड्यूल लोड करने में समस्या आई">
        <Suspense fallback={null}>
        {/* Police Message Box & Group Messaging Modal */}
        <MessageBoxModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        chats={chats}
        contacts={contacts}
        currentUser={currentUser}
        presenceMap={presenceMap}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        isFirebaseConnected={isFirebaseConnected}
        onOpenFirebaseSetup={() => setIsFirebaseSetupOpen(true)}
        onSendDirectMessage={handleSendDirectMessage}
        onSendGroupMessage={handleSendGroupMessage}
        onCreateGroupChat={handleCreateGroupChat}
        onAddGroupParticipants={handleAddGroupParticipants}
        onRemoveGroupParticipant={handleRemoveGroupParticipant}
        onLeaveGroupChat={handleLeaveGroupChat}
        onDeleteGroupChat={handleDeleteGroupChat}
        onClearChatMessages={handleClearChatMessages}
        onAppendMessage={handleAppendMessage}
        onMarkChatAsRead={handleMarkChatAsRead}
        onStartEmptyDirectChat={handleOpenChatWithContact}
      />

      {/* Cloudflare R2 Cloud Setup Modal */}
      <FirebaseSetupModal
        isOpen={isFirebaseSetupOpen}
        onClose={() => {
          setIsFirebaseSetupOpen(false);
          setIsFirebaseConnected(isFirebaseConfigured());
        }}
        currentUser={currentUser}
        currentChats={chats}
        onSyncSuccess={() => {
          setIsFirebaseConnected(isFirebaseConfigured());
          showToast('🎉 Cloudflare R2 लाइव सिंक सक्रिय!');
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onOpenRegister={(prefilledPno) => {
          setRegisterPrefillPno(prefilledPno);
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
        contacts={contacts}
        coAdmins={coAdmins}
      />

      {/* Employee Self-Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => {
          setIsRegisterModalOpen(false);
          setRegisterPrefillPno('');
        }}
        onSubmitRegistration={handleRegistrationSubmit}
        districts={districts}
        posts={posts}
        offices={offices}
        initialPno={registerPrefillPno}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        presenceMap={presenceMap}
        onUpdateProfileRequest={handleUserProfileUpdateRequest}
        onChangePassword={handleChangeMyPassword}
        onUpdateUniformPhoto={handleUpdateUniformPhoto}
        onRequestDistrictTransfer={handleRequestDistrictTransfer}
        onCancelDistrictTransfer={handleRejectDistrictTransfer}
        districts={districts}
        offices={offices}
        onLogout={handleLogout}
        onOpenFeedback={() => {
          setIsProfileModalOpen(false);
          setIsFeedbackModalOpen(true);
        }}
      />

      {/* Admin / Co-Admin Control Portal */}
      <ErrorBoundary fallbackTitle="एडमिन नियंत्रण कक्ष लोड करने में समस्या आई">
        <AdminPanel
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          initialTab={adminInitialTab}
          contacts={contacts}
          currentUser={currentUser}
          coAdmins={coAdmins}
          posts={posts}
          offices={offices}
          districts={districts}
          terms={terms}
          onSaveTerms={handleSaveTerms}
          policies={policies}
          onAddPolicy={handleAddPolicy}
          onEditPolicy={handleEditPolicy}
          onDeletePolicy={handleDeletePolicy}
          onApprove={handleApproveContact}
          onReject={handleRejectContact}
          onEditContact={handleStartEdit}
          onToggleBlock={handleToggleBlock}
          onToggleUserActive={handleToggleUserActive}
          onDeleteContact={handleDeleteContact}
          onRestoreContact={handleRestoreContact}
          onContactsImported={handleContactsImported}
          onResetPassword={handleResetPassword}
          onAddCoAdmin={handleAddCoAdmin}
          onDeleteCoAdmin={handleDeleteCoAdmin}
          onToggleCoAdminActive={handleToggleCoAdminActive}
          onPromoteUserToCoAdmin={handlePromoteUserToCoAdmin}
          onRevokeCoAdmin={handleRevokeCoAdmin}
          onForwardDistrictTransfer={handleForwardDistrictTransfer}
          onApproveDistrictTransfer={handleApproveDistrictTransfer}
          onRejectDistrictTransfer={handleRejectDistrictTransfer}
          onAddPost={handleAddPost}
          onEditPost={handleEditPost}
          onDeletePost={handleDeletePost}
          onAddOffice={handleAddOffice}
          onEditOffice={handleEditOffice}
          onDeleteOffice={handleDeleteOffice}
          onAddDistrict={handleAddDistrict}
          onEditDistrict={handleEditDistrict}
          onDeleteDistrict={handleDeleteDistrict}
          onLoadAllDistricts={handleLoadAllDistricts}
          onLoadStandardPosts={handleLoadStandardPosts}
          onResetMasterData={handleResetMasterData}
          isFirebaseConnected={isFirebaseConnected}
          onOpenFirebaseSetup={() => setIsFirebaseSetupOpen(true)}
        />
      </ErrorBoundary>

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotifsModalOpen}
        onClose={() => setIsNotifsModalOpen(false)}
        notifications={notifications}
        currentUser={currentUser}
        onAddNotification={handleAddNotification}
        onDeleteNotification={handleDeleteNotification}
        phonePermissions={phonePermissions}
        onRespondPhonePermission={handleRespondPhonePermission}
        onStartCall={(targetOfficer) => callManager.startCall(currentUser, targetOfficer)}
        onOpenChat={(chatId) => {
          setIsNotifsModalOpen(false);
          if (chatId) setActiveChatId(chatId);
          setIsChatModalOpen(true);
        }}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        feedbacks={feedbacks}
        currentUser={currentUser}
        onSubmitFeedback={handleSubmitFeedback}
        onToggleResolveFeedback={handleToggleResolveFeedback}
      />

      {/* Edit Profile Modal */}
      <EditContactModal
        contact={editingContact}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveEdit}
        posts={posts}
        districts={districts}
        offices={offices}
      />

      {/* In-App Peer-to-Peer Voice Call Active/Ringing Screen (Max 5 mins, WebRTC) */}
      <ActiveCallModal
        currentUser={currentUser}
        onCallEnded={() => {
          setCallLogs(getStoredCallLogs());
        }}
      />

      {/* WhatsApp / Phone Style Call History & Recent Calls Modal */}
      <RecentCallsModal
        isOpen={isCallHistoryModalOpen}
        onClose={() => setIsCallHistoryModalOpen(false)}
        currentUser={currentUser}
        callLogs={callLogs}
        contacts={contacts}
        presenceMap={presenceMap}
        onDeleteCall={(callId) => {
          const updated = deleteCallLog(callId);
          setCallLogs(updated);
          deleteCallHistoryFromCloudflare(currentUser?.id, callId, false);
          showToast('कॉल रिकॉर्ड हटा दिया गया');
        }}
        onClearAllCalls={() => {
          const updated = clearCallLogs();
          setCallLogs(updated);
          deleteCallHistoryFromCloudflare(currentUser?.id, null, true);
          showToast('पूरी कॉल हिस्ट्री साफ़ कर दी गई');
        }}
        onStartCall={(officer) => {
          callManager.startCall(currentUser, officer);
        }}
        onOpenChatWithContact={(officer) => {
          const targetContact = contacts.find(c => c.id === officer.id) || officer;
          handleOpenChat(targetContact);
        }}
      />

      {/* Admin / Co-Admin 2FA Security Gate */}
      <Admin2FAModal
        isOpen={isAdmin2FAModalOpen}
        currentUser={currentUser}
        onClose={() => setIsAdmin2FAModalOpen(false)}
        onSuccess={handle2FASuccess}
      />

      {/* Official Government Policy Documents Modal */}
      <PolicyModal
        isOpen={isPolicyModalOpen}
        activePolicy={activePolicyType}
        policies={policies}
        canEdit={currentUser?.role === 'admin'}
        onOpenAdminPolicyEdit={handleOpenAdminPanel}
        onClose={() => setIsPolicyModalOpen(false)}
      />
        </Suspense>
      </ErrorBoundary>

      {/* Slide-over Clean Role-based Navigation Drawer */}
      <HeaderMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        currentUser={currentUser}
        policies={policies}
        pendingCount={pendingCount}
        notifCount={officialNotifCount}
        chatsCount={unreadMessagesCount}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAdmin={handleOpenAdminPanel}
        onOpenChat={() => setIsChatModalOpen(true)}
        onOpenNotifications={() => setIsNotifsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenPolicy={handleOpenPolicy}
        onLogout={handleLogout}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onTriggerBackup={() => {
          createBackupSlot('मैन्युअल बैकअप (Manual Backup)');
          showToast('✅ 6-घंटे का सुरक्षित बैकअप स्लॉट तैयार हो गया!');
        }}
      />

      {/* PWA 1-Click Install Banner for Mobile Devices */}
      <PWAInstallPrompt />

      {/* Sleek Mobile Bottom Navigation Bar (Native App Feel) */}
      <MobileBottomNav
        currentUser={currentUser}
        unreadMessagesCount={unreadMessagesCount}
        missedCallsCount={missedCallsCount}
        notifCount={officialNotifCount}
        pendingCount={pendingCount}
        onOpenChat={() => {
          setIsNotifsModalOpen(false);
          setIsCallHistoryModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsChatModalOpen(true);
        }}
        onOpenCallHistory={() => {
          setIsChatModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          markCallLogsAsSeen(currentUser);
          setCallLogs(getStoredCallLogs());
          setIsCallHistoryModalOpen(true);
        }}
        onOpenNotifications={() => {
          setIsChatModalOpen(false);
          setIsCallHistoryModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsNotifsModalOpen(true);
        }}
        onOpenAdmin={() => {
          setIsChatModalOpen(false);
          setIsCallHistoryModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          handleOpenAdminPanel();
        }}
        onOpenProfile={() => {
          setIsChatModalOpen(false);
          setIsCallHistoryModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsProfileModalOpen(true);
        }}
        onOpenMenu={() => {
          setIsChatModalOpen(false);
          setIsCallHistoryModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(prev => !prev);
        }}
        onNavigateHome={() => {
          setIsCallHistoryModalOpen(false);
          handleNavigateHome();
        }}
        isChatModalOpen={isChatModalOpen}
        isCallHistoryModalOpen={isCallHistoryModalOpen}
        isNotifsModalOpen={isNotifsModalOpen}
        isAdminModalOpen={isAdminModalOpen}
        isProfileModalOpen={isProfileModalOpen}
        isMenuDrawerOpen={isMenuDrawerOpen}
      />
    </div>
  );
}
