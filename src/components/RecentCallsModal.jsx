import React, { useState } from 'react';
import { 
  X, Phone, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing, 
  Trash2, Clock, MapPin, User, AlertCircle, Shield, CheckCircle,
  UserCheck, ShieldCheck, Building2, Mail
} from 'lucide-react';
import { callManager } from '../utils/webrtc';
import { getStoredContacts, getStoredCallingConfig } from '../utils/storage';

export default function RecentCallsModal({
  isOpen,
  onClose,
  currentUser,
  callLogs = [],
  contacts = [],
  presenceMap = {},
  callingConfig = null,
  onDeleteCall,
  onClearAllCalls,
  onStartCall,
  onOpenChatWithContact
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'missed'
  const [confirmClear, setConfirmClear] = useState(false);
  const [selectedOfficerCard, setSelectedOfficerCard] = useState(null);

  const handleExecuteCall = (targetParty) => {
    if (!targetParty) return;
    const effectiveCalling = callingConfig || getStoredCallingConfig();
    if (effectiveCalling && effectiveCalling.inAppCallingEnabled === false) {
      const raw = (targetParty?.phone || targetParty?.mobile || '').replace(/\D/g, '');
      if (raw && raw.length >= 10) {
        const clean = raw.length === 10 ? `+91${raw}` : `+${raw}`;
        window.location.href = `tel:${clean}`;
        return;
      }
      alert('⚠️ एडमिनिस्ट्रेटर द्वारा इन-ऐप वॉइस कॉलिंग सेवा बंद कर दी गई है। कृपया सीधे मोबाइल नंबर पर कॉल करें।');
      return;
    }
    onClose();
    if (onStartCall) {
      onStartCall(targetParty);
    } else {
      callManager.startCall(currentUser, targetParty);
    }
  };

  if (!isOpen) return null;

  // Filter logs relevant to current user
  const userLogs = (callLogs || []).filter(c => {
    if (!currentUser) return false;
    const isCaller = c.callerId === currentUser.id || 
                     (c.callerPno && c.callerPno === currentUser.pno) ||
                     (c.callerPhone && currentUser.phone && c.callerPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''));
    const isReceiver = c.receiverId === currentUser.id ||
                       (c.receiverPno && c.receiverPno === currentUser.pno) ||
                       (c.receiverPhone && currentUser.phone && c.receiverPhone.replace(/\D/g, '') === currentUser.phone.replace(/\D/g, ''));
    return isCaller || isReceiver;
  });

  const missedLogs = userLogs.filter(c => {
    const isReceiver = c.receiverId === currentUser?.id || 
                       (c.receiverPno && c.receiverPno === currentUser?.pno) ||
                       (c.receiverPhone && currentUser?.phone && c.receiverPhone.replace(/\D/g, '') === currentUser?.phone.replace(/\D/g, ''));
    return isReceiver && (c.status === 'missed' || c.status === 'rejected' || c.status === 'offline');
  });

  const displayedLogs = activeTab === 'missed' ? missedLogs : userLogs;

  const formatCallTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      if (isToday) return `आज, ${timeStr}`;
      if (isYesterday) return `कल, ${timeStr}`;
      return `${d.toLocaleDateString('hi-IN', { day: '2-digit', month: 'short' })}, ${timeStr}`;
    } catch (e) {
      return isoString;
    }
  };

  const formatDuration = (secs) => {
    if (!secs || secs <= 0) return 'अनुत्तरित (Unanswered)';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} सेकंड`;
    return `${m} मि ${s} से`;
  };

  const handleOpenProfileCard = (otherParty, item) => {
    const allContactsList = Array.isArray(contacts) && contacts.length > 0 ? contacts : getStoredContacts();
    const match = allContactsList.find(c => {
      if (!c) return false;
      if (otherParty.id && c.id === otherParty.id) return true;
      if (otherParty.pno && c.pno && c.pno.toString().trim() === otherParty.pno.toString().trim()) return true;
      if (otherParty.phone && c.phone && c.phone.replace(/\D/g, '') === otherParty.phone.replace(/\D/g, '')) return true;
      return false;
    });

    const resolved = {
      id: match?.id || otherParty.id,
      name: match?.name || otherParty.name || 'अधिकारी',
      post: match?.post || otherParty.post || 'कार्मिक',
      district: match?.district || otherParty.district || 'उत्तर प्रदेश',
      pno: match?.pno || match?.PNO || otherParty.pno || '',
      phone: match?.phone || otherParty.phone || '',
      office: match?.office || otherParty.office || '',
      uniformPhoto: match?.uniformPhoto || otherParty.uniformPhoto || '',
      email: match?.email || '',
      status: match?.status || 'approved'
    };

    setSelectedOfficerCard(resolved);
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10040,
        background: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.75rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          background: 'linear-gradient(180deg, #0e1e3b 0%, #071022 100%)',
          border: '1px solid var(--khaki-primary, #c49756)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#f8fafc'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(196, 151, 86, 0.12)',
          borderBottom: '1px solid rgba(196, 151, 86, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.15))',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PhoneCall size={20} color="#34d399" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--khaki-light, #fef08a)' }}>
                हालिया कॉल (Recent Calls)
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                उत्तर प्रदेश पुलिस • इन-ऐप सुरक्षित कॉल हिस्ट्री
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {userLogs.length > 0 && (
              confirmClear ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => {
                      if (onClearAllCalls) onClearAllCalls();
                      setConfirmClear(false);
                    }}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    हाँ, मिटाएं
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      color: '#cbd5e1',
                      border: 'none',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      cursor: 'pointer'
                    }}
                  >
                    रद्द
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#f87171',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="पूरी कॉल हिस्ट्री मिटाएं"
                >
                  <Trash2 size={13} />
                  <span>हिस्ट्री साफ़ करें</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Filters (WhatsApp Style) */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(196, 151, 86, 0.2)',
          background: 'rgba(7, 14, 28, 0.6)'
        }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'all' ? '2.5px solid var(--khaki-primary, #c49756)' : '2.5px solid transparent',
              color: activeTab === 'all' ? '#fef08a' : '#94a3b8',
              fontWeight: activeTab === 'all' ? 800 : 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>सभी कॉल ({userLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('missed')}
            style={{
              flex: 1,
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'missed' ? '2.5px solid #ef4444' : '2.5px solid transparent',
              color: activeTab === 'missed' ? '#fca5a5' : '#94a3b8',
              fontWeight: activeTab === 'missed' ? 800 : 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <PhoneMissed size={14} color="#ef4444" />
            <span>छूटी हुई कॉल ({missedLogs.length})</span>
          </button>
        </div>

        {/* Call Log List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {displayedLogs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(196, 151, 86, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <Phone size={28} color="var(--khaki-primary, #c49756)" />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
                {activeTab === 'missed' ? 'कोई छूटी हुई कॉल नहीं है' : 'कोई हालिया कॉल रिकॉर्ड नहीं है'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '320px', margin: '0 auto' }}>
                निर्देशिका में जाकर किसी भी अधिकारी के कार्ड पर कॉल बटन दबाकर सुरक्षित इन-ऐप वॉइस कॉल करें।
              </div>
            </div>
          ) : (
            displayedLogs.map((item) => {
              const isOutgoing = (
                item.callerId === currentUser?.id ||
                (item.callerPno && item.callerPno === currentUser?.pno) ||
                (item.callerPhone && currentUser?.phone && item.callerPhone.replace(/\D/g, '') === currentUser?.phone.replace(/\D/g, ''))
              );
              
              const otherParty = isOutgoing 
                ? { 
                    id: item.receiverId, 
                    name: item.receiverName, 
                    post: item.receiverPost, 
                    district: item.receiverDistrict, 
                    phone: item.receiverPhone, 
                    pno: item.receiverPno,
                    office: item.receiverOffice,
                    uniformPhoto: item.receiverUniformPhoto
                  }
                : { 
                    id: item.callerId, 
                    name: item.callerName, 
                    post: item.callerPost, 
                    district: item.callerDistrict, 
                    phone: item.callerPhone, 
                    pno: item.callerPno,
                    office: item.callerOffice,
                    uniformPhoto: item.callerUniformPhoto
                  };

              const isMissed = !isOutgoing && (item.status === 'missed' || item.status === 'rejected' || item.status === 'offline');
              const isOffline = item.status === 'offline';
              const isIncomingConnected = !isOutgoing && (item.status === 'completed' || (item.durationSeconds && item.durationSeconds > 0));

              return (
                <div
                  key={item.id}
                  style={{
                    background: isMissed ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.75)',
                    border: `1px solid ${isMissed ? 'rgba(239, 68, 68, 0.35)' : 'rgba(196, 151, 86, 0.22)'}`,
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Left: Direction Icon & Officer Info (Clickable for Profile Card) */}
                  <div 
                    onClick={() => handleOpenProfileCard(otherParty, item)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      flex: 1, 
                      minWidth: 0,
                      cursor: 'pointer' 
                    }}
                    title="कार्मिक प्रोफाइल कार्ड देखें"
                  >
                    {/* Status badge avatar icon */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: isMissed 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : isOutgoing 
                          ? 'rgba(59, 130, 246, 0.2)' 
                          : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${isMissed ? '#ef4444' : isOutgoing ? '#3b82f6' : '#10b981'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isMissed ? (
                        <PhoneMissed size={20} color="#ef4444" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing size={20} color="#60a5fa" />
                      ) : (
                        <PhoneIncoming size={20} color="#34d399" />
                      )}
                    </div>

                    {/* Officer Text Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: isMissed ? '#fca5a5' : '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {otherParty.name || 'अधिकारी'}
                        </span>
                        {otherParty.post && (
                          <span style={{
                            fontSize: '0.72rem',
                            color: 'var(--khaki-primary, #c49756)',
                            background: 'rgba(196, 151, 86, 0.15)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {otherParty.post}
                          </span>
                        )}
                        {(() => {
                          const p = (otherParty.id && presenceMap[otherParty.id]) ||
                                    (otherParty.pno && presenceMap[otherParty.pno]) ||
                                    (otherParty.phone && presenceMap[String(otherParty.phone).replace(/\D/g, '')]);
                          return p?.isOnline ? (
                            <span style={{ fontSize: '0.62rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '0.5px 5px', borderRadius: '8px', fontWeight: 700 }}>
                              🟢 ऑनलाइन
                            </span>
                          ) : null;
                        })()}
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        marginTop: '3px',
                        flexWrap: 'wrap'
                      }}>
                        {/* Call direction text badge */}
                        <span style={{
                          fontWeight: 600,
                          color: isMissed ? '#f87171' : isOutgoing ? '#93c5fd' : '#86efac'
                        }}>
                          {isMissed ? '🔴 छूटी हुई कॉल' : isOutgoing ? '🔵 आउटगोइंग कॉल' : '🟢 प्राप्त कॉल'}
                        </span>
                        <span>•</span>
                        <span>{formatCallTime(item.timestamp)}</span>
                        {item.durationSeconds > 0 && (
                          <>
                            <span>•</span>
                            <span style={{ color: '#cbd5e1' }}>⏱️ {formatDuration(item.durationSeconds)}</span>
                          </>
                        )}
                        {isOffline && (
                          <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>
                            (ऑफ़लाइन / नेटवर्क क्षेत्र से बाहर)
                          </span>
                        )}
                      </div>

                      {otherParty.district && (
                        <div style={{
                          fontSize: '0.72rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          marginTop: '2px'
                        }}>
                          <MapPin size={11} />
                          <span>{otherParty.district}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Call Back, Message, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* 1. Quick Call Back button */}
                    <button
                      onClick={() => handleExecuteCall(otherParty)}
                      style={{
                        background: 'linear-gradient(135deg, #059669, #10b981)',
                        border: 'none',
                        color: '#fff',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                      }}
                      title="तुरंत वापस कॉल करें"
                    >
                      <PhoneCall size={16} />
                    </button>

                    {/* 2. Officer Profile Card Link Button (Replaces Message button) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProfileCard(otherParty, item);
                      }}
                      style={{
                        background: 'rgba(196, 151, 86, 0.18)',
                        border: '1px solid rgba(196, 151, 86, 0.45)',
                        color: 'var(--khaki-primary, #c49756)',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="कार्मिक प्रोफाइल कार्ड देखें (पहचान पुष्टि)"
                    >
                      <UserCheck size={18} />
                    </button>

                    {/* 3. Delete this single call from list */}
                    <button
                      onClick={() => {
                        if (onDeleteCall) onDeleteCall(item.id);
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="यह कॉल रिकॉर्ड हटाएं"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info banner */}
        <div style={{
          padding: '8px 16px',
          background: 'rgba(7, 14, 28, 0.9)',
          borderTop: '1px solid rgba(196, 151, 86, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.74rem',
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={13} color="var(--khaki-primary, #c49756)" />
            <span>एन्क्रिप्टेड विभागीय संचार • केवल अधिकृत कार्मिक</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--khaki-primary, #c49756)',
              fontWeight: 700,
              fontSize: '0.76rem',
              cursor: 'pointer'
            }}
          >
            बंद करें
          </button>
        </div>
      </div>

      {/* Officer Identity Profile Card Modal Overlay (UP Police Identity Verification) */}
      {selectedOfficerCard && (
        <div 
          className="officer-profile-card-backdrop"
          onClick={() => setSelectedOfficerCard(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10060,
            background: 'rgba(2, 6, 23, 0.88)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="officer-profile-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '450px',
              background: 'linear-gradient(180deg, #0e1e3b 0%, #060d1a 100%)',
              border: '2px solid var(--khaki-primary, #c49756)',
              borderRadius: '20px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(196, 151, 86, 0.2)',
              overflow: 'hidden',
              color: '#f8fafc',
              position: 'relative'
            }}
          >
            {/* Header: UP Police Crest & Title */}
            <div style={{
              background: 'linear-gradient(90deg, #1e3a8a 0%, #0f172a 100%)',
              padding: '14px 16px',
              borderBottom: '1px solid rgba(196, 151, 86, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(196, 151, 86, 0.2)',
                  border: '1.5px solid var(--khaki-primary, #c49756)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={24} color="var(--khaki-primary, #c49756)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: 'var(--khaki-light, #fef08a)', letterSpacing: '0.5px' }}>
                    उत्तर प्रदेश पुलिस (UP POLICE)
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    विभागीय कार्मिक प्रोफाइल कार्ड • Official ID
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedOfficerCard(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* National Tricolor bar */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #ff9933 0%, #ffffff 50%, #138808 100%)' }} />

            {/* Card Content */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Officer Uniform Photo & Verified Badge */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{
                  width: '92px',
                  height: '92px',
                  borderRadius: '16px',
                  border: '3px solid var(--khaki-primary, #c49756)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  marginBottom: '10px'
                }}>
                  {selectedOfficerCard.uniformPhoto ? (
                    <img 
                      src={selectedOfficerCard.uniformPhoto} 
                      alt={selectedOfficerCard.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ 
                      fontSize: '2.2rem', 
                      fontWeight: 900, 
                      color: 'var(--khaki-light, #fef08a)' 
                    }}>
                      {(selectedOfficerCard.name || 'POL').replace(/\(.*\)/, '').trim().charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedOfficerCard.name || 'अधिकारी'}
                  </h4>
                  <span title="सत्यापित पुलिस कार्मिक" style={{ display: 'inline-flex' }}>
                    <CheckCircle size={18} color="#10b981" />
                  </span>
                </div>

                {selectedOfficerCard.post && (
                  <div style={{
                    marginTop: '5px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--khaki-light, #fef08a)',
                    background: 'rgba(196, 151, 86, 0.2)',
                    border: '1px solid rgba(196, 151, 86, 0.4)',
                    padding: '3px 12px',
                    borderRadius: '20px'
                  }}>
                    {selectedOfficerCard.post}
                  </div>
                )}

                {/* Live Online Presence Status Indicator */}
                {(() => {
                  const officerPresence = 
                    (selectedOfficerCard.id && presenceMap[selectedOfficerCard.id]) ||
                    (selectedOfficerCard.pno && presenceMap[selectedOfficerCard.pno]) ||
                    (selectedOfficerCard.phone && presenceMap[String(selectedOfficerCard.phone).replace(/\D/g, '')]) ||
                    null;
                  const isCardOnline = Boolean(officerPresence?.isOnline);
                  return isCardOnline ? (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '0.74rem',
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.45)',
                      padding: '3px 12px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
                      🟢 ऑनलाइन (Active Now)
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '6px',
                      fontSize: '0.72rem',
                      background: 'rgba(148, 163, 184, 0.1)',
                      color: '#94a3b8',
                      border: '1px solid rgba(148, 163, 184, 0.25)',
                      padding: '3px 12px',
                      borderRadius: '20px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
                      ⚪ ऑफ़लाइन (Offline)
                    </div>
                  );
                })()}
              </div>

              {/* Verified Details Sheet */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(196, 151, 86, 0.25)',
                borderRadius: '14px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '9px'
              }}>
                {/* PNO */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} color="var(--khaki-primary, #c49756)" /> पीएनओ संख्या (PNO):
                  </span>
                  <span style={{ fontWeight: 800, color: '#fef08a', letterSpacing: '0.5px' }}>
                    {selectedOfficerCard.pno || selectedOfficerCard.PNO || 'उपलब्ध नहीं'}
                  </span>
                </div>

                {/* District */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} color="#60a5fa" /> तैनात जनपद (District):
                  </span>
                  <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                    {selectedOfficerCard.district || 'उत्तर प्रदेश'}
                  </span>
                </div>

                {/* Office / Thana */}
                {selectedOfficerCard.office && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} color="#34d399" /> थाना / कार्यालय:
                    </span>
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>
                      {selectedOfficerCard.office}
                    </span>
                  </div>
                )}

                {/* CUG Mobile */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} color="#10b981" /> सीयूजी मोबाइल नंबर:
                  </span>
                  <span style={{ fontWeight: 800, color: '#6ee7b7' }}>
                    {selectedOfficerCard.phone || 'उपलब्ध नहीं'}
                  </span>
                </div>

                {/* Email */}
                {selectedOfficerCard.email && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} color="#a78bfa" /> ईमेल:
                    </span>
                    <span style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.8rem' }}>
                      {selectedOfficerCard.email}
                    </span>
                  </div>
                )}

                {/* Status Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.76rem',
                  color: '#34d399'
                }}>
                  <ShieldCheck size={14} color="#34d399" />
                  <span>उत्तर प्रदेश पुलिस निर्देशिका सत्यापित कार्मिक</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    const target = selectedOfficerCard;
                    setSelectedOfficerCard(null);
                    handleExecuteCall(target);
                  }}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '11px',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <PhoneCall size={16} />
                  <span>इन-ऐप कॉल करें</span>
                </button>

                {selectedOfficerCard.phone && (
                  <a
                    href={`tel:${selectedOfficerCard.phone}`}
                    style={{
                      flex: 1,
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.45)',
                      borderRadius: '10px',
                      padding: '11px',
                      color: '#93c5fd',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      textDecoration: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Phone size={15} />
                    <span>सीयूजी कॉल</span>
                  </a>
                )}

                <button
                  onClick={() => setSelectedOfficerCard(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '11px 16px',
                    color: '#cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  बंद करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
