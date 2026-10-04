import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import SearchFilters from './components/SearchFilters';
import ContactList from './components/ContactList';
import RegistrationModal from './components/RegistrationModal';
import AdminPanel from './components/AdminPanel';
import EditContactModal from './components/EditContactModal';
import LoginModal from './components/LoginModal';
import UserProfileModal from './components/UserProfileModal';
import NotificationsModal from './components/NotificationsModal';
import FeedbackModal from './components/FeedbackModal';
import PoliceChatModal from './components/PoliceChatModal';
import AuthGateway from './components/AuthGateway';
import { 
  getStoredContacts, 
  getStoredCoAdmins,
  getStoredNotifications,
  getStoredFeedbacks,
  getStoredChats,
  getStoredSession,
  saveSession,
  getStoredPosts,
  getStoredOffices,
  getStoredDistricts,
  addPost,
  deletePost,
  addOffice,
  deleteOffice,
  addDistrict,
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
  addNotification,
  deleteNotification,
  addFeedback,
  toggleResolveFeedback,
  sendDirectMessage,
  createGroupChat,
  sendGroupMessage,
  appendMessageToChat,
  getChatsForUser,
  resetToDefaultContacts
} from './utils/storage';
import { MapPin, Shield, Search } from 'lucide-react';

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [coAdmins, setCoAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotifsModalOpen, setIsNotifsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Load all data on mount
  useEffect(() => {
    setContacts(getStoredContacts());
    setCoAdmins(getStoredCoAdmins());
    setNotifications(getStoredNotifications());
    setFeedbacks(getStoredFeedbacks());
    setChats(getStoredChats());
    setPosts(getStoredPosts());
    setOffices(getStoredOffices());
    setDistricts(getStoredDistricts());
    
    // Check if user session already exists
    const savedUser = getStoredSession();
    if (savedUser) {
      setCurrentUser(savedUser);
      if (savedUser.role === 'user') {
        setSelectedDistrict(savedUser.district || '');
      }
    } else {
      // Mandatory front screen login wall
      setCurrentUser(null);
    }
  }, []);

  // Update current user session on login
  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
    saveSession(userObj);
    if (userObj.role === 'user') {
      setUserDistrictScope('my_district');
      setSelectedDistrict(userObj.district || '');
    } else if (userObj.role === 'co_admin') {
      setSelectedDistrict(userObj.district || '');
    } else {
      setSelectedDistrict('');
    }
    showToast(`सफलतापूर्वक लॉगिन: ${userObj.name} (${userObj.role === 'admin' ? 'Super Admin' : userObj.role === 'co_admin' ? `Co-Admin ${userObj.district}` : 'User'})`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    saveSession(null);
    setIsChatModalOpen(false);
    showToast('आप पोर्टल से लॉगआउट हो गए हैं। सुरक्षा हेतु विवरण छुपा दिए गए हैं।');
  };

  // Quick Role Switcher for instant testing
  const handleQuickRoleSwitch = (roleKey) => {
    if (roleKey === 'admin') {
      const adminObj = {
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      };
      setCurrentUser(adminObj);
      saveSession(adminObj);
      setSelectedDistrict('');
      showToast('👑 सक्रिय रोल: Super Admin (सभी जनपदों का पूर्ण अधिकार)');
    } else if (roleKey === 'co_admin_lk') {
      const lkCo = coAdmins.find(c => c.district === 'लखनऊ') || coAdmins[0];
      const coObj = { role: 'co_admin', ...lkCo };
      setCurrentUser(coObj);
      saveSession(coObj);
      setSelectedDistrict('लखनऊ');
      showToast('🛡️ सक्रिय रोल: Co-Admin (लखनऊ जनपद)');
    } else if (roleKey === 'co_admin_kn') {
      const knCo = coAdmins.find(c => c.district === 'कानपुर नगर') || coAdmins[1];
      const coObj = { role: 'co_admin', ...knCo };
      setCurrentUser(coObj);
      saveSession(coObj);
      setSelectedDistrict('कानपुर नगर');
      showToast('🛡️ सक्रिय रोल: Co-Admin (कानपुर नगर जनपद)');
    } else if (roleKey === 'user') {
      const sampleUser = contacts.find(c => c.pno === 'PNO-012849103') || contacts[2];
      const userObj = { role: 'user', ...sampleUser };
      setCurrentUser(userObj);
      saveSession(userObj);
      setUserDistrictScope('my_district');
      setSelectedDistrict(sampleUser.district || 'लखनऊ');
      showToast(`👮 सक्रिय रोल: User (${sampleUser.name} - ${sampleUser.district})`);
    }
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
    const { updatedList } = registerNewOfficer(contacts, formData);
    setContacts(updatedList);
    showToast('पंजीकरण सबमिट हो गया है! Admin / Co-Admin Approval के बाद प्रोफ़ाइल एक्टिव होगी।');
  };

  // Handler: Admin / Co-Admin Approve
  const handleApproveContact = (id) => {
    const updated = approveOfficer(contacts, id);
    setContacts(updated);
    showToast('कर्मचारी की प्रोफ़ाइल सफलतापूर्वक स्वीकृत (Approved) की गई!');
  };

  // Handler: Admin / Co-Admin Reject
  const handleRejectContact = (id) => {
    if (window.confirm('क्या आप इस आवेदन को निरस्त (Reject) करना चाहते हैं?')) {
      const updated = rejectOfficer(contacts, id);
      setContacts(updated);
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
    showToast('अधिकारी प्रोफ़ाइल अद्यतन (Updated) कर दी गई है!');
  };

  // Handler: User Self Profile Update Request
  const handleUserProfileUpdateRequest = (userId, updatedFields) => {
    const updated = requestUserProfileUpdate(contacts, userId, updatedFields);
    setContacts(updated);
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, ...updatedFields, status: 'pending' }));
    }
    showToast('प्रोफ़ाइल अपडेट अनुरोध सबमिट हो गया है (Admin approval pending)!');
  };

  // Handler: Active / Inactive Toggle for User (Admin & Co-Admin)
  const handleToggleUserActive = (id) => {
    const updated = toggleUserActive(contacts, id);
    setContacts(updated);
    const target = updated.find(c => c.id === id);
    const isNowActive = target.status === 'approved' || target.status === 'active';
    showToast(isNowActive ? 'कर्मचारी को सक्रिय (Active) कर दिया गया!' : 'कर्मचारी को निष्क्रिय (Inactive) कर दिया गया!');
  };

  // Handler: Block / Unblock User
  const handleToggleBlock = (id) => {
    const updated = toggleBlockOfficer(contacts, id);
    setContacts(updated);
    const target = updated.find(c => c.id === id);
    showToast(target.status === 'blocked' ? 'लॉगिन एवं प्रोफ़ाइल ब्लॉक की गई!' : 'प्रोफ़ाइल अनब्लॉक कर दी गई!');
  };

  // Handler: Delete Contact
  const handleDeleteContact = (id) => {
    if (window.confirm('क्या आप इस संपर्क को हमेशा के लिए डिलीट करना चाहते हैं?')) {
      const updated = deleteOfficerProfile(contacts, id);
      setContacts(updated);
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

  const handleDeletePost = (postName) => {
    if (window.confirm(`क्या आप पद "${postName}" को हटाना चाहते हैं?`)) {
      const updated = deletePost(postName);
      setPosts(updated);
      showToast(`पद "${postName}" हटा दिया गया।`);
    }
  };

  const handleAddOffice = (officeName) => {
    const updated = addOffice(officeName);
    setOffices(updated);
    showToast(`नया कार्यालय/थाना "${officeName}" जोड़ा गया!`);
  };

  const handleDeleteOffice = (officeName) => {
    if (window.confirm(`क्या आप कार्यालय "${officeName}" को हटाना चाहते हैं?`)) {
      const updated = deleteOffice(officeName);
      setOffices(updated);
      showToast(`कार्यालय "${officeName}" हटा दिया गया।`);
    }
  };

  const handleAddDistrict = (distName) => {
    const updated = addDistrict(distName);
    setDistricts(updated);
    showToast(`नया ज़िला "${distName}" जोड़ा गया!`);
  };

  const handleDeleteDistrict = (distName) => {
    if (window.confirm(`क्या आप ज़िला "${distName}" को हटाना चाहते हैं?`)) {
      const updated = deleteDistrict(distName);
      setDistricts(updated);
      showToast(`ज़िला "${distName}" हटा दिया गया।`);
    }
  };

  // ---------------- CHAT & GROUP MESSAGING HANDLERS ----------------
  const handleOpenChatWithContact = (targetContact) => {
    if (!currentUser) return;
    if (currentUser.id === targetContact.id) {
      showToast('यह आपकी स्वयं की प्रोफ़ाइल है। अन्य अधिकारियों के साथ चैट करें।');
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
        `जय हिंद, ${targetContact.name} जी!`, 
        null, 
        true
      );
      setChats(updatedChats);
      setActiveChatId(targetChatId);
      setNotifications(getStoredNotifications());
    }
    setIsChatModalOpen(true);
  };

  const handleSendDirectMessage = (sender, recipient, text, file, alertSupervisors) => {
    const { updatedChats, targetChatId } = sendDirectMessage(chats, contacts, sender, recipient, text, file, alertSupervisors);
    setChats(updatedChats);
    if (targetChatId) setActiveChatId(targetChatId);
    setNotifications(getStoredNotifications()); // Refresh notifications with supervisory alert
    if (alertSupervisors) {
      showToast(`संदेश प्रेषित! संबंधित थाना प्रभारी (SHO), CO एवं SP को भी सूचित कर दिया गया है।`);
    } else {
      showToast('संदेश प्रेषित!');
    }
  };

  const handleSendGroupMessage = (groupId, sender, text, file) => {
    const updated = sendGroupMessage(chats, groupId, sender, text, file);
    setChats(updated);
    showToast('ग्रुप संदेश प्रेषित!');
  };

  const handleAppendMessage = (chatId, sender, text, file, alertSupervisors) => {
    const updated = appendMessageToChat(chats, chatId, sender, text, file, alertSupervisors);
    setChats(updated);
    setNotifications(getStoredNotifications());
    if (alertSupervisors) {
      showToast(`संदेश प्रेषित! संबंधित SHO, CO एवं SP को भी सूचित कर दिया गया है।`);
    } else {
      showToast('संदेश प्रेषित!');
    }
  };

  const handleCreateGroupChat = (creator, groupTitle, participantIds, description) => {
    const { updatedChats, newGroupId } = createGroupChat(chats, creator, groupTitle, participantIds, description);
    setChats(updatedChats);
    setActiveChatId(newGroupId);
    showToast(`नया पुलिस ग्रुप "${groupTitle}" सफलतापूर्वक बनाया गया!`);
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
  const userVisibleChatsCount = getChatsForUser(chats, contacts, currentUser).length;

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

      {/* Header with Active User Profile & Logout */}
      <Header
        currentUser={currentUser}
        totalApprovedCount={approvedCount}
        pendingCount={pendingCount}
        notifCount={notifications.length}
        chatsCount={userVisibleChatsCount}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenRegister={() => setIsRegisterModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenNotifications={() => setIsNotifsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenChat={() => setIsChatModalOpen(true)}
        onLogout={handleLogout}
        onQuickRoleSwitch={handleQuickRoleSwitch}
        onResetData={handleResetData}
      />

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
        onEditContact={handleStartEdit}
        onToggleBlockContact={handleToggleBlock}
        onToggleActiveContact={handleToggleUserActive}
        onPromoteCoAdminContact={(userId, district) => handlePromoteUserToCoAdmin(userId, district)}
        onDeleteContact={handleDeleteContact}
        onResetFilters={handleResetFilters}
        onOpenChatWithContact={handleOpenChatWithContact}
      />

      {/* Police Internal Chat & Group Messaging Modal */}
      <PoliceChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        chats={chats}
        contacts={contacts}
        currentUser={currentUser}
        activeChatId={activeChatId}
        setActiveChatId={setActiveChatId}
        onSendDirectMessage={handleSendDirectMessage}
        onSendGroupMessage={handleSendGroupMessage}
        onCreateGroupChat={handleCreateGroupChat}
        onAppendMessage={handleAppendMessage}
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
        onAddPost={handleAddPost}
        onDeletePost={handleDeletePost}
        onAddOffice={handleAddOffice}
        onDeleteOffice={handleDeleteOffice}
        onAddDistrict={handleAddDistrict}
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
    </div>
  );
}
