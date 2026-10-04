import React, { useState, useEffect, useRef } from 'react';
import { 
  X, MessageSquare, Send, Paperclip, Image, FileText, Users, User,
  ShieldAlert, Phone, Shield, Plus, Search, Check, Download, AlertCircle, Eye,
  ArrowLeft, CheckCircle2
} from 'lucide-react';
import { getChatsForUser } from '../utils/storage';

export default function PoliceChatModal({ 
  isOpen, 
  onClose, 
  chats, 
  contacts, 
  currentUser,
  activeChatId,
  setActiveChatId,
  onSendDirectMessage,
  onSendGroupMessage,
  onCreateGroupChat,
  onAppendMessage
}) {
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'direct' | 'group' | 'supervisory'
  const [chatSearch, setChatSearch] = useState('');
  
  // Mobile responsive view toggle: 'list' | 'chat'
  const [mobileView, setMobileView] = useState('list');

  // Message input state
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState(null); // { name, type, size, url }
  const [alertSupervisorsToggle, setAlertSupervisorsToggle] = useState(true);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Sub-modal states
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showNewDirectModal, setShowNewDirectModal] = useState(false);
  
  // Group creation form
  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Image viewer modal
  const [previewMedia, setPreviewMedia] = useState(null);

  if (!isOpen || !currentUser) return null;

  // Filter chats visible to current user
  const userVisibleChats = getChatsForUser(chats, contacts, currentUser);

  // Set default active chat if none selected or if activeChatId is not in visible list
  useEffect(() => {
    if ((!activeChatId || !userVisibleChats.some(c => c.id === activeChatId)) && userVisibleChats.length > 0) {
      setActiveChatId(userVisibleChats[0].id);
    }
  }, [chats, activeChatId, currentUser]);

  // When activeChatId changes or window opens, set mobileView to 'chat' if activeChatId is valid
  useEffect(() => {
    if (activeChatId) {
      setMobileView('chat');
    }
  }, [activeChatId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId]);

  const currentChat = userVisibleChats.find(c => c.id === activeChatId) || userVisibleChats[0];

  // Other participant for 1-on-1 direct chat
  const otherParticipantId = currentChat?.type === 'direct' && currentChat?.participants
    ? currentChat.participants.find(pId => pId !== currentUser.id) 
    : null;
  const otherContact = otherParticipantId 
    ? contacts.find(c => c.id === otherParticipantId) 
    : null;

  // Is supervisory viewer (e.g. current user is SHO/CO/SP reviewing subordinate chat)
  const isSupervisoryViewer = currentChat?.type === 'direct' && 
    currentChat?.participants && 
    !currentChat.participants.includes(currentUser.id);

  // Filter chats by tab
  const filteredChatList = userVisibleChats.filter(c => {
    if (activeFilterTab === 'direct' && c.type !== 'direct') return false;
    if (activeFilterTab === 'group' && c.type !== 'group') return false;
    if (activeFilterTab === 'supervisory' && (!c.supervisoryChain || c.participants?.includes(currentUser.id))) return false;

    if (chatSearch.trim()) {
      const q = chatSearch.toLowerCase();
      const titleMatch = (c.title || '').toLowerCase().includes(q);
      const lastMsgMatch = (c.lastMessage || '').toLowerCase().includes(q);
      return titleMatch || lastMsgMatch;
    }
    return true;
  });

  // Handle switching tabs
  const handleTabChange = (tabKey) => {
    setActiveFilterTab(tabKey);
    const subList = userVisibleChats.filter(c => {
      if (tabKey === 'direct') return c.type === 'direct';
      if (tabKey === 'group') return c.type === 'group';
      if (tabKey === 'supervisory') return c.supervisoryChain && !c.participants?.includes(currentUser.id);
      return true;
    });
    if (subList.length > 0 && (!currentChat || !subList.some(c => c.id === currentChat.id))) {
      setActiveChatId(subList[0].id);
    }
  };

  // Handle file select (JPG or PDF with 2MB safety check)
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      alert('केवल JPG/PNG फ़ोटो या PDF दस्तावेज़ ही समर्थित हैं।');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('ब्राउज़र स्टोरेज सुरक्षा हेतु कृपया 2 MB से छोटी फ़ोटो या PDF चुनें।');
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

    if (onAppendMessage) {
      onAppendMessage(currentChat.id, currentUser, inputText, attachedFile, alertSupervisorsToggle);
    } else if (currentChat.type === 'direct') {
      const recipient = otherContact || contacts.find(c => c.id === currentChat.participants?.[1]) || contacts[0];
      onSendDirectMessage(currentUser, recipient, inputText, attachedFile, alertSupervisorsToggle);
    } else {
      onSendGroupMessage(currentChat.id, currentUser, inputText, attachedFile);
    }

    setInputText('');
    setAttachedFile(null);
  };

  // Create Group
  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    if (!newGroupTitle.trim() || selectedGroupParticipants.length === 0) {
      alert('कृपया ग्रुप का नाम एवं कम से कम एक सदस्य अवश्य चुनें।');
      return;
    }

    onCreateGroupChat(currentUser, newGroupTitle, selectedGroupParticipants, newGroupDesc);
    setShowNewGroupModal(false);
    setNewGroupTitle('');
    setNewGroupDesc('');
    setSelectedGroupParticipants([]);
    setActiveFilterTab('group');
    setMobileView('chat');
  };

  // Start direct chat with officer
  const handleSelectOfficerForDirect = (officer) => {
    if (officer.id === currentUser.id) {
      alert('आप स्वयं के साथ चैट नहीं कर सकते। कृपया किसी अन्य अधिकारी को चुनें।');
      return;
    }

    const existing = chats.find(c => 
      c.type === 'direct' && 
      c.participants?.includes(currentUser.id) && 
      c.participants?.includes(officer.id)
    );

    if (existing) {
      setActiveChatId(existing.id);
    } else {
      onSendDirectMessage(currentUser, officer, `जय हिंद, ${officer.name} जी!`, null, true);
    }
    setShowNewDirectModal(false);
    setActiveFilterTab('direct');
    setMobileView('chat');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '1100px', 
          width: '96vw',
          height: '88vh', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: 0,
          gap: 0,
          overflow: 'hidden',
          position: 'relative'
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--glass-border-light)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 58, 138, 0.45))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Mobile Back button when in chat view */}
            {mobileView === 'chat' && (
              <button 
                className="btn btn-secondary mobile-only-btn" 
                onClick={() => setMobileView('list')}
                style={{ padding: '4px 8px', fontSize: '0.78rem' }}
                title="चैट सूची पर वापस जाएं"
              >
                <ArrowLeft size={16} />
                <span>चैट्स</span>
              </button>
            )}

            <div className="police-badge-icon" style={{ width: '36px', height: '36px' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                पुलिस आंतरिक चैट एवं ग्रुप संवाद
                <span className="dept-tag" style={{ fontSize: '0.7rem' }}>सुरक्षित नेटवर्क</span>
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                अंतर-जनपद संदेश • पर्यवेक्षी प्रतिलिपि (SHO, CO, SP) • JPG एवं PDF साझाकरण
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                setShowNewDirectModal(true);
                setGroupSearchQuery('');
              }}
              title="किसी भी पुलिस अधिकारी को व्यक्तिगत संदेश भेजें"
            >
              <Plus size={14} />
              <span>नया संदेश</span>
            </button>

            <button 
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => {
                setShowNewGroupModal(true);
                setSelectedGroupParticipants([]);
                setGroupSearchQuery('');
              }}
              title="WhatsApp की तरह पुलिस ग्रुप बनाएं"
            >
              <Users size={14} />
              <span>+ नया ग्रुप</span>
            </button>

            <button className="close-btn" onClick={onClose} style={{ marginLeft: '0.25rem' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Split Layout: Left Sidebar (Chats) + Right (Active Chat Room) */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          
          {/* Left Sidebar: List of Direct Chats and Groups */}
          <div 
            className={`chat-sidebar ${mobileView === 'chat' ? 'hide-on-mobile' : ''}`}
            style={{
              width: '320px',
              borderRight: '1px solid var(--glass-border-light)',
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(15, 23, 42, 0.65)',
              flexShrink: 0
            }}
          >
            {/* Search input */}
            <div style={{ padding: '0.65rem 0.75rem' }}>
              <div className="search-input-wrapper">
                <Search size={14} className="search-icon" style={{ left: '10px' }} />
                <input
                  type="text"
                  className="main-search-input"
                  style={{ padding: '0.4rem 0.75rem 0.4rem 1.85rem', fontSize: '0.82rem' }}
                  placeholder="चैट्स खोजें..."
                  value={chatSearch}
                  onChange={e => setChatSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '3px',
              padding: '0 0.5rem 0.5rem 0.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              overflowX: 'auto'
            }}>
              <button 
                className={`admin-tab ${activeFilterTab === 'all' ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => handleTabChange('all')}
              >
                सभी ({userVisibleChats.length})
              </button>
              <button 
                className={`admin-tab ${activeFilterTab === 'direct' ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => handleTabChange('direct')}
              >
                व्यक्तिगत
              </button>
              <button 
                className={`admin-tab ${activeFilterTab === 'group' ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => handleTabChange('group')}
              >
                ग्रुप्स
              </button>
              <button 
                className={`admin-tab ${activeFilterTab === 'supervisory' ? 'active' : ''}`}
                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                onClick={() => handleTabChange('supervisory')}
                title="SHO / CO / SP पर्यवेक्षी समीक्षा"
              >
                🛡️ पर्यवेक्षी
              </button>
            </div>

            {/* Chats List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredChatList.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p>कोई चैट उपलब्ध नहीं है।</p>
                  <p style={{ fontSize: '0.76rem', marginTop: '4px' }}>
                    ऊपर <strong>"+ नया ग्रुप"</strong> या <strong>"नया संदेश"</strong> दबाकर संवाद शुरू करें।
                  </p>
                </div>
              ) : (
                filteredChatList.map(c => {
                  const isSelected = currentChat?.id === c.id;
                  const isGroup = c.type === 'group';
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setActiveChatId(c.id);
                        setMobileView('chat');
                      }}
                      style={{
                        padding: '0.75rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(229, 184, 66, 0.14)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--gold-primary)' : '3px solid transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="avatar-badge" style={{ 
                          width: '36px', 
                          height: '36px', 
                          fontSize: '0.88rem', 
                          flexShrink: 0,
                          background: isGroup ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : undefined 
                        }}>
                          {isGroup ? <Users size={16} /> : (c.title ? c.title.charAt(0) : 'P')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ 
                              fontSize: '0.86rem', 
                              fontWeight: isSelected ? 700 : 600, 
                              color: isSelected ? 'var(--gold-light)' : 'var(--text-bright)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {c.title}
                            </h4>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            {c.supervisoryChain && (
                              <span style={{ fontSize: '0.66rem', color: '#93c5fd', background: 'rgba(59,130,246,0.2)', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>
                                SHO/CO/SP
                              </span>
                            )}
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-dim)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1
                            }}>
                              {c.lastMessage || 'नया संवाद शुरू करें'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Main Chat Window */}
          <div 
            className={`chat-main-window ${mobileView === 'list' ? 'hide-on-mobile' : ''}`}
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--bg-main)', 
              minWidth: 0 
            }}
          >
            {currentChat ? (
              <>
                {/* Active Chat Header */}
                <div style={{
                  padding: '0.65rem 1.25rem',
                  borderBottom: '1px solid var(--glass-border-light)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Back to list button */}
                    <button 
                      className="btn btn-secondary mobile-only-btn" 
                      onClick={() => setMobileView('list')}
                      style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                      title="चैट सूची पर वापस जाएं"
                    >
                      <ArrowLeft size={14} />
                      <span>सूची</span>
                    </button>

                    <div>
                      <h3 style={{ fontSize: '0.98rem', color: 'var(--text-bright)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {currentChat.type === 'group' ? <Users size={17} color="var(--gold-primary)" /> : <User size={17} color="var(--gold-primary)" />}
                        {currentChat.title}
                      </h3>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                        {currentChat.type === 'group' 
                          ? `${currentChat.participants?.length || 1} सदस्य • ${currentChat.description || 'आधिकारिक ग्रुप'}` 
                          : otherContact 
                            ? `${otherContact.post} • जनपद: ${otherContact.district} (${otherContact.office})` 
                            : 'आंतरिक संवाद'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Direct call action button for 1-on-1 */}
                  {otherContact && (
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <a href={`tel:${otherContact.phone}`} className="btn btn-call" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                        <Phone size={13} />
                        कॉल
                      </a>
                    </div>
                  )}
                </div>

                {/* Supervisory Notification Notice Banner */}
                {currentChat.supervisoryChain && (
                  <div style={{
                    background: 'rgba(30, 58, 138, 0.35)',
                    borderBottom: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '5px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.76rem',
                    color: '#93c5fd',
                    flexShrink: 0
                  }}>
                    <ShieldAlert size={14} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>पर्यवेक्षी पारदर्शिता (Chain of Command):</strong> इस अंतर-जनपद संवाद की प्रतिलिपि संबंधित 
                      <strong> थाना प्रभारी (SHO)</strong>, <strong>क्षेत्राधिकारी (CO)</strong> एवं <strong>पुलिस अधीक्षक (SP)</strong> के पास भी सुरक्षित एवं दृश्यमान रहती है।
                    </span>
                  </div>
                )}

                {/* Messages Stream */}
                <div style={{
                  flex: 1,
                  padding: '1rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}>
                  {currentChat.messages && currentChat.messages.length > 0 ? (
                    currentChat.messages.map((m) => {
                      const isMe = m.senderId === currentUser.id;
                      return (
                        <div 
                          key={m.id} 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                          }}
                        >
                          <div style={{ 
                            fontSize: '0.72rem', 
                            color: 'var(--text-dim)', 
                            marginBottom: '3px',
                            padding: '0 4px'
                          }}>
                            <strong>{m.senderName}</strong> ({m.senderPost}, {m.senderDistrict}) • {new Date(m.timestamp).toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          <div style={{
                            maxWidth: '78%',
                            background: isMe 
                              ? 'linear-gradient(135deg, #1e3a8a, #1e40af)' 
                              : 'rgba(30, 41, 59, 0.85)',
                            border: isMe 
                              ? '1px solid rgba(59, 130, 246, 0.4)' 
                              : '1px solid var(--glass-border-light)',
                            borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                            padding: '0.75rem 1rem',
                            color: 'var(--text-bright)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}>
                            {/* Text message */}
                            {m.text && (
                              <p style={{ fontSize: '0.88rem', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                                {m.text}
                              </p>
                            )}

                            {/* File Attachment Rendering (JPG or PDF) */}
                            {m.file && (
                              <div style={{ 
                                background: 'rgba(0,0,0,0.3)', 
                                borderRadius: '8px', 
                                padding: '0.5rem', 
                                border: '1px solid rgba(255,255,255,0.1)' 
                              }}>
                                {m.file.type === 'image' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <img 
                                      src={m.file.url} 
                                      alt={m.file.name}
                                      onClick={() => setPreviewMedia(m.file)}
                                      style={{
                                        maxWidth: '260px',
                                        maxHeight: '180px',
                                        borderRadius: '6px',
                                        objectFit: 'cover',
                                        cursor: 'pointer',
                                        border: '1px solid rgba(229,184,66,0.3)'
                                      }}
                                      title="बड़ा देखने के लिए क्लिक करें"
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                      <span>📷 {m.file.name} ({m.file.size})</span>
                                      <a href={m.file.url} download={m.file.name} style={{ color: 'var(--gold-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <Download size={12} /> डाउनलोड
                                      </a>
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ background: '#ef4444', padding: '6px', borderRadius: '6px', color: '#fff' }}>
                                      <FileText size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {m.file.name}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                        PDF दस्तावेज़ • {m.file.size}
                                      </div>
                                    </div>
                                    <a 
                                      href={m.file.url} 
                                      download={m.file.name} 
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                    >
                                      <Download size={12} /> डाउनलोड
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Supervisory alert badge */}
                            {m.supervisoryAlert && (
                              <div style={{ fontSize: '0.68rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: '3px', opacity: 0.9 }}>
                                <Shield size={10} />
                                SHO, CO, SP को प्रतिलिपि प्रेषित
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem', fontSize: '0.85rem' }}>
                      इस संवाद में अभी कोई संदेश नहीं है। नीचे से अपना पहला संदेश या फ़ाइल भेजें।
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attached file preview before sending */}
                {attachedFile && (
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(30, 58, 138, 0.4)',
                    borderTop: '1px solid var(--glass-border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                      {attachedFile.type === 'image' ? <Image size={16} color="var(--gold-primary)" /> : <FileText size={16} color="#ef4444" />}
                      <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{attachedFile.name}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>({attachedFile.size})</span>
                    </div>
                    <button 
                      onClick={() => setAttachedFile(null)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger-red)', cursor: 'pointer' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Message Input Form */}
                <form onSubmit={handleSendMessage} style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid var(--glass-border-light)',
                  background: 'rgba(15, 23, 42, 0.95)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  flexShrink: 0
                }}>
                  {/* Supervisory Notification Alert Checkbox for direct chats */}
                  {currentChat.type === 'direct' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--gold-light)' }}>
                      <input
                        type="checkbox"
                        id="supAlert"
                        checked={alertSupervisorsToggle}
                        onChange={e => setAlertSupervisorsToggle(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor="supAlert" style={{ cursor: 'pointer' }}>
                        🛡️ प्राप्तकर्ता के थाना प्रभारी (SHO), क्षेत्राधिकारी (CO) एवं SP को भी संदेश नोटिफिकेशन अलर्ट भेजें
                      </label>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {/* File attach button (JPG / PDF) */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.6rem 0.85rem' }}
                      onClick={() => fileInputRef.current?.click()}
                      title="JPG/PNG फोटो या PDF फ़ाइल संलग्न करें (अधिकतम 2 MB)"
                    >
                      <Paperclip size={18} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />

                    {/* Main text input */}
                    <input
                      type="text"
                      className="form-input"
                      placeholder="संदेश लिखें (Enter दबाकर भेजें)..."
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      style={{ flex: 1 }}
                    />

                    {/* Send Button */}
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem' }}>
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '2rem', gap: '1rem', textAlign: 'center' }}>
                <MessageSquare size={48} color="var(--gold-primary)" style={{ opacity: 0.6 }} />
                <div>
                  <h3 style={{ color: 'var(--text-bright)', fontSize: '1.1rem', fontWeight: 700 }}>आंतरिक पुलिस संवाद</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', maxWidth: '420px', marginTop: '4px' }}>
                    कृपया बाईं ओर से कोई चैट या ग्रुप चुनें, अथवा नया ग्रुप बनाकर बातचीत शुरू करें।
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setShowNewGroupModal(true)}>
                    <Users size={16} /> + नया ग्रुप बनाएं
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowNewDirectModal(true)}>
                    <Plus size={16} /> नया संदेश भेजें
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SUB-MODAL 1: CREATE GROUP CHAT */}
        {showNewGroupModal && (
          <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowNewGroupModal(false)}>
            <div className="modal-content" style={{ maxWidth: '560px', width: '92vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-bright)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={20} color="var(--gold-primary)" />
                  नया पुलिस ग्रुप बनाएं (WhatsApp Style)
                </h3>
                <button className="close-btn" onClick={() => setShowNewGroupModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">ग्रुप का नाम (Group Name) <span className="req">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. थाना हजरतगंज टीम / अंतर-जनपद टास्क फोर्स"
                    value={newGroupTitle}
                    onChange={e => setNewGroupTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ग्रुप का उद्देश्य (Description)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. त्योहार सुरक्षा व्यवस्था एवं त्वरित सूचना आदान-प्रदान"
                    value={newGroupDesc}
                    onChange={e => setNewGroupDesc(e.target.value)}
                  />
                </div>

                {/* Member selection */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      सदस्य जोड़ें ({selectedGroupParticipants.length} चयनित) <span className="req">*</span>
                    </label>
                    {selectedGroupParticipants.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setSelectedGroupParticipants([])}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.74rem', cursor: 'pointer' }}
                      >
                        सभी हटाएं
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    className="form-input"
                    placeholder="नाम, पद या जनपद द्वारा खोजें..."
                    value={groupSearchQuery}
                    onChange={e => setGroupSearchQuery(e.target.value)}
                    style={{ marginBottom: '0.4rem', fontSize: '0.82rem' }}
                  />

                  {/* Selected members tag chips */}
                  {selectedGroupParticipants.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '0.5rem', maxHeight: '60px', overflowY: 'auto' }}>
                      {selectedGroupParticipants.map(id => {
                        const target = contacts.find(c => c.id === id);
                        return target ? (
                          <span 
                            key={id} 
                            style={{ 
                              background: 'rgba(229,184,66,0.18)', 
                              border: '1px solid rgba(229,184,66,0.3)', 
                              color: 'var(--gold-light)', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '0.74rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {target.name}
                            <X 
                              size={12} 
                              style={{ cursor: 'pointer' }} 
                              onClick={() => setSelectedGroupParticipants(prev => prev.filter(p => p !== id))} 
                            />
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div style={{
                    maxHeight: '190px',
                    overflowY: 'auto',
                    border: '1px solid var(--glass-border-light)',
                    borderRadius: '8px',
                    padding: '0.4rem',
                    background: 'rgba(15, 23, 42, 0.7)'
                  }}>
                    {contacts
                      .filter(c => c.id !== currentUser.id && (c.status === 'approved' || c.status === 'active'))
                      .filter(c => {
                        if (!groupSearchQuery) return true;
                        const q = groupSearchQuery.toLowerCase();
                        return (c.name || '').toLowerCase().includes(q) || 
                               (c.district || '').toLowerCase().includes(q) || 
                               (c.post || '').toLowerCase().includes(q);
                      })
                      .map(c => {
                        const isChecked = selectedGroupParticipants.includes(c.id);
                        return (
                          <div 
                            key={c.id}
                            onClick={() => {
                              setSelectedGroupParticipants(prev => 
                                isChecked ? prev.filter(id => id !== c.id) : [...prev, c.id]
                              );
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isChecked ? 'rgba(229,184,66,0.15)' : 'transparent',
                              border: isChecked ? '1px solid rgba(229,184,66,0.3)' : '1px solid transparent',
                              marginBottom: '3px'
                            }}
                          >
                            <span style={{ fontSize: '0.84rem', color: isChecked ? 'var(--gold-light)' : 'var(--text-primary)' }}>
                              <strong>{c.name}</strong> ({c.post}, {c.district})
                            </span>
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              border: isChecked ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.3)',
                              background: isChecked ? 'var(--gold-primary)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isChecked && <Check size={12} color="#000" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNewGroupModal(false)}>
                    रद्द करें
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <CheckCircle2 size={15} /> ग्रुप बनाएं
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-MODAL 2: NEW DIRECT 1-ON-1 CHAT */}
        {showNewDirectModal && (
          <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowNewDirectModal(false)}>
            <div className="modal-content" style={{ maxWidth: '520px', width: '92vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={18} color="var(--gold-primary)" />
                  अधिकारी चुनें (Start Chat with Officer)
                </h3>
                <button className="close-btn" onClick={() => setShowNewDirectModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="अधिकारी का नाम, पद, PNO या जनपद खोजें..."
                  value={groupSearchQuery}
                  onChange={e => setGroupSearchQuery(e.target.value)}
                />

                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {contacts
                    .filter(c => c.id !== currentUser.id && (c.status === 'approved' || c.status === 'active'))
                    .filter(c => {
                      if (!groupSearchQuery) return true;
                      const q = groupSearchQuery.toLowerCase();
                      return (c.name || '').toLowerCase().includes(q) || 
                             (c.district || '').toLowerCase().includes(q) || 
                             (c.post || '').toLowerCase().includes(q) ||
                             (c.pno || '').toLowerCase().includes(q);
                    })
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectOfficerForDirect(c)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          background: 'rgba(15, 23, 42, 0.7)',
                          border: '1px solid var(--glass-border-light)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.88rem' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {c.post} • {c.district} ({c.office})
                          </div>
                        </div>
                        <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                          चैट शुरू करें
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-MODAL 3: IMAGE PREVIEW MODAL */}
        {previewMedia && (
          <div className="modal-overlay" style={{ zIndex: 1300 }} onClick={() => setPreviewMedia(null)}>
            <div className="modal-content" style={{ maxWidth: '800px', width: '92vw', textAlign: 'center', background: '#0b1120' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ color: 'var(--text-bright)' }}>{previewMedia.name}</h4>
                <button className="close-btn" onClick={() => setPreviewMedia(null)}>
                  <X size={20} />
                </button>
              </div>
              <img 
                src={previewMedia.url} 
                alt={previewMedia.name}
                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px', objectFit: 'contain' }}
              />
              <div style={{ marginTop: '0.75rem' }}>
                <a href={previewMedia.url} download={previewMedia.name} className="btn btn-primary">
                  <Download size={16} /> फ़ोटो डाउनलोड करें
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
