import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Send, Paperclip, Users, User, Phone, 
  PhoneCall, Search, Plus, X, Download, FileText, 
  FileSpreadsheet, Image as ImageIcon, MapPin, 
  Share2, Check, CheckCheck, Compass, Info, ShieldCheck,
  UserPlus, UserMinus, LogOut, Trash2, Crown, Shield, Home
} from 'lucide-react';
import { getChatsForUser, getUnreadCountForChat } from '../utils/storage';
import { callManager } from '../utils/webrtc';
import { validateFileSize, compressImage } from '../utils/imageCompressor';

export default function MessageBoxModal({ 
  isOpen, 
  onClose, 
  chats = [], 
  contacts = [], 
  currentUser, 
  activeChatId, 
  setActiveChatId, 
  onSendDirectMessage, 
  onSendGroupMessage, 
  onCreateGroupChat, 
  onAddGroupParticipants, 
  onRemoveGroupParticipant, 
  onLeaveGroupChat, 
  onDeleteGroupChat, 
  onAppendMessage, 
  onMarkChatAsRead,
  onStartEmptyDirectChat
}) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'group'
  const [chatSearch, setChatSearch] = useState('');
  
  // WhatsApp Mobile Screen Navigation: 'list' (चैट सूची) | 'chat' (एक्टिव चैट रूम)
  const [mobileView, setMobileView] = useState('list');

  // Message input state
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // File input refs
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);

  // Modals inside messaging
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  const [showShareContactModal, setShowShareContactModal] = useState(false);
  const [shareContactSearch, setShareContactSearch] = useState('');

  // Group Info & Member Management states
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupMemberSearchFilter, setGroupMemberSearchFilter] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearchFilter, setAddMemberSearchFilter] = useState('');
  const [selectedNewMemberIds, setSelectedNewMemberIds] = useState([]);

  // Filter chats visible to current user
  const userVisibleChats = (isOpen && currentUser) ? getChatsForUser(chats, contacts, currentUser) : [];

  // Direct chats vs Group chats
  const directChats = userVisibleChats.filter(c => c.type === 'direct');
  const groupChats = userVisibleChats.filter(c => c.type === 'group');

  // Currently active list based on tab
  const currentCategoryChats = activeTab === 'direct' ? directChats : groupChats;

  // Search filtered list
  const filteredChatList = currentCategoryChats.filter(c => {
    if (!chatSearch.trim()) return true;
    const q = chatSearch.toLowerCase();
    const titleMatch = (c.title || '').toLowerCase().includes(q);
    const lastMsgMatch = (c.lastMessage || '').toLowerCase().includes(q);
    return titleMatch || lastMsgMatch;
  });

  // Current active chat object
  const currentChat = userVisibleChats.find(c => c.id === activeChatId) || filteredChatList[0];

  // Auto-select chat when activeChatId is set from outside (e.g. notifications or contact card click)
  useEffect(() => {
    if (!isOpen) return;
    if (activeChatId) {
      const target = userVisibleChats.find(c => c.id === activeChatId);
      if (target) {
        setActiveTab(target.type === 'group' ? 'group' : 'direct');
        setMobileView('chat');
      }
    }
  }, [isOpen, activeChatId]);

  // Mark active chat as read
  useEffect(() => {
    if (!isOpen || !currentChat || !currentUser || !onMarkChatAsRead) return;

    const hasUnread = Array.isArray(currentChat.messages) && currentChat.messages.some(m => {
      const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
      return !readBy.includes(currentUser.id);
    });

    if (hasUnread) {
      onMarkChatAsRead(currentChat.id);
    }
  }, [isOpen, currentChat?.id, currentUser?.id]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (!isOpen || mobileView !== 'chat') return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [isOpen, mobileView, currentChat?.messages?.length, activeChatId]);

  if (!isOpen || !currentUser) return null;

  // Find other participant for direct chat
  const otherParticipantId = currentChat?.type === 'direct' && currentChat?.participants
    ? currentChat.participants.find(pId => pId !== currentUser.id) 
    : null;
  const otherContact = otherParticipantId 
    ? contacts.find(c => c.id === otherParticipantId) 
    : null;

  // Resolve participant helper for groups
  const resolveParticipant = (participantId) => {
    if (participantId === 'super-admin') {
      return {
        id: 'super-admin',
        name: 'मुख्यालय पुलिस महानिदेशक',
        post: 'डीजीपी उत्तर प्रदेश',
        district: 'मुख्यालय लखनऊ',
        pno: 'DGP001'
      };
    }
    const found = contacts.find(c => c.id === participantId);
    if (found) return found;
    return {
      id: participantId,
      name: 'पुलिस अधिकारी',
      post: 'अधिकारी',
      district: currentChat?.district || 'उत्तर प्रदेश',
      pno: ''
    };
  };

  const isCurrentChatGroup = currentChat?.type === 'group';
  const isCurrentUserGroupCreator = isCurrentChatGroup && currentChat?.createdBy === currentUser?.id;
  const isCurrentUserGroupAdmin = isCurrentChatGroup && (isCurrentUserGroupCreator || currentUser?.role === 'admin');

  // Handle Remove Member from Group
  const handleRemoveMember = (member) => {
    if (!currentChat || !onRemoveGroupParticipant) return;
    const confirmRemove = window.confirm(`क्या आप अधिकारी "${member.name} (${member.post || ''})" को समूह से हटाना चाहते हैं?`);
    if (confirmRemove) {
      onRemoveGroupParticipant(currentChat.id, member.id);
    }
  };

  // Handle Leave Group
  const handleLeaveCurrentGroup = () => {
    if (!currentChat || !onLeaveGroupChat) return;
    const confirmLeave = window.confirm(`क्या आप वाकई समूह "${currentChat.title}" से बाहर निकलना चाहते हैं?`);
    if (confirmLeave) {
      onLeaveGroupChat(currentChat.id);
      setShowGroupInfoModal(false);
      setMobileView('list');
    }
  };

  // Handle Delete Group
  const handleDeleteCurrentGroup = () => {
    if (!currentChat || !onDeleteGroupChat) return;
    const confirmDelete = window.confirm(`⚠️ चेतावनी: क्या आप वाकई समूह "${currentChat.title}" को हमेशा के लिए समाप्त (Delete) करना चाहते हैं?`);
    if (confirmDelete) {
      onDeleteGroupChat(currentChat.id);
      setShowGroupInfoModal(false);
      setMobileView('list');
    }
  };

  // Handle Confirm Add Members to Group
  const handleConfirmAddMembers = () => {
    if (!currentChat || !onAddGroupParticipants || selectedNewMemberIds.length === 0) return;
    onAddGroupParticipants(currentChat.id, selectedNewMemberIds);
    setSelectedNewMemberIds([]);
    setShowAddMemberModal(false);
  };

  // Handle Photo File selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeCheck = validateFileSize(file, 'photo');
    if (sizeCheck && !sizeCheck.valid) {
      alert(sizeCheck.error);
      if (e.target) e.target.value = '';
      return;
    }

    compressImage(file, 800, 800, 0.85).then(compressedUrl => {
      setAttachedFile({
        name: file.name,
        type: 'image',
        size: `${Math.round(file.size / 1024)} KB`,
        url: compressedUrl
      });
      setShowAttachMenu(false);
      chatInputRef.current?.focus();
    }).catch(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedFile({
          name: file.name,
          type: 'image',
          size: `${Math.round(file.size / 1024)} KB`,
          url: event.target.result
        });
        setShowAttachMenu(false);
        chatInputRef.current?.focus();
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle Document selection (PDF, Word, Excel)
  const handleDocSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(fileName);
    const isWord = /\.docx?$/i.test(fileName) || 
      file.type === 'application/msword' || 
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isExcel = /\.xlsx?$/i.test(fileName) || 
      file.type === 'application/vnd.ms-excel' || 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isPdf && !isWord && !isExcel) {
      alert('⚠️ केवल PDF (.pdf), Microsoft Word (.doc, .docx) एवं Excel (.xls, .xlsx) दस्तावेज़ ही मान्य हैं।');
      if (e.target) e.target.value = '';
      return;
    }

    let sizeCheck;
    if (isPdf) sizeCheck = validateFileSize(file, 'pdf');
    else if (isWord) sizeCheck = validateFileSize(file, 'word');
    else if (isExcel) sizeCheck = validateFileSize(file, 'excel');

    if (sizeCheck && !sizeCheck.valid) {
      alert(sizeCheck.error);
      if (e.target) e.target.value = '';
      return;
    }

    const detectedType = isPdf ? 'pdf' : isWord ? 'word' : 'excel';
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        type: detectedType,
        size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        url: event.target.result
      });
      setShowAttachMenu(false);
      chatInputRef.current?.focus();
    };
    reader.readAsDataURL(file);
  };

  // Handle GPS Location Sharing
  const handleShareCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('आपके डिवाइस में GPS लोकेशन समर्थित नहीं है।');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        const accuracy = Math.round(position.coords.accuracy || 0);
        const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        setAttachedFile({
          name: `📍 वर्तमान पुलिस लोकेशन (${lat}, ${lng})`,
          type: 'location',
          size: `परिशुद्धता ~${accuracy}m`,
          locationData: { lat, lng, mapUrl, accuracy, timestamp: Date.now() }
        });

        setIsGettingLocation(false);
        setShowAttachMenu(false);
        chatInputRef.current?.focus();
      },
      (error) => {
        setIsGettingLocation(false);
        alert('⚠️ लोकेशन अनुमति अस्वीकृत या GPS सिग्नल उपलब्ध नहीं है। कृपया डिवाइस सेटिंग से लोकेशन सक्षम करें।');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Handle Share Contact attachment
  const handleSelectContactToShare = (contact) => {
    setAttachedFile({
      name: `👤 संपर्क कार्ड: ${contact.name}`,
      type: 'contact',
      size: `${contact.post || 'अधिकारी'} • ${contact.district || ''}`,
      contactData: {
        id: contact.id,
        name: contact.name,
        post: contact.post,
        office: contact.office,
        district: contact.district,
        phone: contact.phone,
        pno: contact.pno,
        uniformPhoto: contact.uniformPhoto
      }
    });
    setShowShareContactModal(false);
    setShowAttachMenu(false);
    chatInputRef.current?.focus();
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;
    if (!currentChat) return;

    if (currentChat.type === 'direct' && otherContact) {
      onAppendMessage(currentChat.id, currentUser, inputText.trim(), attachedFile);
    } else if (currentChat.type === 'group') {
      onSendGroupMessage(currentChat.id, currentUser, inputText.trim(), attachedFile);
    } else {
      onAppendMessage(currentChat.id, currentUser, inputText.trim(), attachedFile);
    }

    setInputText('');
    setAttachedFile(null);
    setShowAttachMenu(false);
  };

  // Start new direct chat with selected officer (No auto-sending message, Point 3)
  const handleStartDirectChat = (contact) => {
    setShowNewDirectModal(false);
    setActiveTab('direct');
    
    const existing = chats.find(c => 
      c.type === 'direct' && 
      c.participants?.includes(currentUser.id) && 
      c.participants?.includes(contact.id)
    );

    if (existing) {
      setActiveChatId(existing.id);
      setMobileView('chat');
    } else {
      if (onStartEmptyDirectChat) {
        onStartEmptyDirectChat(contact);
      } else {
        const targetChatId = `chat-p2p-${currentUser.id}-${contact.id}`;
        setActiveChatId(targetChatId);
      }
      setMobileView('chat');
    }
  };

  // Handle create group submit
  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupTitle.trim()) return;

    onCreateGroupChat(newGroupTitle.trim(), selectedGroupParticipants, newGroupDesc.trim());
    setShowNewGroupModal(false);
    setNewGroupTitle('');
    setNewGroupDesc('');
    setSelectedGroupParticipants([]);
    setActiveTab('group');
    setMobileView('chat');
  };

  // Toggle group participant selection
  const toggleGroupParticipant = (contactId) => {
    setSelectedGroupParticipants(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  // Filter direct contacts for "New Chat" modal
  const eligibleDirectContacts = contacts.filter(c => {
    if (c.id === currentUser.id) return false;
    const isApproved = c.status === 'approved' || c.status === 'active';
    if (!isApproved) return false;

    if (contactSearchQuery.trim()) {
      const q = contactSearchQuery.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(q);
      const matchPno = (c.pno || '').toLowerCase().includes(q);
      const matchDistrict = (c.district || '').toLowerCase().includes(q);
      const matchOffice = (c.office || '').toLowerCase().includes(q);
      const matchPost = (c.post || '').toLowerCase().includes(q);
      return matchName || matchPno || matchDistrict || matchOffice || matchPost;
    }
    return true;
  });

  return (
    <div 
      className="whatsapp-full-screen-container"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 100060,
        background: '#070e1c',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#f8fafc',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: '0px',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      {/* Hidden file inputs for attachments */}
      <input 
        ref={imageInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handlePhotoSelect} 
        style={{ display: 'none' }} 
      />
      <input 
        ref={docInputRef} 
        type="file" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleDocSelect} 
        style={{ display: 'none' }} 
      />

      {/* Main Responsive Body: WhatsApp Two-Screen or Desktop Split */}
      <div style={{ display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }}>
        
        {/* ========================================================================= */}
        {/* VIEW 1: CONVERSATIONS LIST (CHATS TAB)                                    */}
        {/* ========================================================================= */}
        <div 
          className="whatsapp-list-panel"
          style={{
            width: '100%',
            maxWidth: '380px',
            borderRight: '1px solid rgba(196, 151, 86, 0.25)',
            display: (mobileView === 'list' || window.innerWidth >= 768) ? 'flex' : 'none',
            flexDirection: 'column',
            background: 'linear-gradient(180deg, #0b1528 0%, #070e1c 100%)',
            height: '100%',
            flexShrink: 0
          }}
        >
          {/* Header 1: WhatsApp Top Bar with Back Arrow, Title & Quick Actions */}
          <div style={{
            padding: '0.65rem 0.85rem',
            background: '#0c1830',
            borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--khaki-light, #dfb97e)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="निर्देशिका पर वापस जाएं"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
                संदेश (Police Chats)
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(true)}
                style={{
                  background: 'rgba(196, 151, 86, 0.15)',
                  border: '1px solid rgba(196, 151, 86, 0.4)',
                  color: '#fef08a',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="नया पुलिस समूह बनाएं"
              >
                <Users size={13} />
                <span>+ ग्रुप</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewDirectModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #c49756, #9a6d32)',
                  border: 'none',
                  color: '#070e1c',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="अधिकारी को नया संदेश भेजें"
              >
                <Plus size={13} />
                <span>+ चैट</span>
              </button>
            </div>
          </div>

          {/* Header 2: Radio Toggle Bar [◉ व्यक्तिगत (P2P)] vs [○ समूह (Groups)] */}
          <div style={{
            display: 'flex',
            padding: '6px 10px',
            background: 'rgba(7, 14, 28, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '8px'
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('direct')}
              style={{
                flex: 1,
                padding: '7px 6px',
                borderRadius: '8px',
                border: activeTab === 'direct' ? '1px solid var(--khaki-primary, #c49756)' : '1px solid transparent',
                background: activeTab === 'direct' ? 'rgba(196, 151, 86, 0.16)' : 'transparent',
                color: activeTab === 'direct' ? '#fef08a' : '#94a3b8',
                fontWeight: activeTab === 'direct' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.88rem' }}>{activeTab === 'direct' ? '◉' : '○'}</span>
              <span>व्यक्तिगत (P2P)</span>
              {directChats.length > 0 && (
                <span style={{
                  background: 'rgba(196, 151, 86, 0.3)',
                  color: 'var(--khaki-light)',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '10px'
                }}>
                  {directChats.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('group')}
              style={{
                flex: 1,
                padding: '7px 6px',
                borderRadius: '8px',
                border: activeTab === 'group' ? '1px solid var(--khaki-primary, #c49756)' : '1px solid transparent',
                background: activeTab === 'group' ? 'rgba(196, 151, 86, 0.16)' : 'transparent',
                color: activeTab === 'group' ? '#fef08a' : '#94a3b8',
                fontWeight: activeTab === 'group' ? 700 : 500,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '0.88rem' }}>{activeTab === 'group' ? '◉' : '○'}</span>
              <span>समूह (Groups)</span>
              {groupChats.length > 0 && (
                <span style={{
                  background: 'rgba(196, 151, 86, 0.3)',
                  color: 'var(--khaki-light)',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '1px 5px',
                  borderRadius: '10px'
                }}>
                  {groupChats.length}
                </span>
              )}
            </button>
          </div>

          {/* Search Box */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: '#64748b' }} />
              <input
                type="text"
                placeholder={activeTab === 'direct' ? 'अधिकारी या पद नाम खोजें...' : 'समूह नाम खोजें...'}
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 30px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(196, 151, 86, 0.2)',
                  borderRadius: '20px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredChatList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b', fontSize: '0.84rem' }}>
                {activeTab === 'direct' ? (
                  <div>
                    <User size={36} style={{ margin: '0 auto 0.6rem', opacity: 0.35, color: 'var(--khaki-primary)' }} />
                    <p style={{ color: '#94a3b8' }}>कोई व्यक्तिगत चैट उपलब्ध नहीं है।</p>
                    <button
                      type="button"
                      onClick={() => setShowNewDirectModal(true)}
                      style={{
                        marginTop: '0.75rem',
                        background: 'linear-gradient(135deg, #c49756, #9a6d32)',
                        border: 'none',
                        color: '#070e1c',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ नया संदेश शुरू करें
                    </button>
                  </div>
                ) : (
                  <div>
                    <Users size={36} style={{ margin: '0 auto 0.6rem', opacity: 0.35, color: 'var(--khaki-primary)' }} />
                    <p style={{ color: '#94a3b8' }}>कोई समूह चैट उपलब्ध नहीं है।</p>
                    <button
                      type="button"
                      onClick={() => setShowNewGroupModal(true)}
                      style={{
                        marginTop: '0.75rem',
                        background: 'linear-gradient(135deg, #c49756, #9a6d32)',
                        border: 'none',
                        color: '#070e1c',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer'
                      }}
                    >
                      ➕ नया ग्रुप बनाएं
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredChatList.map(chat => {
                const isSelected = currentChat?.id === chat.id;
                const unreadCount = getUnreadCountForChat(chat, currentUser.id);

                let displayPhoto = null;
                let displayName = chat.title || 'विभागीय चैट';
                let displaySub = chat.district || 'उत्तर प्रदेश पुलिस';

                if (chat.type === 'direct') {
                  const peerId = chat.participants?.find(p => p !== currentUser.id);
                  const peerObj = contacts.find(c => c.id === peerId);
                  if (peerObj) {
                    displayPhoto = peerObj.uniformPhoto;
                    displayName = peerObj.name || 'पुलिस अधिकारी';
                    displaySub = `${peerObj.post || 'अधिकारी'} • ${peerObj.office || peerObj.district || ''}`;
                  } else if (peerId === 'super-admin') {
                    displayName = 'मुख्यालय पुलिस महानिदेशक (Super Admin)';
                    displaySub = 'समस्त जनपद (Headquarters)';
                  }
                }

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatId(chat.id);
                      setMobileView('chat');
                    }}
                    style={{
                      padding: '0.7rem 0.85rem',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      background: isSelected 
                        ? 'rgba(196, 151, 86, 0.14)' 
                        : unreadCount > 0 
                          ? 'rgba(37, 99, 235, 0.12)' 
                          : 'transparent',
                      borderLeft: isSelected 
                        ? '3.5px solid var(--khaki-primary, #c49756)' 
                        : unreadCount > 0
                          ? '3.5px solid #3b82f6'
                          : '3.5px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Avatar */}
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: unreadCount > 0 ? '2px solid #3b82f6' : '1.5px solid rgba(196, 151, 86, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {displayPhoto ? (
                          <img src={displayPhoto} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : chat.type === 'group' ? (
                          <Users size={19} color="var(--khaki-light, #dfb97e)" />
                        ) : (
                          <span style={{ fontWeight: 800, color: 'var(--khaki-light)', fontSize: '0.9rem' }}>
                            {((displayName || 'P').charAt(0)).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {unreadCount > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: -1,
                          right: -1,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: '2px solid #070e1c'
                        }} />
                      )}
                    </div>

                    {/* Chat Item Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '0.86rem',
                          fontWeight: unreadCount > 0 ? 800 : 600,
                          color: unreadCount > 0 ? '#f8fafc' : '#e2e8f0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {displayName}
                        </h4>

                        {unreadCount > 0 && (
                          <span style={{
                            background: '#3b82f6',
                            color: '#fff',
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '10px'
                          }}>
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.71rem', color: 'var(--khaki-light)', opacity: 0.85, marginTop: '1px' }}>
                        {displaySub}
                      </div>

                      <div style={{
                        fontSize: '0.73rem',
                        color: unreadCount > 0 ? '#fde047' : '#94a3b8',
                        fontWeight: unreadCount > 0 ? 600 : 400,
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {chat.lastMessage || 'कोई संदेश नहीं'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 2: ACTIVE CONVERSATION SCREEN (WHATSAPP CHAT FEED)                   */}
        {/* ========================================================================= */}
        <div 
          className="whatsapp-chat-panel"
          style={{
            flex: 1,
            display: (mobileView === 'chat' || window.innerWidth >= 768) ? 'flex' : 'none',
            flexDirection: 'column',
            background: '#070e1c',
            height: '100%',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {currentChat ? (
            <>
              {/* WhatsApp Chat Top Header Bar */}
              <div style={{
                padding: '0.55rem 0.85rem',
                background: '#0c1830',
                borderBottom: '1px solid rgba(196, 151, 86, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {/* Back arrow on mobile to return to list */}
                  <button
                    type="button"
                    onClick={() => setMobileView('list')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--khaki-light, #dfb97e)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="चैट सूची पर वापस जाएं"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  {/* Avatar & Title Clickable for Group Info */}
                  <div 
                    onClick={() => {
                      if (currentChat.type === 'group') {
                        setGroupMemberSearchFilter('');
                        setShowGroupInfoModal(true);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: currentChat.type === 'group' ? 'pointer' : 'default',
                      flex: 1,
                      minWidth: 0,
                      userSelect: 'none'
                    }}
                    title={currentChat.type === 'group' ? 'ग्रुप विवरण और सदस्य देखें' : undefined}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1.5px solid var(--khaki-primary, #c49756)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {otherContact?.uniformPhoto ? (
                        <img src={otherContact.uniformPhoto} alt={otherContact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : currentChat.type === 'group' ? (
                        <Users size={19} color="var(--khaki-light)" />
                      ) : (
                        <span style={{ fontWeight: 800, color: 'var(--khaki-light)' }}>
                          {((otherContact?.name || currentChat.title || 'P').charAt(0)).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Title & Status */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: '#f8fafc',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {currentChat.type === 'direct' 
                            ? (otherContact?.name || (otherParticipantId === 'super-admin' ? 'मुख्यालय पुलिस महानिदेशक' : 'पुलिस अधिकारी')) 
                            : (currentChat.title || 'समूह चैट')}
                        </h3>
                        {currentChat.type === 'direct' && otherContact?.uniformPhoto && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#34d399',
                            fontSize: '0.62rem',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            ✓ वर्दी
                          </span>
                        )}
                        {currentChat.type === 'group' && (
                          <span style={{
                            background: 'rgba(196, 151, 86, 0.15)',
                            color: 'var(--khaki-light)',
                            fontSize: '0.62rem',
                            border: '1px solid rgba(196, 151, 86, 0.3)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                            flexShrink: 0
                          }}>
                            विवरण देखें ℹ️
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentChat.type === 'direct' ? (
                          otherContact ? (
                            `${otherContact.post || ''} • ${otherContact.district || ''}`
                          ) : (
                            'उत्तर प्रदेश पुलिस'
                          )
                        ) : (
                          `${currentChat.participants?.length || 0} सदस्य • टैप करके विवरण देखें`
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Call & Actions in Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentChat.type === 'group' && (
                    <button
                      type="button"
                      onClick={() => {
                        setGroupMemberSearchFilter('');
                        setShowGroupInfoModal(true);
                      }}
                      style={{
                        background: 'rgba(196, 151, 86, 0.18)',
                        border: '1px solid rgba(196, 151, 86, 0.4)',
                        color: '#fef08a',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="ग्रुप विवरण व सदस्य प्रबंधन"
                    >
                      <Info size={14} />
                      <span className="hide-on-mobile">ग्रुप विवरण</span>
                    </button>
                  )}

                  {currentChat.type === 'direct' && otherContact && (
                    <>
                      <button 
                        type="button"
                        onClick={() => callManager.startCall(currentUser, otherContact)}
                        style={{
                          background: 'linear-gradient(135deg, #15803d, #166534)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '5px 9px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="सुरक्षित इन-ऐप वॉइस कॉल"
                      >
                        <PhoneCall size={13} />
                        <span className="hide-on-mobile">कॉल</span>
                      </button>

                      {otherContact.phone && (
                        <a 
                          href={`tel:${otherContact.phone}`}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#e2e8f0',
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '0.74rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none'
                          }}
                          title="फ़ोन डायलर से कॉल करें"
                        >
                          <Phone size={13} />
                        </a>
                      )}
                    </>
                  )}

                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="बंद करें"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div 
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(196, 151, 86, 0.03) 0%, transparent 60%)'
                }}
              >
                {currentChat.messages && currentChat.messages.length > 0 ? (
                  currentChat.messages.map((msg, idx) => {
                    // System notice message (WhatsApp pill style)
                    if (msg.isSystem || msg.senderId === 'system') {
                      return (
                        <div key={msg.id || idx} style={{
                          display: 'flex',
                          justifyContent: 'center',
                          margin: '5px 0',
                          width: '100%'
                        }}>
                          <div style={{
                            background: 'rgba(30, 41, 59, 0.88)',
                            border: '1px solid rgba(196, 151, 86, 0.3)',
                            color: '#e2e8f0',
                            fontSize: '0.72rem',
                            padding: '3px 12px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                            maxWidth: '85%',
                            lineHeight: 1.35
                          }}>
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                    const isMe = msg.senderId === currentUser.id;
                    const hasRead = msg.readBy && msg.readBy.length > 1;

                    return (
                      <div
                        key={msg.id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {/* Group Sender info */}
                        {!isMe && currentChat.type === 'group' && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--khaki-light)', marginBottom: '2px', marginLeft: '6px', fontWeight: 700 }}>
                            {msg.senderName} {msg.senderPost ? `(${msg.senderPost})` : ''}
                          </div>
                        )}

                        {/* WhatsApp Message Bubble */}
                        <div style={{
                          background: isMe 
                            ? 'linear-gradient(135deg, #162c5b, #1e40af)' 
                            : 'rgba(24, 34, 53, 0.95)',
                          border: isMe 
                            ? '1px solid rgba(196, 151, 86, 0.35)' 
                            : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                          padding: '0.55rem 0.8rem',
                          color: '#fff',
                          fontSize: '0.84rem',
                          lineHeight: 1.4,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                          wordBreak: 'break-word',
                          position: 'relative'
                        }}>
                          {/* Text Message */}
                          {msg.text && (
                            <div style={{ whiteSpace: 'pre-wrap' }}>
                              {msg.text}
                            </div>
                          )}

                          {/* ========================================================= */}
                          {/* ATTACHMENT CARD TYPES                                     */}
                          {/* ========================================================= */}
                          {msg.file && (
                            <div style={{ marginTop: msg.text ? '0.45rem' : '0' }}>
                              
                              {/* 1. PHOTO ATTACHMENT */}
                              {msg.file.type === 'image' && (
                                <div>
                                  <img 
                                    src={msg.file.url} 
                                    alt="Attachment" 
                                    style={{ 
                                      maxWidth: '220px', 
                                      maxHeight: '160px', 
                                      borderRadius: '8px', 
                                      objectFit: 'cover',
                                      display: 'block'
                                    }} 
                                  />
                                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                                    {msg.file.name} ({msg.file.size})
                                  </div>
                                </div>
                              )}

                              {/* 2. DOCUMENTS (WORD, EXCEL, PDF) */}
                              {(msg.file.type === 'word' || msg.file.type === 'excel' || msg.file.type === 'pdf') && (
                                <div style={{
                                  background: 'rgba(0,0,0,0.3)',
                                  borderRadius: '8px',
                                  padding: '7px 10px',
                                  border: '1px solid rgba(255,255,255,0.12)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {msg.file.type === 'word' && <FileText size={22} color="#60a5fa" />}
                                  {msg.file.type === 'excel' && <FileSpreadsheet size={22} color="#34d399" />}
                                  {msg.file.type === 'pdf' && <FileText size={22} color="#f87171" />}
                                  
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {msg.file.name}
                                    </div>
                                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                                      {msg.file.type.toUpperCase()} • {msg.file.size}
                                    </div>
                                  </div>

                                  {msg.file.url && (
                                    <a 
                                      href={msg.file.url} 
                                      download={msg.file.name} 
                                      style={{
                                        background: 'rgba(196, 151, 86, 0.2)',
                                        border: '1px solid var(--khaki-primary)',
                                        color: 'var(--khaki-light)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        textDecoration: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                    >
                                      <Download size={12} />
                                      <span>डाउनलोड</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* 3. CONTACT CARD ATTACHMENT */}
                              {msg.file.type === 'contact' && msg.file.contactData && (
                                <div style={{
                                  background: 'rgba(12, 22, 41, 0.95)',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  border: '1px solid rgba(196, 151, 86, 0.4)',
                                  width: '210px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      overflow: 'hidden',
                                      background: 'rgba(255,255,255,0.1)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {msg.file.contactData.uniformPhoto ? (
                                        <img src={msg.file.contactData.uniformPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <User size={16} color="var(--khaki-light)" />
                                      )}
                                    </div>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#fef08a' }}>
                                        {msg.file.contactData.name}
                                      </div>
                                      <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                                        {msg.file.contactData.post} • {msg.file.contactData.district}
                                      </div>
                                    </div>
                                  </div>

                                  {msg.file.contactData.phone && (
                                    <a
                                      href={`tel:${msg.file.contactData.phone}`}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        background: 'linear-gradient(135deg, #10b981, #059669)',
                                        color: '#fff',
                                        borderRadius: '5px',
                                        padding: '4px',
                                        fontSize: '0.72rem',
                                        textDecoration: 'none',
                                        fontWeight: 700
                                      }}
                                    >
                                      <Phone size={12} />
                                      <span>{msg.file.contactData.phone} पर कॉल करें</span>
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* 4. GPS LOCATION ATTACHMENT */}
                              {msg.file.type === 'location' && msg.file.locationData && (
                                <div style={{
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  width: '210px'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fca5a5', fontWeight: 700, fontSize: '0.78rem', marginBottom: '4px' }}>
                                    <MapPin size={16} color="#ef4444" />
                                    <span>लाइव पुलिस लोकेशन</span>
                                  </div>
                                  <div style={{ fontSize: '0.68rem', color: '#cbd5e1', marginBottom: '6px' }}>
                                    अक्षांश: {msg.file.locationData.lat}, देशांतर: {msg.file.locationData.lng}
                                  </div>
                                  <a
                                    href={msg.file.locationData.mapUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '4px',
                                      background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                      color: '#fff',
                                      borderRadius: '5px',
                                      padding: '5px',
                                      fontSize: '0.72rem',
                                      textDecoration: 'none',
                                      fontWeight: 700
                                    }}
                                  >
                                    <Compass size={13} />
                                    <span>Google Maps में खोलें</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Timestamp & Double Checkmarks */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginTop: '3px',
                            fontSize: '0.64rem',
                            color: 'rgba(255, 255, 255, 0.6)'
                          }}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMe && (
                              <span style={{ color: hasRead ? '#60a5fa' : 'rgba(255, 255, 255, 0.6)' }}>
                                {hasRead ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b', fontSize: '0.84rem' }}>
                    <p style={{ color: '#94a3b8' }}>अभी तक कोई संवाद नहीं हुआ है।</p>
                    <p style={{ fontSize: '0.76rem', color: 'var(--khaki-light)' }}>नीचे संदेश लिखकर सुरक्षित विभागीय वार्तालाप शुरू करें।</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Chip (Above Input Bar) */}
              {attachedFile && (
                <div style={{
                  padding: '6px 12px',
                  background: 'rgba(196, 151, 86, 0.15)',
                  borderTop: '1px solid rgba(196, 151, 86, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.76rem',
                  color: '#fef08a'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <Paperclip size={14} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      संलग्न: <strong>{attachedFile.name}</strong> ({attachedFile.size})
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAttachedFile(null)} 
                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                    title="हटाएं"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* WhatsApp Attachment Tray Popup */}
              {showAttachMenu && (
                <div style={{
                  position: 'absolute',
                  bottom: '64px',
                  left: '12px',
                  background: '#0d1933',
                  border: '1px solid rgba(196, 151, 86, 0.4)',
                  borderRadius: '12px',
                  padding: '10px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  zIndex: 100,
                  width: 'calc(100% - 24px)',
                  maxWidth: '380px'
                }}>
                  {/* Option 1: Photo */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ background: '#2563eb', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                      <ImageIcon size={18} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>फोटो</span>
                  </button>

                  {/* Option 2: Documents */}
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ background: '#7c3aed', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                      <FileText size={18} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>दस्तावेज़</span>
                  </button>

                  {/* Option 3: Contact */}
                  <button
                    type="button"
                    onClick={() => { setShowAttachMenu(false); setShowShareContactModal(true); }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ background: '#059669', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                      <Share2 size={18} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>संपर्क</span>
                  </button>

                  {/* Option 4: GPS Location */}
                  <button
                    type="button"
                    onClick={handleShareCurrentLocation}
                    disabled={isGettingLocation}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#f8fafc',
                      cursor: isGettingLocation ? 'wait' : 'pointer'
                    }}
                  >
                    <div style={{ background: '#dc2626', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                      <MapPin size={18} color="#fff" />
                    </div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600 }}>
                      {isGettingLocation ? 'खोज...' : 'लोकेशन'}
                    </span>
                  </button>
                </div>
              )}

              {/* WhatsApp Bottom Input Bar (Always Visible at bottom, Point 4) */}
              <form 
                onSubmit={handleSendMessage}
                style={{
                  padding: '0.65rem 0.85rem',
                  paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
                  background: '#0c1830',
                  borderTop: '1px solid rgba(196, 151, 86, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  flexShrink: 0,
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 70,
                  boxShadow: '0 -4px 15px rgba(0, 0, 0, 0.6)'
                }}
              >
                {/* Paperclip Attachment Trigger */}
                <button
                  id="chat-attach-btn"
                  type="button"
                  onClick={() => setShowAttachMenu(prev => !prev)}
                  style={{
                    background: showAttachMenu ? 'rgba(196, 151, 86, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(196, 151, 86, 0.3)',
                    color: 'var(--khaki-primary, #c49756)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="अटैच करें (फोटो, दस्तावेज, संपर्क, लोकेशन)"
                >
                  <Paperclip size={18} />
                </button>

                {/* Text Input */}
                <input
                  id="chat-input-text"
                  ref={chatInputRef}
                  type="text"
                  placeholder="संदेश लिखें..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '24px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />

                {/* Circular Send Button */}
                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={!inputText.trim() && !attachedFile}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: (!inputText.trim() && !attachedFile) 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'linear-gradient(135deg, #c49756, #9a6d32)',
                    border: 'none',
                    color: (!inputText.trim() && !attachedFile) ? '#64748b' : '#070e1c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (!inputText.trim() && !attachedFile) ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                    boxShadow: (!inputText.trim() && !attachedFile) ? 'none' : '0 2px 8px rgba(196, 151, 86, 0.4)'
                  }}
                  title="भेजें"
                >
                  <Send size={17} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b', padding: '2rem' }}>
              <Users size={48} style={{ margin: '0 auto 1rem', opacity: 0.25, color: 'var(--khaki-primary)' }} />
              <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: 0 }}>कोई चैट चयनित नहीं है</h3>
              <p style={{ fontSize: '0.8rem', maxWidth: '340px', margin: '0.5rem auto 1rem', color: '#94a3b8' }}>
                बाईं ओर की सूची से किसी वार्तालाप का चयन करें अथवा नया संदेश भेजें।
              </p>
              <button
                type="button"
                onClick={() => setShowNewDirectModal(true)}
                style={{
                  background: 'linear-gradient(135deg, #c49756, #9a6d32)',
                  border: 'none',
                  color: '#070e1c',
                  padding: '7px 16px',
                  borderRadius: '20px',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                ➕ नया संदेश शुरू करें
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: NEW DIRECT MESSAGE (START CONVERSATION)                          */}
      {/* ========================================================================= */}
      {showNewDirectModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10005,
            padding: '1rem'
          }}
          onClick={() => setShowNewDirectModal(false)}
        >
          <div 
            style={{
              background: '#0c1629',
              border: '1px solid var(--khaki-primary)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f1f3d',
              borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--khaki-light)' }}>
                नया संदेश भेजें (Select Officer)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowNewDirectModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                type="text"
                placeholder="अधिकारी का नाम, पद, PNO या जनपद खोजें..."
                value={contactSearchQuery}
                onChange={e => setContactSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(196, 151, 86, 0.25)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {eligibleDirectContacts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                  कोई अधिकारी नहीं मिला।
                </div>
              ) : (
                eligibleDirectContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="officer-direct-row"
                    onClick={() => handleStartDirectChat(contact)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {contact.uniformPhoto ? (
                        <img src={contact.uniformPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={16} color="var(--khaki-light)" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                        {contact.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--khaki-light)' }}>
                        {contact.post} • {contact.district} (PNO: {contact.pno || 'N/A'})
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DEDICATED NEW GROUP CHAT CREATION                                */}
      {/* ========================================================================= */}
      {showNewGroupModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10005,
            padding: '1rem'
          }}
          onClick={() => setShowNewGroupModal(false)}
        >
          <div 
            style={{
              background: '#0c1629',
              border: '1px solid var(--khaki-primary)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f1f3d',
              borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--khaki-light)' }}>
                👥 नया पुलिस समूह बनाएं (New Group)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowNewGroupModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                    समूह का नाम (Group Title) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="उदा. गश्त दल, थाना समन्वय, वीआईपी सुरक्षा"
                    value={newGroupTitle}
                    onChange={e => setNewGroupTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(196, 151, 86, 0.3)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>
                    संक्षिप्त विवरण / उद्देश्य
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. दैनिक वायरलेस एवं फील्ड ड्यूटी समन्वय"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(196, 151, 86, 0.3)',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--khaki-light)', fontWeight: 700 }}>
                  सदस्य चुनें ({selectedGroupParticipants.length} चयनित):
                </div>

                <input
                  type="text"
                  placeholder="अधिकारी का नाम या जनपद खोजें..."
                  value={groupMemberSearch}
                  onChange={e => setGroupMemberSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.78rem'
                  }}
                />
              </div>

              {/* Members Selection List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.85rem', maxHeight: '200px' }}>
                {contacts
                  .filter(c => c.id !== currentUser.id && (c.status === 'approved' || c.status === 'active'))
                  .filter(c => {
                    if (!groupMemberSearch.trim()) return true;
                    const q = groupMemberSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.district || '').toLowerCase().includes(q);
                  })
                  .map(c => {
                    const isSelected = selectedGroupParticipants.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleGroupParticipant(c.id)}
                        style={{
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(196, 151, 86, 0.12)' : 'transparent',
                          borderRadius: '4px'
                        }}
                      >
                        <div style={{ fontSize: '0.8rem', color: isSelected ? '#fef08a' : '#e2e8f0' }}>
                          <strong>{c.name}</strong> <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({c.post} • {c.district})</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => {}} 
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
              </div>

              <div style={{ padding: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#94a3b8',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={!newGroupTitle.trim()}
                  style={{
                    background: 'linear-gradient(135deg, #c49756, #9a6d32)',
                    border: 'none',
                    color: '#070e1c',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: newGroupTitle.trim() ? 'pointer' : 'not-allowed'
                  }}
                >
                  समूह बनाएं
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SHARE CONTACT CARD SELECTOR                                      */}
      {/* ========================================================================= */}
      {showShareContactModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10005,
            padding: '1rem'
          }}
          onClick={() => setShowShareContactModal(false)}
        >
          <div 
            style={{
              background: '#0c1629',
              border: '1px solid var(--khaki-primary)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f1f3d',
              borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--khaki-light)' }}>
                👤 संपर्क कार्ड साझा करें (Share Officer)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowShareContactModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                type="text"
                placeholder="अधिकारी खोजें..."
                value={shareContactSearch}
                onChange={e => setShareContactSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(196, 151, 86, 0.25)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {contacts
                .filter(c => c.status === 'approved' || c.status === 'active')
                .filter(c => {
                  if (!shareContactSearch.trim()) return true;
                  const q = shareContactSearch.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q) || (c.post || '').toLowerCase().includes(q) || (c.district || '').toLowerCase().includes(q);
                })
                .map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectContactToShare(c)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {c.uniformPhoto ? (
                        <img src={c.uniformPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={15} color="var(--khaki-light)" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                        {c.post} • {c.district}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: GROUP INFO & MEMBER MANAGEMENT (ग्रुप विवरण व सदस्य प्रबंधन)     */}
      {/* ========================================================================= */}
      {showGroupInfoModal && currentChat && isCurrentChatGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            zIndex: 100000
          }}
          onClick={() => setShowGroupInfoModal(false)}
        >
          <div
            style={{
              background: '#0a1628',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '0.8rem 1rem',
              background: '#0f1f3d',
              borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--khaki-light)" />
                <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#f8fafc' }}>
                  समूह विवरण (Group Info)
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGroupInfoModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                title="बंद करें"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Group Banner Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(196, 151, 86, 0.25)',
                borderRadius: '10px',
                padding: '0.85rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(196, 151, 86, 0.15)',
                  border: '2px solid var(--khaki-primary, #c49756)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={28} color="var(--khaki-light)" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: '#f8fafc' }}>
                  {currentChat.title}
                </h2>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  जनपद / इकाई: <strong style={{ color: '#cbd5e1' }}>{currentChat.district || 'सभी जनपद'}</strong>
                </div>
                {currentChat.description && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    marginTop: '2px',
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {currentChat.description}
                  </div>
                )}
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  समूह निर्माण: {resolveParticipant(currentChat.createdBy).name} द्वारा
                </div>
              </div>

              {/* Members Section Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2px'
              }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--khaki-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>सदस्य सूची ({currentChat.participants?.length || 0})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNewMemberIds([]);
                    setAddMemberSearchFilter('');
                    setShowAddMemberModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #15803d, #166534)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserPlus size={13} />
                  <span>सदस्य जोड़ें</span>
                </button>
              </div>

              {/* Search Inside Group Members */}
              <div>
                <input
                  type="text"
                  placeholder="ग्रुप के सदस्य खोजें..."
                  value={groupMemberSearchFilter}
                  onChange={e => setGroupMemberSearchFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(196, 151, 86, 0.25)',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.78rem'
                  }}
                />
              </div>

              {/* Group Members List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {(currentChat.participants || [])
                  .map(pId => resolveParticipant(pId))
                  .filter(member => {
                    if (!groupMemberSearchFilter.trim()) return true;
                    const q = groupMemberSearchFilter.toLowerCase();
                    return (member.name || '').toLowerCase().includes(q) ||
                           (member.post || '').toLowerCase().includes(q) ||
                           (member.district || '').toLowerCase().includes(q) ||
                           (member.pno || '').toLowerCase().includes(q);
                  })
                  .map(member => {
                    const isCreator = member.id === currentChat.createdBy;
                    const isMe = member.id === currentUser.id;

                    return (
                      <div
                        key={member.id}
                        style={{
                          padding: '0.55rem 0.75rem',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem'
                        }}
                      >
                        {/* Member Avatar */}
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: isCreator ? '1.5px solid #fef08a' : '1px solid rgba(196, 151, 86, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {member.uniformPhoto ? (
                            <img src={member.uniformPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: isCreator ? '#fef08a' : 'var(--khaki-light)' }}>
                              {(member.name || 'P').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Member Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                              {member.name}
                            </span>
                            {isCreator && (
                              <span style={{
                                background: 'rgba(234, 179, 8, 0.2)',
                                color: '#fef08a',
                                border: '1px solid rgba(234, 179, 8, 0.4)',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Crown size={10} /> ग्रुप एडमिन
                              </span>
                            )}
                            {isMe && (
                              <span style={{
                                background: 'rgba(59, 130, 246, 0.2)',
                                color: '#93c5fd',
                                borderRadius: '4px',
                                padding: '1px 5px',
                                fontSize: '0.62rem',
                                fontWeight: 700
                              }}>
                                आप
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {member.post || 'अधिकारी'} • {member.district || ''} {member.pno ? `(PNO: ${member.pno})` : ''}
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: '#e2e8f0',
                                padding: '4px 6px',
                                borderRadius: '5px',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="कॉल करें"
                            >
                              <Phone size={12} />
                            </a>
                          )}

                          {/* Remove Member Button (Visible to Creator / Admin for other members) */}
                          {isCurrentUserGroupAdmin && !isCreator && !isMe && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#fca5a5',
                                borderRadius: '5px',
                                padding: '4px 7px',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="ग्रुप से हटाएं"
                            >
                              <UserMinus size={11} />
                              <span>हटाएं</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Danger Actions Area */}
              <div style={{
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {!isCurrentUserGroupCreator && (
                  <button
                    type="button"
                    onClick={handleLeaveCurrentGroup}
                    style={{
                      width: '100%',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <LogOut size={15} />
                    <span>समूह छोड़ें (Exit Group)</span>
                  </button>
                )}

                {isCurrentUserGroupAdmin && (
                  <button
                    type="button"
                    onClick={handleDeleteCurrentGroup}
                    style={{
                      width: '100%',
                      background: 'rgba(239, 68, 68, 0.22)',
                      border: '1px solid rgba(239, 68, 68, 0.5)',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Trash2 size={15} />
                    <span>समूह समाप्त (Delete) करें</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: ADD MEMBERS TO GROUP (समूह में नए सदस्य जोड़ें)                  */}
      {/* ========================================================================= */}
      {showAddMemberModal && currentChat && isCurrentChatGroup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            zIndex: 100001
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            style={{
              background: '#0a1628',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '460px',
              maxHeight: '82vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.7)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f1f3d',
              borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: 'var(--khaki-light)' }}>
                ➕ समूह में सदस्य जोड़ें
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                type="text"
                placeholder="अधिकारी का नाम, पद, PNO या जनपद खोजें..."
                value={addMemberSearchFilter}
                onChange={e => setAddMemberSearchFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(196, 151, 86, 0.25)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
            </div>

            {/* Available Non-Member Contacts */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {contacts
                .filter(c => (c.status === 'approved' || c.status === 'active') && !currentChat.participants?.includes(c.id))
                .filter(c => {
                  if (!addMemberSearchFilter.trim()) return true;
                  const q = addMemberSearchFilter.toLowerCase();
                  return (c.name || '').toLowerCase().includes(q) ||
                         (c.post || '').toLowerCase().includes(q) ||
                         (c.district || '').toLowerCase().includes(q) ||
                         (c.pno || '').toLowerCase().includes(q);
                })
                .map(contact => {
                  const isChecked = selectedNewMemberIds.includes(contact.id);
                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        setSelectedNewMemberIds(prev => 
                          prev.includes(contact.id) 
                            ? prev.filter(id => id !== contact.id) 
                            : [...prev, contact.id]
                        );
                      }}
                      style={{
                        padding: '0.55rem 0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        background: isChecked ? 'rgba(196, 151, 86, 0.12)' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: 'var(--khaki-primary, #c49756)', cursor: 'pointer' }}
                      />
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {contact.uniformPhoto ? (
                          <img src={contact.uniformPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={15} color="var(--khaki-light)" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                          {contact.post} • {contact.district} (PNO: {contact.pno || 'N/A'})
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Confirmation Bar */}
            <div style={{
              padding: '0.75rem 1rem',
              background: '#0f1f3d',
              borderTop: '1px solid rgba(196, 151, 86, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                चयनित: <strong style={{ color: 'var(--khaki-light)' }}>{selectedNewMemberIds.length}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: '#cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddMembers}
                  disabled={selectedNewMemberIds.length === 0}
                  style={{
                    background: selectedNewMemberIds.length > 0
                      ? 'linear-gradient(135deg, #15803d, #166534)'
                      : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    color: selectedNewMemberIds.length > 0 ? '#fff' : '#64748b',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: selectedNewMemberIds.length > 0 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserPlus size={14} />
                  <span>ग्रुप में जोड़ें ({selectedNewMemberIds.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
