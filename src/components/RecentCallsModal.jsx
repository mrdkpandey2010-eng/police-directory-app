import React, { useState, useEffect } from 'react';
import { 
  X, Phone, PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing, 
  Trash2, Clock, MapPin, User, MessageSquare, AlertCircle, Shield, CheckCircle 
} from 'lucide-react';
import { callManager } from '../utils/webrtc';

export default function RecentCallsModal({
  isOpen,
  onClose,
  currentUser,
  callLogs = [],
  onDeleteCall,
  onClearAllCalls,
  onStartCall,
  onOpenChatWithContact
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'missed'
  const [confirmClear, setConfirmClear] = useState(false);

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
                ? { id: item.receiverId, name: item.receiverName, post: item.receiverPost, district: item.receiverDistrict, phone: item.receiverPhone, pno: item.receiverPno }
                : { id: item.callerId, name: item.callerName, post: item.callerPost, district: item.callerDistrict, phone: item.callerPhone, pno: item.callerPno };

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
                  {/* Left: Direction Icon & Officer Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
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
                      onClick={() => {
                        onClose();
                        if (onStartCall) {
                          onStartCall(otherParty);
                        } else {
                          callManager.startCall(currentUser, otherParty);
                        }
                      }}
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

                    {/* 2. Message / Chat button */}
                    {onOpenChatWithContact && otherParty.id && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenChatWithContact(otherParty);
                        }}
                        style={{
                          background: 'rgba(59, 130, 246, 0.18)',
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          color: '#93c5fd',
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="संदेश भेजें"
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}

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
    </div>
  );
}
