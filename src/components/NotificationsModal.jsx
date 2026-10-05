import React, { useState } from 'react';
import { 
  X, Bell, PlusCircle, Send, Trash2, Calendar, MapPin, 
  CheckCircle, ShieldAlert, MessageSquare, Shield, PhoneCall, PhoneMissed, KeyRound 
} from 'lucide-react';
import { DISTRICTS } from '../data/mockContacts';
import { callManager } from '../utils/webrtc';

export default function NotificationsModal({ 
  isOpen, 
  onClose, 
  notifications, 
  currentUser, 
  onAddNotification, 
  onDeleteNotification,
  onOpenChat,
  phonePermissions = [],
  onRespondPhonePermission,
  onStartCall
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'alerts' | 'create' | 'request'
  const [districtFilter, setDistrictFilter] = useState('all');

  // Form for Admin / Co-Admin broadcast
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    district: currentUser?.role === 'co_admin' ? currentUser.district : 'सभी ज़िले (All Districts)'
  });

  // Form for User notification request
  const [userRequest, setUserRequest] = useState({
    title: '',
    content: '',
    urgency: 'सामान्य'
  });

  const [feedbackMsg, setFeedbackMsg] = useState(null);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const canPublish = isAdmin || isCoAdmin;

  // Officer supervisory role check
  const isSP = currentUser?.post && (currentUser.post.includes('SP') || currentUser.post.includes('SSP') || currentUser.post.includes('अधीक्षक'));
  const isCO = currentUser?.post && (currentUser.post.includes('DSP') || currentUser.post.includes('क्षेत्राधिकारी'));
  const isSHO = currentUser?.post && (currentUser.post.includes('Inspector') || currentUser.post.includes('प्रभारी निरीक्षक'));

  // Filter notifications visible to current user
  const userVisibleNotifs = notifications.filter(n => {
    // 0. Personal targeted notifications (missed calls, phone permissions)
    if (n.targetUserId) {
      if (currentUser?.id === n.targetUserId) return true;
      if (isAdmin) return true;
      return false;
    }

    // 1. Direct Message notification visibility
    if (n.type === 'direct_message') {
      if (n.targetUserId && currentUser?.id === n.targetUserId) return true;
      if (isAdmin) return true;
      return false;
    }

    // 2. Inter-District Supervisory Alert visibility
    if (n.type === 'inter_district_alert') {
      if (isAdmin) return true;
      if (isCoAdmin && currentUser?.district === n.district) return true;
      if (n.targetUserId && currentUser?.id === n.targetUserId) return true;
      if (n.senderId && currentUser?.id === n.senderId) return true;
      if ((isSP || isCO || isSHO) && currentUser?.district === n.district) return true;
      return false; // Hidden from non-supervisory uninvolved users
    }

    // 3. District filter dropdown (if applied)
    if (districtFilter !== 'all' && n.district !== districtFilter && n.district !== 'सभी ज़िले (All Districts)') {
      return false;
    }

    // 4. Co-Admin scoping
    if (isCoAdmin && n.district !== currentUser.district && n.district !== 'सभी ज़िले (All Districts)') {
      return false;
    }

    // 5. Regular User scoping: their posted district + statewide circulars
    if (currentUser?.role === 'user' && n.district !== currentUser?.district && n.district !== 'सभी ज़िले (All Districts)') {
      return false;
    }

    return true;
  });

  const interDistrictAlerts = userVisibleNotifs.filter(n => n.type === 'inter_district_alert');

  // Currently displayed notices based on activeTab
  const displayedNotifs = activeTab === 'alerts' 
    ? interDistrictAlerts 
    : userVisibleNotifs;

  const handlePublishNotice = (e) => {
    e.preventDefault();
    if (!newNotice.title.trim() || !newNotice.content.trim()) return;

    onAddNotification({
      title: newNotice.title,
      content: newNotice.content,
      district: isCoAdmin ? currentUser.district : newNotice.district,
      postedBy: isCoAdmin ? `${currentUser.name} (Co-Admin, ${currentUser.district})` : 'मुख्यालय पुलिस महानिदेशक (Admin)',
      type: isCoAdmin ? 'district' : 'official'
    });

    setFeedbackMsg('सूचना सफलतापूर्वक जारी कर दी गई है!');
    setNewNotice({
      title: '',
      content: '',
      district: currentUser?.role === 'co_admin' ? currentUser.district : 'सभी ज़िले (All Districts)'
    });
    setTimeout(() => {
      setActiveTab('list');
      setFeedbackMsg(null);
    }, 1500);
  };

  const handleUserRequestSubmit = (e) => {
    e.preventDefault();
    if (!userRequest.title.trim() || !userRequest.content.trim()) return;

    // Creates notification tagged as request
    onAddNotification({
      title: `[अनुरोध] ${userRequest.title}`,
      content: `${userRequest.content} (अनुरोधकर्ता: ${currentUser?.name || 'कर्मचारी'}, ${currentUser?.district || 'ज़िला'}, संपर्क: ${currentUser?.phone || 'N/A'})`,
      district: currentUser?.district || 'सभी ज़िले (All Districts)',
      postedBy: `${currentUser?.name || 'कर्मचारी'} (User Request)`,
      type: 'request'
    });

    setFeedbackMsg('आपकी सूचना अनुरोध एडमिन / नोडल अधिकारी को भेज दी गई है!');
    setUserRequest({ title: '', content: '', urgency: 'सामान्य' });
    setTimeout(() => {
      setActiveTab('list');
      setFeedbackMsg(null);
    }, 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Bell size={22} color="var(--gold-primary)" />
            विभागीय सूचनाएं एवं आदेश (Notifications & Circulars)
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="admin-tabs" style={{ flexWrap: 'wrap' }}>
          <button 
            className={`admin-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Bell size={15} />
            सभी सूचनाएं ({userVisibleNotifs.length})
          </button>

          {interDistrictAlerts.length > 0 && (
            <button 
              className={`admin-tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
              style={{ color: activeTab === 'alerts' ? '#ef4444' : '#f87171' }}
            >
              <ShieldAlert size={15} color="#ef4444" />
              🚨 अंतर-जनपद चैट अलर्ट ({interDistrictAlerts.length})
            </button>
          )}

          {canPublish && (
            <button 
              className={`admin-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <PlusCircle size={15} />
              नई सूचना जारी करें ({isAdmin ? 'Super Admin' : `Co-Admin ${currentUser?.district}`})
            </button>
          )}

          {currentUser?.role === 'user' && (
            <button 
              className={`admin-tab ${activeTab === 'request' ? 'active' : ''}`}
              onClick={() => setActiveTab('request')}
            >
              <Send size={15} />
              सूचना अनुरोध (Notification Request)
            </button>
          )}
        </div>

        {feedbackMsg && (
          <div className="status-tag status-approved" style={{ padding: '0.75rem', width: '100%', fontSize: '0.85rem' }}>
            <CheckCircle size={16} />
            {feedbackMsg}
          </div>
        )}

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* TAB 1: LIST / ALERTS */}
          {(activeTab === 'list' || activeTab === 'alerts') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Filter by district (Admin only) */}
              {isAdmin && activeTab === 'list' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>ज़िला वार फ़िल्टर:</span>
                  <select 
                    className="filter-select"
                    style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
                    value={districtFilter}
                    onChange={e => setDistrictFilter(e.target.value)}
                  >
                    <option value="all">सभी ज़िले / परिपत्र</option>
                    {DISTRICTS.filter((_, i) => i > 0).map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {displayedNotifs.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <Bell size={36} />
                  <p>कोई सक्रिय सूचना उपलब्ध नहीं है।</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {displayedNotifs.map(n => {
                    const isInterAlert = n.type === 'inter_district_alert';
                    const isRequest = n.type === 'request';
                    const isMissedCall = n.type === 'missed_call';
                    const isPhonePermission = n.type === 'phone_permission';

                    let cardBg = 'rgba(15, 23, 42, 0.7)';
                    let cardBorder = '1px solid var(--glass-border-light)';
                    let cardShadow = 'none';

                    if (isMissedCall) {
                      cardBg = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(220, 38, 38, 0.22))';
                      cardBorder = '1px solid rgba(239, 68, 68, 0.55)';
                      cardShadow = '0 4px 14px rgba(239, 68, 68, 0.2)';
                    } else if (isPhonePermission) {
                      cardBg = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(245, 158, 11, 0.18))';
                      cardBorder = '1px solid rgba(245, 158, 11, 0.5)';
                      cardShadow = '0 4px 14px rgba(245, 158, 11, 0.15)';
                    } else if (isInterAlert) {
                      cardBg = 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(185, 28, 28, 0.2))';
                      cardBorder = '1px solid rgba(239, 68, 68, 0.5)';
                      cardShadow = '0 4px 14px rgba(239, 68, 68, 0.15)';
                    } else if (isRequest) {
                      cardBg = 'rgba(245, 158, 11, 0.08)';
                      cardBorder = '1px solid rgba(245, 158, 11, 0.3)';
                    }

                    return (
                      <div 
                        key={n.id}
                        style={{
                          background: cardBg,
                          border: cardBorder,
                          borderRadius: '10px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          boxShadow: cardShadow
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <div>
                            {isInterAlert && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  color: '#fca5a5', 
                                  background: 'rgba(239, 68, 68, 0.25)', 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <ShieldAlert size={12} color="#ef4444" />
                                  पर्यवेक्षी प्रतिलिपि: SHO • CO • SP दृश्यता
                                </span>
                              </div>
                            )}

                            {isMissedCall && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  color: '#fca5a5', 
                                  background: 'rgba(239, 68, 68, 0.3)', 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <PhoneMissed size={12} color="#ef4444" />
                                  🚨 अनुत्तरित इन-ऐप वॉइस कॉल (Missed Call Alert)
                                </span>
                              </div>
                            )}

                            {isPhonePermission && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                <span style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  color: '#fde68a', 
                                  background: 'rgba(245, 158, 11, 0.25)', 
                                  padding: '2px 8px', 
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <KeyRound size={12} color="#f59e0b" />
                                  📲 अंतर-जनपद संपर्क नंबर अनुरोध
                                </span>
                              </div>
                            )}

                            <h4 style={{ color: (isInterAlert || isMissedCall) ? '#fee2e2' : isPhonePermission ? '#fef08a' : 'var(--text-bright)', fontSize: '1rem', fontWeight: 700 }}>
                              {n.title}
                            </h4>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--gold-primary)' }}>
                                <MapPin size={12} /> {n.district}
                              </span>
                              <span>जारीकर्ता: <strong>{n.postedBy}</strong></span>
                              <span>तिथि: {new Date(n.postedAt).toLocaleDateString('hi-IN')}</span>
                            </div>
                          </div>

                          {(canPublish || isMissedCall || isPhonePermission) && (
                            <button 
                              className="btn btn-danger"
                              onClick={() => onDeleteNotification(n.id)}
                              style={{ padding: '4px 6px', fontSize: '0.75rem' }}
                              title="सूचना हटाएं"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', lineHeight: 1.45 }}>
                          {n.content}
                        </p>

                        {/* Direct action button to jump directly to chat */}
                        {n.type === 'direct_message' && onOpenChat && (
                          <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '5px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #059669, #10b981)' }}
                              onClick={() => { onClose(); onOpenChat(n.chatId); }}
                            >
                              <MessageSquare size={14} />
                              मैसेज बॉक्स में खोलें
                            </button>
                          </div>
                        )}

                        {isInterAlert && onOpenChat && (
                          <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn btn-primary"
                              style={{ padding: '5px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)' }}
                              onClick={() => { onClose(); onOpenChat(n.chatId); }}
                            >
                              <MessageSquare size={14} />
                              संबंधित चैट एवं फ़ाइलें देखें
                            </button>
                          </div>
                        )}

                        {/* Actions for Missed Call: Call Back */}
                        {isMissedCall && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {n.callerData && (
                              <button 
                                className="btn btn-primary"
                                style={{ 
                                  padding: '6px 14px', 
                                  fontSize: '0.82rem', 
                                  background: 'linear-gradient(135deg, #059669, #10b981)', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '6px',
                                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                }}
                                onClick={() => {
                                  onClose();
                                  if (onStartCall) {
                                    onStartCall(n.callerData);
                                  } else {
                                    callManager.startCall(currentUser, n.callerData);
                                  }
                                }}
                              >
                                <PhoneCall size={14} />
                                वापस कॉल करें (Call Back)
                              </button>
                            )}
                          </div>
                        )}

                        {/* Actions for Phone Permission: Approve / Reject */}
                        {isPhonePermission && (
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                            {(() => {
                              const perm = (phonePermissions || []).find(p => p.id === n.permissionId || (p.requesterId === n.senderId && p.targetId === currentUser?.id));
                              const status = perm?.status || 'pending';
                              if (status === 'approved') {
                                return (
                                  <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                    <CheckCircle size={15} /> अनुमति स्वीकृत (Approved)
                                  </span>
                                );
                              }
                              if (status === 'rejected') {
                                return (
                                  <span style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                    ❌ अनुमति अस्वीकृत (Rejected)
                                  </span>
                                );
                              }
                              return (
                                <>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#fca5a5', borderColor: '#ef4444' }}
                                    onClick={() => {
                                      if (onRespondPhonePermission) {
                                        onRespondPhonePermission(perm ? perm.id : n.permissionId, 'rejected');
                                      }
                                    }}
                                  >
                                    अस्वीकार करें
                                  </button>
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '5px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', gap: '5px' }}
                                    onClick={() => {
                                      if (onRespondPhonePermission) {
                                        onRespondPhonePermission(perm ? perm.id : n.permissionId, 'approved');
                                      }
                                    }}
                                  >
                                    <CheckCircle size={14} />
                                    स्वीकार करें (नंबर दिखाएं)
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PUBLISH NOTICE (ADMIN / CO-ADMIN) */}
          {activeTab === 'create' && canPublish && (
            <form onSubmit={handlePublishNotice} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">सूचना का शीर्षक (Notice Title)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="उदा. आगामी कानून-व्यवस्था बैठक / अलर्ट"
                  value={newNotice.title}
                  onChange={e => setNewNotice({ ...newNotice, title: e.target.value })}
                  required
                />
              </div>

              {isAdmin && (
                <div className="form-group">
                  <label className="form-label">लक्षित ज़िला (Target District)</label>
                  <select
                    className="form-select"
                    value={newNotice.district}
                    onChange={e => setNewNotice({ ...newNotice, district: e.target.value })}
                  >
                    {DISTRICTS.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {isCoAdmin && (
                <div style={{ fontSize: '0.85rem', color: 'var(--gold-primary)', background: 'rgba(229,184,66,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                  लक्षित ज़िला: <strong>{currentUser.district}</strong> (Co-Admin केवल अपने ज़िले के लिए सूचना जारी कर सकते हैं)
                </div>
              )}

              <div className="form-group">
                <label className="form-label">सूचना का संपूर्ण विवरण (Details)</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="परिपत्र या निर्देश का विवरण यहाँ लिखें..."
                  value={newNotice.content}
                  onChange={e => setNewNotice({ ...newNotice, content: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                <PlusCircle size={16} />
                सूचना प्रकाशित करें
              </button>
            </form>
          )}

          {/* TAB 3: USER NOTIFICATION REQUEST */}
          {activeTab === 'request' && currentUser?.role === 'user' && (
            <form onSubmit={handleUserRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--gold-light)' }}>
                📢 <strong>सूचना अनुरोध:</strong> यदि आप किसी महत्वपूर्ण घटना, अभियान या आवश्यक जानकारी को निर्देशिका में ब्रॉडकास्ट करवाना चाहते हैं, तो यहाँ अनुरोध दर्ज करें।
              </div>

              <div className="form-group">
                <label className="form-label">अनुरोध का विषय</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="उदा. थाना परिसर में रक्तदान शिविर / विशेष चेकिंग"
                  value={userRequest.title}
                  onChange={e => setUserRequest({ ...userRequest, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">अनुरोध का विवरण</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="विस्तार से बताएं कि क्या सूचना प्रकाशित करनी है..."
                  value={userRequest.content}
                  onChange={e => setUserRequest({ ...userRequest, content: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                <Send size={16} />
                सूचना अनुरोध सबमिट करें
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
