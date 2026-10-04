import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, User } from 'lucide-react';
import { callManager, MAX_CALL_DURATION_SECONDS } from '../utils/webrtc';

export default function ActiveCallModal({ currentUser, onCallEnded }) {
  const [callState, setCallState] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const unsub = callManager.subscribe((state) => {
      setCallState(state ? { ...state } : null);
      if (!state) {
        setElapsedSeconds(0);
        if (onCallEnded) onCallEnded();
      }
    });
    return unsub;
  }, [onCallEnded]);

  // Active call duration counter & 5-minute strict cutoff
  useEffect(() => {
    let interval = null;
    if (callState && callState.status === 'connected' && callState.startedAt) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - callState.startedAt) / 1000);
        setElapsedSeconds(secs);

        // Strict 5-minute (300s) automatic hangup
        if (secs >= MAX_CALL_DURATION_SECONDS) {
          clearInterval(interval);
          callManager.endCall(true, 'completed');
        }
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState?.status, callState?.startedAt]);

  if (!callState) return null;

  const isIncoming = callState.isIncoming && callState.status === 'ringing';
  const otherParty = callState.isIncoming ? callState.caller : callState.receiver;
  const isConnected = callState.status === 'connected';

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, MAX_CALL_DURATION_SECONDS - elapsedSeconds);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 10, 24, 0.94)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'linear-gradient(180deg, #0e1d38, #070e1c)',
        border: '2px solid var(--khaki-border, #c49756)',
        borderRadius: '20px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(196,151,86,0.3)',
        padding: '1.75rem 1.5rem',
        color: '#fff',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        {/* Top Header Badge */}
        <div style={{
          background: 'rgba(196, 151, 86, 0.15)',
          border: '1px solid var(--khaki-primary, #c49756)',
          borderRadius: '20px',
          padding: '4px 14px',
          fontSize: '0.78rem',
          color: 'var(--khaki-light, #dfb97e)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Shield size={14} color="var(--khaki-primary)" />
          <span>उत्तर प्रदेश पुलिस • इन-ऐप सुरक्षित वॉइस कॉल</span>
        </div>

        {/* Officer Uniform Avatar Frame */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '3px solid var(--khaki-primary, #c49756)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#070e1c',
          boxShadow: isConnected 
            ? '0 0 25px rgba(16, 185, 129, 0.4)' 
            : '0 0 20px rgba(196, 151, 86, 0.35)',
          animation: isIncoming ? 'pulse 1.5s infinite' : 'none'
        }}>
          {otherParty?.uniformPhoto ? (
            <img src={otherParty.uniformPhoto} alt="Officer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={48} color="var(--khaki-light)" />
          )}
        </div>

        {/* Officer Information */}
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-bright, #fff)' }}>
            {otherParty?.name || 'पुलिस अधिकारी'}
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--khaki-light, #dfb97e)', margin: '4px 0 0 0' }}>
            {otherParty?.post} • {otherParty?.district}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
            {otherParty?.office || 'उत्तर प्रदेश पुलिस'}
          </span>
        </div>

        {/* Call Status & Timer Display */}
        {isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              color: '#34d399',
              fontVariantNumeric: 'tabular-nums'
            }}>
              {formatTimer(elapsedSeconds)} / 05:00
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.75rem',
              color: remainingSeconds <= 30 ? '#fca5a5' : 'rgba(255,255,255,0.6)'
            }}>
              <Clock size={12} />
              <span>
                {remainingSeconds <= 30 
                  ? `⚠️ कॉल समाप्त होने में ${remainingSeconds} सेकंड शेष`
                  : `अधिकतम कॉल समय: 05 मिनट (शेष: ${formatTimer(remainingSeconds)})`
                }
              </span>
            </div>
          </div>
        ) : (
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: isIncoming ? '#38bdf8' : 'var(--khaki-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {isIncoming ? '🔔 इनकमिंग कॉल बज रही है...' : '📞 कनेक्ट किया जा रहा है (Ringing)...'}
          </div>
        )}

        {/* 5-minute Alert Warning banner if near limit */}
        {isConnected && remainingSeconds <= 30 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.75rem',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertTriangle size={15} color="#ef4444" />
            <span>05 मिनट की अधिकतम सीमा पूर्ण होते ही कॉल स्वतः कट जाएगी।</span>
          </div>
        )}

        {/* Action Controls */}
        {isIncoming ? (
          /* Incoming Call: Accept or Decline */
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
            <button
              onClick={() => callManager.rejectCall()}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.5)'
              }}
              title="कॉल अस्वीकार करें (Decline)"
            >
              <PhoneOff size={26} />
            </button>

            <button
              onClick={() => callManager.acceptCall()}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.5)'
              }}
              title="कॉल स्वीकार करें (Answer)"
            >
              <Phone size={26} />
            </button>
          </div>
        ) : (
          /* Connected or Dialing Call: Controls & Hangup */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {isConnected && (
              <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
                {/* Mute Mic Toggle */}
                <button
                  type="button"
                  onClick={() => callManager.toggleMute()}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: callState.isMuted ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)',
                    color: callState.isMuted ? '#fca5a5' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title={callState.isMuted ? "माइक अनम्यूट करें" : "माइक म्यूट करें"}
                >
                  {callState.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>

                {/* Speaker Indicator */}
                <button
                  type="button"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  title="स्पीकर सक्रिय"
                >
                  <Volume2 size={20} />
                </button>
              </div>
            )}

            {/* Hangup Button */}
            <button
              onClick={() => callManager.endCall(true, 'completed')}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626, #991b1b)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.5)'
              }}
              title="कॉल समाप्त करें (End Call)"
            >
              <PhoneOff size={26} />
            </button>
          </div>
        )}

        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
          🔒 एंड-टू-एंड एन्क्रिप्टेड • यह कॉल विभागीय कॉल-लॉग में दर्ज होगी
        </div>
      </div>
    </div>
  );
}
