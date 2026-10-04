import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Send, Paperclip, Users, User, Phone, 
  Shield, Plus, Search, Check, Download, ArrowLeft, CheckCircle2,
  Bell, Mail, AlertCircle, FileText, Image as ImageIcon
} from 'lucide-react';
import { getChatsForUser, getUnreadCountForChat } from '../utils/storage';

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
  onAppendMessage,
  onMarkChatAsRead
}) {
  const [activeTab, setActiveTab] = useState('direct'); // 'direct' | 'group'
  const [chatSearch, setChatSearch] = useState('');
  
  // Mobile responsive view toggle: 'list' | 'chat'
  const [mobileView, setMobileView] = useState('list');

  // Message input state
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // New Direct Chat Modal
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // New Group Chat Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [groupMemberSearch, setGroupMemberSearch] = useState('');

  if (!isOpen || !currentUser) return null;

  // Filter chats visible to current user
  const userVisibleChats = getChatsForUser(chats, contacts, currentUser);

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

  // Auto-select chat when activeChatId is not set or belongs to other tab
  useEffect(() => {
    if (filteredChatList.length > 0 && (!currentChat || !filteredChatList.some(c => c.id === currentChat.id))) {
      setActiveChatId(filteredChatList[0].id);
    }
  }, [activeTab, chats]);

  // Mark active chat as read when opened or switched
  useEffect(() => {
    if (currentChat && currentUser && onMarkChatAsRead) {
      onMarkChatAsRead(currentChat.id);
    }
  }, [currentChat?.id, currentUser?.id, chats]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages, activeChatId]);

  // Find other participant for direct chat
  const otherParticipantId = currentChat?.type === 'direct' && currentChat?.participants
    ? currentChat.participants.find(pId => pId !== currentUser.id) 
    : null;
  const otherContact = otherParticipantId 
    ? contacts.find(c => c.id === otherParticipantId) 
    : null;

  // Handle file select (image or PDF under 3MB)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      alert('केवल JPG/PNG फ़ोटो या PDF दस्तावेज़ ही समर्थित हैं।');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('कृपया 3 MB से छोटी फ़ोटो या PDF चुनें।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        name: file.name,
        type: isImage ? 'image' : 'pdf',
        size: `${Math.round(file.size / 1024)} KB`,
        url: event.target.result
      });
    };
    reader.readAsDataURL(file);
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();
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
  };

  // Start new direct chat with selected officer
  const handleStartDirectChat = (contact) => {
    setShowNewDirectModal(false);
    setActiveTab('direct');
    
    // Check if chat already exists
    const existing = chats.find(c => 
      c.type === 'direct' && 
      c.participants?.includes(currentUser.id) && 
      c.participants?.includes(contact.id)
    );

    if (existing) {
      setActiveChatId(existing.id);
      setMobileView('chat');
    } else {
      onSendDirectMessage(currentUser, contact, `जय हिंद ${contact.name} जी!`);
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

  // Helper: toggle participant selection for group creation
  const toggleGroupParticipant = (contactId) => {
    setSelectedGroupParticipants(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId) 
        : [...prev, contactId]
    );
  };

  // Filter contacts for "New Direct Message" modal
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
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '1050px', 
          width: '95vw', 
          height: '86vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0, 
          overflow: 'hidden',
          borderRadius: '16px'
        }}
      >
        {/* Modal Top Bar */}
        <div style={{ 
          padding: '0.85rem 1.25rem', 
          background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', 
          borderBottom: '1px solid rgba(229,184,66,0.3)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              background: 'rgba(229,184,66,0.2)',
              border: '1px solid rgba(229,184,66,0.5)',
              padding: '7px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} color="var(--gold-primary, #e5b842)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--gold-light, #fbbf24)' }}>
                विभागीय मैसेज बॉक्स (Police Message Box)
              </h2>
              <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)' }}>
                पीयर-टू-पीयर सीधा संवाद (Direct P2P) • समूह चैट (Group Channels)
              </span>
            </div>
          </div>

          {/* Tab Selector: Direct vs Group */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.4)', padding: '3px', borderRadius: '10px' }}>
            <button
              onClick={() => { setActiveTab('direct'); setMobileView('list'); }}
              style={{
                background: activeTab === 'direct' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'transparent',
                color: activeTab === 'direct' ? '#fff' : 'rgba(255,255,255,0.7)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <User size={14} />
              <span>व्यक्तिगत मैसेज (P2P)</span>
              {directChats.length > 0 && (
                <span style={{
                  background: 'rgba(229,184,66,0.3)',
                  color: 'var(--gold-light, #fbbf24)',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {directChats.length}
                </span>
              )}
            </button>

            <button
              onClick={() => { setActiveTab('group'); setMobileView('list'); }}
              style={{
                background: activeTab === 'group' ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : 'transparent',
                color: activeTab === 'group' ? '#fff' : 'rgba(255,255,255,0.7)',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Users size={14} />
              <span>समूह चैट (Groups)</span>
              {groupChats.length > 0 && (
                <span style={{
                  background: 'rgba(229,184,66,0.3)',
                  color: 'var(--gold-light, #fbbf24)',
                  fontSize: '0.7rem',
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {groupChats.length}
                </span>
              )}
            </button>
          </div>

          <button 
            className="close-btn" 
            onClick={onClose}
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Content Layout (Sidebar + Chat Area) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT SIDEBAR: Conversations List */}
          <div style={{
            width: '320px',
            minWidth: '280px',
            borderRight: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10, 16, 30, 0.95)'
          }}>
            {/* Action Bar (Search + New Action) */}
            <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '9px', top: '9px', color: 'rgba(255,255,255,0.4)' }} />
                  <input
                    type="text"
                    placeholder="चैट खोजें..."
                    value={chatSearch}
                    onChange={e => setChatSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px 6px 28px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>

                {activeTab === 'direct' ? (
                  <button
                    onClick={() => setShowNewDirectModal(true)}
                    className="btn btn-primary"
                    style={{ padding: '6px 10px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                    title="किसी भी अधिकारी को नया मैसेज भेजें"
                  >
                    <Plus size={14} />
                    <span>नया</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowNewGroupModal(true)}
                    className="btn btn-primary"
                    style={{ padding: '6px 10px', fontSize: '0.76rem', whiteSpace: 'nowrap' }}
                    title="नया पुलिस समूह बनाएं"
                  >
                    <Plus size={14} />
                    <span>समूह</span>
                  </button>
                )}
              </div>
            </div>

            {/* Conversation List Items */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChatList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem' }}>
                  {activeTab === 'direct' ? (
                    <div>
                      <User size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                      <p>कोई सीधा मैसेज नहीं मिला।</p>
                      <button 
                        onClick={() => setShowNewDirectModal(true)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
                      >
                        ➕ नया मैसेज भेजें
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Users size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                      <p>कोई समूह चैट उपलब्ध नहीं है।</p>
                      <button 
                        onClick={() => setShowNewGroupModal(true)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}
                      >
                        ➕ नया समूह बनाएं
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                filteredChatList.map(chat => {
                  const isSelected = currentChat?.id === chat.id;
                  const unreadCount = getUnreadCountForChat(chat, currentUser.id);

                  // Other contact in direct chat
                  let displayPhoto = null;
                  let displayName = chat.title;
                  let displaySub = chat.district;

                  if (chat.type === 'direct') {
                    const peerId = chat.participants?.find(p => p !== currentUser.id);
                    const peerObj = contacts.find(c => c.id === peerId);
                    if (peerObj) {
                      displayPhoto = peerObj.uniformPhoto;
                      displayName = peerObj.name;
                      displaySub = `${peerObj.post} • ${peerObj.office || peerObj.district}`;
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
                        padding: '0.75rem 0.9rem',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        background: isSelected 
                          ? 'rgba(30, 58, 138, 0.4)' 
                          : unreadCount > 0 
                            ? 'rgba(229, 184, 66, 0.08)' 
                            : 'transparent',
                        borderLeft: isSelected 
                          ? '4px solid var(--gold-primary, #e5b842)' 
                          : unreadCount > 0
                            ? '4px solid #3b82f6'
                            : '4px solid transparent',
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
                          background: 'rgba(255,255,255,0.08)',
                          border: unreadCount > 0 ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {displayPhoto ? (
                            <img src={displayPhoto} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : chat.type === 'group' ? (
                            <Users size={18} color="var(--gold-primary, #e5b842)" />
                          ) : (
                            <span style={{ fontWeight: 700, color: 'var(--gold-primary)', fontSize: '0.9rem' }}>
                              {displayName.charAt(0)}
                            </span>
                          )}
                        </div>

                        {unreadCount > 0 && (
                          <span style={{
                            position: 'absolute',
                            top: -2,
                            right: -2,
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: '2px solid #000'
                          }} />
                        )}
                      </div>

                      {/* Content Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.85rem',
                            fontWeight: unreadCount > 0 ? 800 : 600,
                            color: unreadCount > 0 ? '#fff' : 'rgba(255,255,255,0.9)',
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
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '10px'
                            }}>
                              {unreadCount}
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--gold-primary, #e5b842)', opacity: 0.9, marginTop: '1px' }}>
                          {displaySub}
                        </div>

                        <div style={{
                          fontSize: '0.72rem',
                          color: unreadCount > 0 ? '#fde047' : 'rgba(255,255,255,0.5)',
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

          {/* RIGHT MAIN AREA: Active Conversation */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(7, 12, 23, 0.98)' }}>
            {currentChat ? (
              <>
                {/* Chat Top Banner */}
                <div style={{
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(255,255,255,0.1)',
                      border: '2px solid var(--gold-primary, #e5b842)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {otherContact?.uniformPhoto ? (
                        <img src={otherContact.uniformPhoto} alt={otherContact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : currentChat.type === 'group' ? (
                        <Users size={22} color="var(--gold-primary)" />
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--gold-primary)' }}>
                          {otherContact ? otherContact.name.charAt(0) : currentChat.title.charAt(0)}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                          {currentChat.type === 'direct' && otherContact ? otherContact.name : currentChat.title}
                        </h3>
                        {currentChat.type === 'direct' && otherContact?.uniformPhoto && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            fontSize: '0.68rem',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            🛡️ वर्दी सत्यापित
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                        {currentChat.type === 'direct' && otherContact ? (
                          `${otherContact.post} • ${otherContact.office || ''} (${otherContact.district}) • PNO: ${otherContact.pno || 'N/A'}`
                        ) : (
                          `${currentChat.participants?.length || 0} सदस्य • ${currentChat.description || 'विभागीय समूह'}`
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons for Direct Chat (Call / WhatsApp) */}
                  {currentChat.type === 'direct' && otherContact && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <a 
                        href={`tel:${otherContact.phone}`}
                        className="btn btn-call"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        title="डायरेक्ट कॉल करें"
                      >
                        <Phone size={13} />
                        <span>कॉल</span>
                      </a>
                      <a 
                        href={`https://wa.me/${otherContact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`जय हिंद, ${otherContact.name} जी!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-wa"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                        title="वॉट्सऐप पर संपर्क करें"
                      >
                        <MessageSquare size={13} />
                        <span>वॉट्सऐप</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Messages Scroll Area */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  {currentChat.messages && currentChat.messages.length > 0 ? (
                    currentChat.messages.map((msg, idx) => {
                      const isMe = msg.senderId === currentUser.id;
                      const hasRead = msg.readBy && msg.readBy.length > 1;

                      return (
                        <div
                          key={msg.id || idx}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '75%',
                            alignSelf: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          {/* Sender title if group or peer */}
                          {!isMe && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--gold-primary)', marginBottom: '2px', marginLeft: '6px', fontWeight: 600 }}>
                              {msg.senderName} {msg.senderPost ? `(${msg.senderPost})` : ''}
                            </div>
                          )}

                          {/* Bubble Container */}
                          <div style={{
                            background: isMe 
                              ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' 
                              : 'rgba(30, 41, 59, 0.9)',
                            border: isMe 
                              ? '1px solid rgba(59, 130, 246, 0.5)' 
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                            padding: '0.65rem 0.85rem',
                            color: '#fff',
                            fontSize: '0.85rem',
                            lineHeight: 1.45,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                            wordBreak: 'break-word'
                          }}>
                            {/* Message Text */}
                            {msg.text && (
                              <div style={{ whiteSpace: 'pre-wrap' }}>
                                {msg.text}
                              </div>
                            )}

                            {/* Attached File Preview if any */}
                            {msg.file && (
                              <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}>
                                {msg.file.type === 'image' ? (
                                  <div>
                                    <img 
                                      src={msg.file.url} 
                                      alt="Attachment" 
                                      style={{ maxWidth: '200px', maxHeight: '140px', borderRadius: '6px', objectFit: 'cover' }} 
                                    />
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                      {msg.file.name} ({msg.file.size})
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileText size={20} color="var(--gold-primary)" />
                                    <div>
                                      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{msg.file.name}</div>
                                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>PDF दस्तावेज़ ({msg.file.size})</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Timestamp & Read Tick */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              marginTop: '4px',
                              fontSize: '0.66rem',
                              color: 'rgba(255,255,255,0.6)'
                            }}>
                              <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isMe && (
                                <span style={{ color: hasRead ? '#60a5fa' : 'rgba(255,255,255,0.5)' }} title={hasRead ? 'पढ़ा गया (Read)' : 'प्रेषित (Delivered)'}>
                                  ✓✓
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', margin: 'auto', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                      <p>अभी तक कोई संदेश प्रेषित नहीं किया गया है।</p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--gold-primary)' }}>नीचे इनपुट बॉक्स में संदेश लिखकर संवाद शुरू करें।</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attachment Badge Preview above Input */}
                {attachedFile && (
                  <div style={{
                    padding: '0.4rem 1rem',
                    background: 'rgba(30, 58, 138, 0.4)',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    color: '#93c5fd'
                  }}>
                    <span>📎 संलग्न फ़ाइल: <strong>{attachedFile.name}</strong> ({attachedFile.size})</span>
                    <button 
                      onClick={() => setAttachedFile(null)} 
                      style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Message Input Form */}
                <form 
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(15, 23, 42, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {/* File attach button */}
                  <label style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--gold-primary, #e5b842)',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.15)'
                  }} title="फ़ोटो या PDF संलग्न करें (अधिकतम 3 MB)">
                    <Paperclip size={18} />
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{ display: 'none' }} 
                    />
                  </label>

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder="संदेश लिखें (जय हिंद, अग्रिम सूचना, आदि)..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!inputText.trim() && !attachedFile}
                    style={{
                      padding: '8px 16px',
                      opacity: (!inputText.trim() && !attachedFile) ? 0.5 : 1,
                      cursor: (!inputText.trim() && !attachedFile) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <Send size={16} />
                    <span>भेजें</span>
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'rgba(255,255,255,0.4)', padding: '2rem' }}>
                <Mail size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                <h3 style={{ color: '#fff', fontSize: '1.1rem' }}>मैसेज बॉक्स में आपका स्वागत है</h3>
                <p style={{ fontSize: '0.82rem', maxWidth: '380px', margin: '0.5rem auto 1rem' }}>
                  बाएँ मेनू से किसी वार्तालाप का चयन करें या ऊपर <strong>"नया"</strong> बटन दबाकर किसी भी अधिकारी को सीधा संदेश भेजें।
                </p>
                <button 
                  onClick={() => setShowNewDirectModal(true)}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem' }}
                >
                  <Plus size={14} />
                  <span>नया पीयर-टू-पीयर संदेश शुरू करें</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SUB-MODAL 1: "नया डायरेक्ट मैसेज भेजें" (Choose Officer) */}
        {showNewDirectModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0f1d38',
              border: '2px solid var(--gold-primary)',
              borderRadius: '14px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh'
            }}>
              <div style={{
                padding: '0.85rem 1.25rem',
                background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="var(--gold-primary)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-light)' }}>
                    नया मैसेज: अधिकारी चुनें (Select Officer)
                  </h3>
                </div>
                <button 
                  onClick={() => setShowNewDirectModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <input
                  type="text"
                  placeholder="अधिकारी का नाम, PNO, थाना या ज़िला खोजें..."
                  value={contactSearchQuery}
                  onChange={e => setContactSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Officers List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {eligibleDirectContacts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                    कोई अधिकारी नहीं मिला।
                  </div>
                ) : (
                  eligibleDirectContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartDirectChat(contact)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.04)',
                        marginBottom: '0.4rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(30,58,138,0.3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--gold-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {contact.uniformPhoto ? (
                          <img src={contact.uniformPhoto} alt={contact.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontWeight: 700, color: 'var(--gold-primary)' }}>
                            {contact.name.charAt(0)}
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff' }}>
                          {contact.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--gold-primary)' }}>
                          {contact.post} • {contact.office} ({contact.district})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                          PNO: {contact.pno} • फोन: {contact.phone}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                      >
                        संदेश भेजें
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL 2: "नया पुलिस समूह बनाएं" (Create Group) */}
        {showNewGroupModal && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}>
            <form 
              onSubmit={handleCreateGroupSubmit}
              style={{
                width: '100%',
                maxWidth: '540px',
                background: '#0f1d38',
                border: '2px solid var(--gold-primary)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh'
              }}
            >
              <div style={{
                padding: '0.85rem 1.25rem',
                background: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--gold-primary)" />
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--gold-light)' }}>
                    नया समूह चैट बनाएं (Create Police Group)
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--gold-light)', marginBottom: '4px', fontWeight: 600 }}>
                    समूह का नाम (Group Title) *
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. थाना हजरतगंज टीम, आगामी मेला ड्यूटी दल..."
                    value={newGroupTitle}
                    onChange={e => setNewGroupTitle(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--gold-light)', marginBottom: '4px', fontWeight: 600 }}>
                    विवरण / उद्देश्य (Description)
                  </label>
                  <input
                    type="text"
                    placeholder="विभागीय समन्वय व आदेश प्रसारित करने हेतु"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                      सदस्य जोड़ें ({selectedGroupParticipants.length} चयनित)
                    </label>
                    <input
                      type="text"
                      placeholder="अधिकारी खोजें..."
                      value={groupMemberSearch}
                      onChange={e => setGroupMemberSearch(e.target.value)}
                      style={{
                        padding: '3px 8px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.74rem'
                      }}
                    />
                  </div>

                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)',
                    padding: '4px'
                  }}>
                    {eligibleDirectContacts
                      .filter(c => !groupMemberSearch.trim() || c.name.toLowerCase().includes(groupMemberSearch.toLowerCase()))
                      .map(contact => {
                        const isSelected = selectedGroupParticipants.includes(contact.id);
                        return (
                          <div
                            key={contact.id}
                            onClick={() => toggleGroupParticipant(contact.id)}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              background: isSelected ? 'rgba(30,58,138,0.4)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              marginBottom: '2px'
                            }}
                          >
                            <span style={{ fontSize: '0.8rem', color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                              {contact.name} ({contact.post}, {contact.district})
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ accentColor: 'var(--gold-primary)' }}
                            />
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <div style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewGroupModal(false)}
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!newGroupTitle.trim()}
                >
                  समूह बनाएं
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
