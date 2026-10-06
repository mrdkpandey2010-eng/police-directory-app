import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import SearchFilters from './components/SearchFilters';
import ContactList from './components/ContactList';
import UniformPhotoGate from './components/UniformPhotoGate';
import AuthGateway from './components/AuthGateway';
import HeaderMenuDrawer from './components/HeaderMenuDrawer';
import MobileBottomNav from './components/MobileBottomNav';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { initNativeApp, setupHardwareBackButton } from './utils/nativeBridge';

// Dynamic / Lazy-loaded heavy modal dialogs for 60%+ smaller bundle & fast load speed
const RegistrationModal = lazy(() => import('./components/RegistrationModal'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const EditContactModal = lazy(() => import('./components/EditContactModal'));
const LoginModal = lazy(() => import('./components/LoginModal'));
const UserProfileModal = lazy(() => import('./components/UserProfileModal'));
const NotificationsModal = lazy(() => import('./components/NotificationsModal'));
const FeedbackModal = lazy(() => import('./components/FeedbackModal'));
const MessageBoxModal = lazy(() => import('./components/MessageBoxModal'));
const FirebaseSetupModal = lazy(() => import('./components/FirebaseSetupModal'));
const PolicyModal = lazy(() => import('./components/PolicyModal'));
const LoginDisclaimerModal = lazy(() => import('./components/LoginDisclaimerModal'));
const Admin2FAModal = lazy(() => import('./components/Admin2FAModal'));
const ActiveCallModal = lazy(() => import('./components/ActiveCallModal'));
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
  processOfflineSyncQueue
} from './utils/firebase';
import { 
  getStoredContacts, 
  loadContactsFromPermanentStorage,
  saveContacts,
  getStoredCoAdmins,
  getStoredNotifications,
  getStoredFeedbacks,
  getStoredChats,
  saveChats,
  getStoredSession,
  saveSession,
  getStoredPosts,
  getStoredOffices,
  getStoredDistricts,
  addPost,
  editPost,
  deletePost,
  addOffice,
  editOffice,
  deleteOffice,
  addDistrict,
  editDistrict,
  deleteDistrict,
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
  deleteCustomPolicyItem
} from './utils/storage';
import TermsFooter from './components/TermsFooter';
import { MapPin, Shield, Search, Lock, Menu, ShieldCheck, Eye, PhoneCall, PhoneMissed } from 'lucide-react';
import { callManager } from './utils/webrtc';

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [coAdmins, setCoAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [chats, setChats] = useState([]);
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

  // Modals
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdmin2FAModalOpen, setIsAdmin2FAModalOpen] = useState(false);
  const [is2FAVerifiedThisSession, setIs2FAVerifiedThisSession] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotifsModalOpen, setIsNotifsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isFirebaseSetupOpen, setIsFirebaseSetupOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(isFirebaseConfigured());

  // Policy Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activePolicyType, setActivePolicyType] = useState('disclaimer');

  // Post-Login Mandatory Disclaimer Gate
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const [disclaimerAgreed, setDisclaimerAgreed] = useState(false);

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

    // Check if user session already exists and is within 30 minutes of activity
    const savedUser = getStoredSession();
    const lastActiveStr = localStorage.getItem('police_last_activity_time');
    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : 0;
    const isSessionExpired = lastActive && (Date.now() - lastActive > 30 * 60 * 1000);

    if (savedUser && !isSessionExpired) {
      setCurrentUser(savedUser);
      localStorage.setItem('police_last_activity_time', String(Date.now()));
      if (savedUser.role === 'user') {
        setSelectedDistrict(savedUser.district || '');
      }
      const agreed = sessionStorage.getItem(`police_disclaimer_agreed_${savedUser.id}`) === 'true';
      if (!agreed) {
        setIsDisclaimerModalOpen(true);
        setDisclaimerAgreed(false);
      } else {
        setDisclaimerAgreed(true);
      }
    } else {
      if (savedUser && isSessionExpired) {
        saveSession(null);
      }
      // Mandatory front screen login wall
      setCurrentUser(null);
    }

    return () => {
      cleanupBackButton();
      clearInterval(backupInterval);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // ---------------- AUTO LOGOUT SESSION (30 MINUTES INACTIVITY) ----------------
  useEffect(() => {
    if (!currentUser) return;

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const ACTIVITY_KEY = 'police_last_activity_time';

    const updateActivity = () => {
      localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    };

    updateActivity();

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => {
      updateActivity();
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Inactivity checker interval (runs every 15 seconds)
    const checkInterval = setInterval(() => {
      const lastActiveStr = localStorage.getItem(ACTIVITY_KEY);
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(checkInterval);
        handleLogout();
        alert('⏱️ सुरक्षा सत्र समाप्त (Session Expired):\n30 मिनट तक कोई गतिविधि न होने के कारण सुरक्षा नियमावली के अंतर्गत आपका सत्र स्वतः समाप्त (Auto Logout) कर दिया गया है।\nकृपया पुनः लॉगिन करें।');
      }
    }, 15000);

    return () => {
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [currentUser]);

  // ---------------- FIRESTORE CONTACTS REAL-TIME SYNC (PERMANENT RETENTION) ----------------
  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    if (!isConfigured) return;

    const unsubscribe = subscribeToFirestoreContacts((cloudContacts) => {
      if (!Array.isArray(cloudContacts) || cloudContacts.length === 0) return;

      setContacts((prevContacts) => {
        const contactMap = new Map();
        const localList = (prevContacts && prevContacts.length > 0) ? prevContacts : getStoredContacts();
        localList.forEach(c => {
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

  // Listen to real-time chat updates from Firebase Firestore
  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    setIsFirebaseConnected(isConfigured);
    if (!isConfigured) return;

    const unsubscribe = subscribeToFirestoreChats((cloudChats) => {
      if (!Array.isArray(cloudChats) || cloudChats.length === 0) return;

      setChats((prevChats) => {
        const mergedMap = new Map();
        (prevChats || []).forEach((c) => mergedMap.set(c.id, c));

        let hasNewIncoming = false;

        cloudChats.forEach((cloudChat) => {
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

            if (cloudCount > localCount || isCloudNewer) {
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

  // Update current user session on login
  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    saveSession(userObj);
    localStorage.setItem('police_last_activity_time', String(Date.now()));
    if (userObj.role === 'user') {
      setUserDistrictScope('my_district');
      setSelectedDistrict(userObj.district || '');
    } else if (userObj.role === 'co_admin') {
      setSelectedDistrict(userObj.district || '');
    } else {
      setSelectedDistrict('');
    }

    // Check mandatory post-login disclaimer
    const alreadyAgreed = sessionStorage.getItem(`police_disclaimer_agreed_${userObj.id}`) === 'true';
    if (!alreadyAgreed) {
      setIsDisclaimerModalOpen(true);
      setDisclaimerAgreed(false);
    } else {
      setIsDisclaimerModalOpen(false);
      setDisclaimerAgreed(true);
    }

    showToast(`सफलतापूर्वक लॉगिन: ${userObj.name} (${userObj.role === 'admin' ? 'Super Admin' : userObj.role === 'co_admin' ? `Co-Admin ${userObj.district}` : 'User'})`);
  };

  const handleAgreeDisclaimer = () => {
    if (currentUser) {
      sessionStorage.setItem(`police_disclaimer_agreed_${currentUser.id}`, 'true');
    }
    setDisclaimerAgreed(true);
    setIsDisclaimerModalOpen(false);
    showToast('✅ आपने आधिकारिक अस्वीकरण एवं सेवा शर्तों को स्वीकार कर लिया है।');
  };

  const handleOpenAdminPanel = () => {
    const cfg = getStored2FAConfig();
    if (cfg.enabled && !is2FAVerifiedThisSession) {
      setIsAdmin2FAModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  const handle2FASuccess = () => {
    setIs2FAVerifiedThisSession(true);
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

      // Co-Admin: Strictly scoped to their posted district
      if (currentUser?.role === 'co_admin') {
        if (c.district !== currentUser.district) return false;
      }

      // Regular Employee User:
      if (currentUser?.role === 'user') {
        // If in "केवल मेरा जनपद" mode, strictly show their district
        if (userDistrictScope === 'my_district') {
          if (c.district !== currentUser.district) return false;
        }
      }

      // Explicit District Filter dropdown
      if (selectedDistrict && c.district !== selectedDistrict) {
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
  }, [contacts, searchQuery, selectedDistrict, selectedPost, selectedOffice, currentUser, userDistrictScope]);

  // Handler: Self Registration
  const handleRegistrationSubmit = (formData) => {
    const { updatedList, newOfficer } = registerNewOfficer(contacts, formData);
    setContacts(updatedList);
    if (isFirebaseConfigured() && newOfficer) {
      saveFirestoreContact(newOfficer);
    }
    showToast('पंजीकरण सबमिट हो गया है! Admin / Co-Admin Approval के बाद प्रोफ़ाइल एक्टिव होगी।');
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

  // Handler: Delete Contact
  const handleDeleteContact = (id) => {
    if (window.confirm('क्या आप इस संपर्क को हमेशा के लिए डिलीट करना चाहते हैं?')) {
      const updated = deleteOfficerProfile(contacts, id);
      setContacts(updated);
      if (isFirebaseConfigured()) {
        deleteFirestoreContact(id);
      }
      showToast('संपर्क डिलीट कर दिया गया!');
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
  const handleContactsImported = (newContactsList) => {
    setContacts(newContactsList);
    showToast('एक्सेल शीट से डेटा सफलतापूर्वक अपडेट किया गया!');
  };

  // Handler: Promote User to Co-Admin (Admin Only)
  const handlePromoteUserToCoAdmin = (userId, district) => {
    const { updatedContacts, updatedCoAdmins } = promoteUserToCoAdmin(contacts, coAdmins, userId, district);
    setContacts(updatedContacts);
    setCoAdmins(updatedCoAdmins);
    showToast('कर्मचारी को सफलतापूर्वक ज़िला Co-Admin नियुक्त किया गया!');
  };

  // Handler: Revoke Co-Admin (Admin Only)
  const handleRevokeCoAdmin = (coAdminId) => {
    if (window.confirm('क्या आप इस Co-Admin पद को हटाना चाहते हैं?')) {
      const { updatedContacts, updatedCoAdmins } = revokeCoAdmin(contacts, coAdmins, coAdminId);
      setContacts(updatedContacts);
      setCoAdmins(updatedCoAdmins);
      showToast('Co-Admin पद वापस ले लिया गया।');
    }
  };

  // Handler: Co-Admin Active / Inactive Toggle (Admin Only)
  const handleToggleCoAdminActive = (id) => {
    const updated = toggleCoAdminActive(id);
    setCoAdmins(updated);
    const target = updated.find(c => c.id === id);
    const isNowActive = target.status !== 'inactive';
    showToast(isNowActive ? 'Co-Admin को सक्रिय (Active) किया गया!' : 'Co-Admin को निष्क्रिय (Inactive) किया गया!');
  };

  // Handler: Co-Admin Management (Super Admin only)
  const handleAddCoAdmin = (data) => {
    const updated = addCoAdmin(data);
    setCoAdmins(updated);
    showToast(`नया ज़िला Co-Admin (${data.district}) सफलतापूर्वक जोड़ा गया!`);
  };

  const handleDeleteCoAdmin = (id) => {
    if (window.confirm('क्या आप इस ज़िला Co-Admin को हटाना चाहते हैं?')) {
      const updated = deleteCoAdmin(id);
      setCoAdmins(updated);
      showToast('Co-Admin हटा दिया गया।');
    }
  };

  // Dynamic Master Data Handlers
  const handleAddPost = (postName) => {
    const updated = addPost(postName);
    setPosts(updated);
    showToast(`नया पद "${postName}" जोड़ा गया!`);
  };

  const handleEditPost = (oldName, newName) => {
    const updated = editPost(oldName, newName);
    setPosts(updated);
    setContacts(getStoredContacts());
    showToast(`पद "${oldName}" को बदलकर "${newName}" किया गया!`);
  };

  const handleDeletePost = (postName) => {
    const updated = deletePost(postName);
    setPosts(updated);
    showToast(`पद "${postName}" हटा दिया गया।`);
  };

  const handleAddOffice = (officeName, districtName = 'लखनऊ') => {
    const updated = addOffice(officeName, districtName);
    setOffices(updated);
    showToast(`नया कार्यालय/थाना "${officeName}" (${districtName}) जोड़ा गया!`);
  };

  const handleEditOffice = (officeIdOrName, newName, newDistrict = null) => {
    const updated = editOffice(officeIdOrName, newName, newDistrict);
    setOffices(updated);
    setContacts(getStoredContacts());
    showToast(`कार्यालय/थाना "${newName}" सफलतापूर्वक संशोधित किया गया!`);
  };

  const handleDeleteOffice = (officeIdOrName) => {
    const updated = deleteOffice(officeIdOrName);
    setOffices(updated);
    showToast(`कार्यालय/थाना सूची से हटाया गया।`);
  };

  const handleAddDistrict = (distName) => {
    const updated = addDistrict(distName);
    setDistricts(updated);
    showToast(`नया ज़िला "${distName}" जोड़ा गया!`);
  };

  const handleEditDistrict = (oldName, newName) => {
    const updated = editDistrict(oldName, newName);
    setDistricts(updated);
    setContacts(getStoredContacts());
    setCoAdmins(getStoredCoAdmins());
    setOffices(getStoredOffices());
    showToast(`ज़िला "${oldName}" को बदलकर "${newName}" किया गया!`);
  };

  const handleDeleteDistrict = (distName) => {
    const updated = deleteDistrict(distName);
    setDistricts(updated);
    showToast(`ज़िला "${distName}" हटा दिया गया।`);
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
      setActiveChatId(existing.id);
    } else {
      const { updatedChats, targetChatId } = sendDirectMessage(
        chats, 
        contacts, 
        currentUser, 
        targetContact, 
        `जय हिंद, ${targetContact.name} जी!`
      );
      setChats(updatedChats);
      setActiveChatId(targetChatId);
      setNotifications(getStoredNotifications());

      if (isFirebaseConfigured() && targetChatId) {
        const updatedChat = updatedChats.find(c => c.id === targetChatId);
        if (updatedChat) {
          saveFirestoreChat(updatedChat);
        }
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
    showToast('समूह सफलतापूर्वक समाप्त (Delete) कर दिया गया।');

    if (isFirebaseConfigured()) {
      deleteFirestoreChat(groupId);
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
    if (currentUser?.role === 'user' && userDistrictScope === 'my_district') {
      setSelectedDistrict(currentUser.district || '');
    } else if (currentUser?.role === 'co_admin') {
      setSelectedDistrict(currentUser.district || '');
    } else {
      setSelectedDistrict('');
    }
    setSelectedPost('');
    setSelectedOffice('');
  };

  const hasActiveFilters = Boolean(searchQuery || (currentUser?.role === 'admin' && selectedDistrict) || selectedPost || selectedOffice);

  // Scoped pending counts
  const pendingCount = useMemo(() => {
    if (currentUser?.role === 'co_admin') {
      return contacts.filter(c => c.status === 'pending' && c.district === currentUser.district).length;
    }
    return contacts.filter(c => c.status === 'pending').length;
  }, [contacts, currentUser]);

  const approvedCount = contacts.filter(c => c.status === 'approved' || c.status === 'active').length;
  const unreadMessagesCount = getUnreadMessagesCountForUser(chats, currentUser?.id);

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
          onOpenFirebaseSetup={() => setIsFirebaseSetupOpen(true)}
          isFirebaseConnected={isFirebaseConnected}
          contacts={contacts}
          coAdmins={coAdmins}
          posts={posts}
          districts={districts}
          offices={offices}
          terms={terms}
          onOpenPolicy={handleOpenPolicy}
        />

        {/* Policy Details & Setup Modals (Lazy) */}
        <Suspense fallback={null}>
          <PolicyModal
            isOpen={isPolicyModalOpen}
            activePolicy={activePolicyType}
            policies={policies}
            onClose={() => setIsPolicyModalOpen(false)}
          />

          {/* Google Firebase Cloud Live Chat Setup Modal (Accessible on Login Screen) */}
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
              showToast('🎉 Google Firebase लाइव चैट क्लाउड सक्रिय!');
            }}
          />
        </Suspense>
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

      {/* Mandatory Uniform Photo Verification Gate */}
      {currentUser && currentUser.role === 'user' && !currentUser.uniformPhoto && (
        <UniformPhotoGate 
          currentUser={currentUser}
          onSavePhoto={(photo) => handleUpdateUniformPhoto(currentUser.id, photo)}
          onLogout={handleLogout}
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


      {/* District Scoping Banner for Regular Employee User */}
      {currentUser.role === 'user' && (
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} color="var(--gold-primary)" />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-bright)' }}>
              आपका पदस्थापित जनपद: <strong>{currentUser.district}</strong>
            </span>
            <span className="status-tag status-approved" style={{ fontSize: '0.72rem' }}>
              सक्रिय जनपद
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${userDistrictScope === 'my_district' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              onClick={() => {
                setUserDistrictScope('my_district');
                setSelectedDistrict(currentUser.district);
              }}
              title={`केवल ${currentUser.district} जनपद के कार्मिक देखें`}
            >
              📌 केवल मेरा जनपद ({currentUser.district})
            </button>

            <button 
              className={`btn ${userDistrictScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              onClick={() => {
                setUserDistrictScope('all');
                setSelectedDistrict('');
              }}
              title="पूरे राज्य या किसी विशिष्ट अधिकारी को खोजें"
            >
              <Search size={13} />
              विशिष्ट अधिकारी / अन्य जनपद खोजें
            </button>
          </div>
        </div>
      )}

      {/* District Banner for Co-Admin */}
      {currentUser.role === 'co_admin' && (
        <div style={{
          background: 'rgba(30, 58, 138, 0.35)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Shield size={18} color="var(--gold-primary)" />
          <span style={{ fontSize: '0.88rem', color: 'var(--text-bright)' }}>
            अधिकार क्षेत्र: केवल <strong>{currentUser.district}</strong> जनपद (Co-Admin Scoped Directory)
          </span>
        </div>
      )}

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

      {/* Multi-Criteria Search & Filter Controls */}
      <SearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={setSelectedDistrict}
        selectedPost={selectedPost}
        setSelectedPost={setSelectedPost}
        selectedOffice={selectedOffice}
        setSelectedOffice={setSelectedOffice}
        districts={districts}
        posts={posts}
        offices={offices}
        onResetFilters={handleResetFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Contact Cards Grid (Scoped by authenticated district) */}
      <ContactList
        contacts={filteredContacts}
        currentUser={currentUser}
        permissions={phonePermissions}
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
      <TermsFooter />

      {/* Lazy-Loaded Modals Section */}
      <Suspense fallback={null}>
        {/* Police Message Box & Group Messaging Modal */}
        <MessageBoxModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        chats={chats}
        contacts={contacts}
        currentUser={currentUser}
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
        onAppendMessage={handleAppendMessage}
        onMarkChatAsRead={handleMarkChatAsRead}
      />

      {/* Google Firebase Cloud Live Chat Setup Modal */}
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
          showToast('🎉 Google Firebase लाइव चैट क्लाउड सक्रिय!');
        }}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        contacts={contacts}
        coAdmins={coAdmins}
      />

      {/* Employee Self-Registration Modal */}
      <RegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSubmitRegistration={handleRegistrationSubmit}
        districts={districts}
        posts={posts}
        offices={offices}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        user={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfileRequest={handleUserProfileUpdateRequest}
        onChangePassword={handleChangeMyPassword}
        onUpdateUniformPhoto={handleUpdateUniformPhoto}
        onRequestDistrictTransfer={handleRequestDistrictTransfer}
        onCancelDistrictTransfer={handleRejectDistrictTransfer}
        districts={districts}
        offices={offices}
      />

      {/* Admin / Co-Admin Control Portal */}
      <AdminPanel
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
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
      />

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
        onCallEnded={() => {}}
      />

      {/* Mandatory Post-Login Official Disclaimer Gate */}
      <LoginDisclaimerModal
        isOpen={isDisclaimerModalOpen && !disclaimerAgreed}
        user={currentUser}
        onAgree={handleAgreeDisclaimer}
        onOpenPolicy={handleOpenPolicy}
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

      {/* Slide-over Clean Role-based Navigation Drawer */}
      <HeaderMenuDrawer
        isOpen={isMenuDrawerOpen}
        onClose={() => setIsMenuDrawerOpen(false)}
        currentUser={currentUser}
        policies={policies}
        pendingCount={pendingCount}
        notifCount={notifications.length}
        chatsCount={unreadMessagesCount}
        isFirebaseConnected={isFirebaseConnected}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenAdmin={handleOpenAdminPanel}
        onOpenChat={() => setIsChatModalOpen(true)}
        onOpenNotifications={() => setIsNotifsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenFirebaseSetup={() => setIsFirebaseSetupOpen(true)}
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
        notifCount={notifications.length}
        pendingCount={pendingCount}
        onOpenChat={() => {
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsChatModalOpen(true);
        }}
        onOpenNotifications={() => {
          setIsChatModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsNotifsModalOpen(true);
        }}
        onOpenAdmin={() => {
          setIsChatModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          handleOpenAdminPanel();
        }}
        onOpenProfile={() => {
          setIsChatModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsMenuDrawerOpen(false);
          setIsProfileModalOpen(true);
        }}
        onOpenMenu={() => {
          setIsChatModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(true);
        }}
        onNavigateHome={() => {
          setIsChatModalOpen(false);
          setIsNotifsModalOpen(false);
          setIsAdminModalOpen(false);
          setIsProfileModalOpen(false);
          setIsMenuDrawerOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isChatModalOpen={isChatModalOpen}
        isNotifsModalOpen={isNotifsModalOpen}
        isAdminModalOpen={isAdminModalOpen}
        isProfileModalOpen={isProfileModalOpen}
        isMenuDrawerOpen={isMenuDrawerOpen}
      />
    </div>
  );
}
