import React, { useState, useEffect } from 'react';
import { Mic, Bell, Shield, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Volume2, Info } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestAppNotificationPermission,
  getMicrophonePermissionStatus,
  requestAppMicrophonePermission
} from '../utils/notifications';

export default function PermissionOnboardingScreen({ user, onComplete }) {
  const [micStatus, setMicStatus] = useState('prompt'); // 'granted' | 'denied' | 'prompt' | 'unsupported'
  const [notifStatus, setNotifStatus] = useState('default'); // 'granted' | 'denied' | 'default' | 'unsupported'
  const [isLoading, setIsLoading] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState('');

  const checkCurrentStatuses = async () => {
    try {
      const nStatus = getNotificationPermissionStatus();
      setNotifStatus(nStatus);
      const mStatus = await getMicrophonePermissionStatus();
      setMicStatus(mStatus);

      if (mStatus === 'granted') {
        // If already granted, complete onboarding
        if (onComplete) onComplete();
      }
    } catch (e) {
      console.warn('Error checking permission statuses:', e);
    }
  };

  useEffect(() => {
    checkCurrentStatuses();

    const onFocus = () => {
      checkCurrentStatuses();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleEnablePermissions = async () => {
    setIsLoading(true);
    setDeniedMessage('');

    try {
      // 1. Microphone request (User gesture initiated)
      let mRes = 'prompt';
      try {
        mRes = await requestAppMicrophonePermission();
        setMicStatus(mRes);
      } catch (e) {
        mRes = 'denied';
      }

      // 2. Notification request
      try {
        const nRes = await requestAppNotificationPermission();
        setNotifStatus(nRes);
      } catch (e) {}

      if (mRes === 'granted') {
        if (onComplete) onComplete();
      } else {
        setDeniedMessage(
          '⚠️ माइक्रोफ़ोन अनुमति अस्वीकृत (Denied) पाई गई। ऐप में सुरक्षित वॉयस कॉलिंग के लिए माइक्रोफ़ोन आवश्यक है। कृपया अपने ब्राउज़र / मोबाइल ऐप सेटिंग्स में जाकर माइक्रोफ़ोन अनुमति को "Allow" करें और पुनः प्रयास करें।'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAnyway = () => {
    // Allows proceeding if user chooses to view directory without calling
    if (onComplete) onComplete();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, #070e1c 0%, #0d1b33 100%)',
      zIndex: 999998,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        background: 'var(--bg-surface, #111827)',
        border: '1.5px solid var(--khaki-primary, #c49756)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
        color: '#f8fafc',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(196,151,86,0.15)',
            border: '2px solid var(--khaki-primary, #c49756)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Shield size={32} color="var(--khaki-primary, #c49756)" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--khaki-light, #dfb97e)' }}>
            आवश्यक कॉलिंग अनुमतियां (Permissions)
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            उत्तर प्रदेश पुलिस सुरक्षित वॉयस कॉलिंग एवं अलर्ट सेवा हेतु
          </p>
        </div>

        {/* Feature Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Microphone Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: micStatus === 'granted' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              background: micStatus === 'granted' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(196,151,86,0.2)',
              color: micStatus === 'granted' ? '#4ade80' : 'var(--khaki-primary, #c49756)',
              padding: '10px',
              borderRadius: '10px'
            }}>
              <Mic size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>माइक्रोफ़ोन (Microphone)</strong>
                {micStatus === 'granted' && (
                  <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> सक्रिय (Granted)
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>
                अधिकारियों के बीच सुरक्षित HD वॉयस कॉलिंग (End-to-End Encrypted) एवं वॉयस सर्च हेतु आवश्यक है।
              </p>
            </div>
          </div>

          {/* Notifications Card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: notifStatus === 'granted' ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              background: notifStatus === 'granted' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(196,151,86,0.2)',
              color: notifStatus === 'granted' ? '#4ade80' : 'var(--khaki-primary, #c49756)',
              padding: '10px',
              borderRadius: '10px'
            }}>
              <Bell size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>नोटिफिकेशन्स (Alerts)</strong>
                {notifStatus === 'granted' && (
                  <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={13} /> सक्रिय (Granted)
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>
                इनकमिंग पुलिस कॉल एवं शासकीय संदेशों का तत्काल अलर्ट स्क्रीन पर प्राप्त करने हेतु।
              </p>
            </div>
          </div>
        </div>

        {deniedMessage && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '0.75rem',
            fontSize: '0.8rem',
            color: '#fca5a5',
            lineHeight: 1.45
          }}>
            {deniedMessage}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleEnablePermissions}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.96rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '10px'
            }}
          >
            {isLoading ? (
              <span>अनुमतियां सक्रिय हो रही हैं...</span>
            ) : micStatus === 'denied' ? (
              <>
                <RefreshCw size={18} />
                <span>पुनः प्रयास करें (Retry Permission)</span>
              </>
            ) : (
              <>
                <Shield size={18} />
                <span>अनुमतियां सक्रिय करें और आगे बढ़ें (Enable & Continue)</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {micStatus === 'denied' && (
            <button
              type="button"
              onClick={handleContinueAnyway}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '0.8rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '6px'
              }}
            >
              कॉलिंग के बिना केवल निर्देशिका देखें (Continue to Directory)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
