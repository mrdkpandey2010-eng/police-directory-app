import React, { useState, useEffect } from 'react';
import { Mic, Bell, Shield, CheckCircle2, AlertTriangle, Sparkles, Volume2 } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestAppNotificationPermission,
  getMicrophonePermissionStatus,
  requestAppMicrophonePermission
} from '../utils/notifications';

export default function MandatoryPermissionModal({ currentUser }) {
  const [micStatus, setMicStatus] = useState('prompt'); // 'granted' | 'denied' | 'prompt'
  const [notifStatus, setNotifStatus] = useState('default'); // 'granted' | 'denied' | 'default'
  const [isLoading, setIsLoading] = useState(false);
  const [isAllGranted, setIsAllGranted] = useState(false);

  // Check current permission statuses
  const checkStatuses = async () => {
    try {
      const nStatus = getNotificationPermissionStatus();
      setNotifStatus(nStatus);

      const mStatus = await getMicrophonePermissionStatus();
      setMicStatus(mStatus);

      if (nStatus === 'granted' && mStatus === 'granted') {
        setIsAllGranted(true);
      } else {
        setIsAllGranted(false);
      }
    } catch (e) {
      console.warn('Error checking permission status:', e);
    }
  };

  useEffect(() => {
    checkStatuses();

    // Re-check when window regains focus (e.g. user toggled settings in browser)
    const onFocus = () => checkStatuses();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentUser]);

  // If both granted, do not render modal
  if (isAllGranted) return null;

  const handleGrantMic = async () => {
    setIsLoading(true);
    try {
      const res = await requestAppMicrophonePermission();
      setMicStatus(res);
      await checkStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantNotif = async () => {
    setIsLoading(true);
    try {
      const res = await requestAppNotificationPermission();
      setNotifStatus(res);
      await checkStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantAll = async () => {
    setIsLoading(true);
    try {
      // 1. Microphone
      const mRes = await requestAppMicrophonePermission();
      setMicStatus(mRes);

      // 2. Notification
      const nRes = await requestAppNotificationPermission();
      setNotifStatus(nRes);

      await checkStatuses();
    } finally {
      setIsLoading(false);
    }
  };

  const micGranted = micStatus === 'granted';
  const notifGranted = notifStatus === 'granted';

  return (
    <div 
      className="mandatory-permission-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999998,
        background: 'rgba(6, 11, 25, 0.92)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div 
        className="mandatory-permission-card"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(180deg, #0f1c3f 0%, #0a1329 100%)',
          border: '1.5px solid var(--khaki-primary, #c49756)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(196, 151, 86, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(196, 151, 86, 0.25), rgba(30, 58, 138, 0.35))',
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid rgba(196, 151, 86, 0.3)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c49756, #8a652a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.75rem',
            boxShadow: '0 4px 16px rgba(196, 151, 86, 0.4)'
          }}>
            <Shield size={30} color="#0f172a" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fef3c7', letterSpacing: '0.3px' }}>
            आवश्यक शासकीय अनुमतियाँ (Mandatory Gate)
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.4 }}>
            उत्तर प्रदेश पुलिस विभागीय पोर्टल के सुरक्षित संचालन, इन-ऐप ऑडियो कॉलिंग एवं सूचना प्रसारण हेतु निम्न अनुमतियाँ अनिवार्य हैं।
          </p>
        </div>

        {/* Content & Action Items */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Permission Item 1: Microphone */}
          <div style={{
            background: micGranted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
            border: micGranted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: micGranted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Mic size={22} color={micGranted ? '#10b981' : '#f87171'} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                    1. माइक्रोफ़ोन (ऑडियो कॉल)
                  </h4>
                  {micGranted ? (
                    <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      ✓ स्वीकृत
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      अनिवार्य
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  इन-ऐप सुरक्षित दोनों-तरफ़ा वॉइस कॉलिंग में आवाज़ सुनने व बोलने हेतु।
                </p>
              </div>
            </div>

            {!micGranted && (
              <button
                type="button"
                onClick={handleGrantMic}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                }}
              >
                अनुमति दें
              </button>
            )}
          </div>

          {/* Permission Item 2: Notifications */}
          <div style={{
            background: notifGranted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
            border: notifGranted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: notifGranted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bell size={22} color={notifGranted ? '#10b981' : '#f87171'} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                    2. सूचनाएं (कॉल व संदेश अलर्ट)
                  </h4>
                  {notifGranted ? (
                    <span style={{ fontSize: '0.65rem', background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      ✓ स्वीकृत
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                      अनिवार्य
                    </span>
                  )}
                </div>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                  इनकमिंग कॉल रिंगटोन, मिस्ड कॉल एवं शासकीय सूचनाओं के तत्काल अलर्ट हेतु।
                </p>
              </div>
            </div>

            {!notifGranted && (
              <button
                type="button"
                onClick={handleGrantNotif}
                disabled={isLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
                }}
              >
                अनुमति दें
              </button>
            )}
          </div>

          {/* Master One-Click Button */}
          {(!micGranted || !notifGranted) && (
            <button
              type="button"
              onClick={handleGrantAll}
              disabled={isLoading}
              style={{
                background: 'linear-gradient(135deg, #c49756 0%, #a27533 100%)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '0.92rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 6px 20px rgba(196, 151, 86, 0.4)',
                marginTop: '0.25rem',
                transition: 'transform 0.15s ease'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Shield size={18} />
              <span>{isLoading ? 'अनुमति जांची जा रही है...' : 'सभी अनुमतियाँ एक साथ स्वीकार करें'}</span>
            </button>
          )}

          {/* Note if user previously denied */}
          {(micStatus === 'denied' || notifStatus === 'denied') && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              fontSize: '0.72rem',
              color: '#fca5a5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px'
            }}>
              <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                यदि आपने अनुमति ब्लॉक की है, तो कृपया ब्राउज़र / ऐप के Site Settings (लॉक आइकन 🔒) में जाकर <strong>Microphone</strong> एवं <strong>Notifications</strong> को "Allow (अनुमति दें)" करें।
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
