import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, Shield, Clock, AlertTriangle, User } from 'lucide-react';
import { callManager, MAX_CALL_DURATION_SECONDS } from '../utils/webrtc';

export default function ActiveCallModal({ currentUser, onCallEnded }) {
  const [callState, setCallState] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBoosterFeedback, setAudioBoosterFeedback] = useState(false);

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
  const isOffline = callState.status === 'offline';
  const isChecking = callState.status === 'checking_presence';

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, MAX_CALL_DURATION_SECONDS - elapsedSeconds);

  return (
    <div 
      className="police-call-fullscreen-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 999999, // Absolute top layer over all dialogs, headers and modals
        background: 'radial-gradient(ellipse at 50% 20%, #0c1b38 0%, #060e1f 50%, #020611 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'max(env(safe-area-inset-top, 20px), 24px) 1.5rem max(env(safe-area-inset-bottom, 20px), 28px) 1.5rem',
        color: '#fff',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        boxSizing: 'border-box',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'manipulation'
      }}
    >
      <style>{`
        @keyframes callSonarRing {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            opacity: 0.35;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        @keyframes callAvatarPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.4);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 55px rgba(16, 185, 129, 0.7);
          }
        }
        @keyframes callIncomingBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes callSoundWave {
          0%, 100% { height: 6px; }
          50% { height: 24px; }
        }
      `}</style>

      {/* TOP: Departmental Header & Security Chip */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        maxWidth: '450px'
      }}>
        <div style={{
          background: 'rgba(196, 151, 86, 0.15)',
          border: '1px solid rgba(196, 151, 86, 0.5)',
          borderRadius: '30px',
          padding: '6px 18px',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: '#fde047',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        }}>
          <Shield size={16} color="#eab308" />
          <span>उत्तर प्रदेश पुलिस • इन-ऐप सुरक्षित वॉइस कॉल</span>
        </div>

        <div style={{
          fontSize: '0.78rem',
          color: 'rgba(255, 255, 255, 0.65)',
          letterSpacing: '0.04em'
        }}>
          UP POLICE OFFICIAL DIRECTORY CALL
        </div>
      </div>

      {/* CENTER: Officer Avatar with Sonar Ripple Rings + Full Officer Bio */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        maxWidth: '450px',
        margin: 'auto 0'
      }}>
        {/* Pulsating Sonar Avatar Frame */}
        <div style={{
          position: 'relative',
          width: '150px',
          height: '150px',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Animated Sonar Ripple 1 */}
          {isIncoming && (
            <>
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid #10b981',
                animation: 'callSonarRing 2s cubic-bezier(0, 0.2, 0.8, 1) infinite'
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid #38bdf8',
                animation: 'callSonarRing 2s cubic-bezier(0, 0.2, 0.8, 1) 0.6s infinite'
              }} />
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '1.5px solid #c49756',
                animation: 'callSonarRing 2s cubic-bezier(0, 0.2, 0.8, 1) 1.2s infinite'
              }} />
            </>
          )}

          {/* Connected Glow */}
          {isConnected && (
            <div style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
              animation: 'callAvatarPulse 3s infinite'
            }} />
          )}

          {/* Actual Avatar Image */}
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            border: isConnected 
              ? '4px solid #10b981' 
              : isOffline 
                ? '4px solid #ef4444' 
                : '4px solid var(--khaki-primary, #c49756)',
            overflow: 'hidden',
            background: '#070e1c',
            boxShadow: isConnected 
              ? '0 0 35px rgba(16, 185, 129, 0.6)' 
              : isOffline 
                ? '0 0 35px rgba(239, 68, 68, 0.6)' 
                : '0 0 30px rgba(196, 151, 86, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2
          }}>
            {otherParty?.uniformPhoto ? (
              <img 
                src={otherParty.uniformPhoto} 
                alt="Officer" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <User size={72} color={isOffline ? "#fca5a5" : "var(--khaki-light, #dfb97e)"} />
            )}
          </div>
        </div>

        {/* Officer Full Name */}
        <h1 style={{
          fontSize: '1.65rem',
          fontWeight: 800,
          margin: '0 0 0.4rem 0',
          color: '#ffffff',
          letterSpacing: '0.02em',
          textShadow: '0 2px 10px rgba(0,0,0,0.8)'
        }}>
          {otherParty?.name || 'पुलिस अधिकारी'}
        </h1>

        {/* Post & Designation */}
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#fef08a',
          margin: '0 0 0.3rem 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>{otherParty?.post || 'कार्मिक'}</span>
          {otherParty?.pno && (
            <span style={{
              background: 'rgba(255, 255, 255, 0.12)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              color: '#e2e8f0',
              fontWeight: 600
            }}>
              PNO: {otherParty.pno}
            </span>
          )}
        </div>

        {/* Office & District */}
        <div style={{
          fontSize: '0.92rem',
          color: 'rgba(255, 255, 255, 0.8)',
          margin: '0 0 1.25rem 0'
        }}>
          {otherParty?.office ? `${otherParty.office} • ` : ''}
          {otherParty?.district || 'उत्तर प्रदेश पुलिस'}
        </div>

        {/* Status Text & Sound Equalizer or Timer */}
        {isConnected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {/* Live Equalizer Animation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '26px' }}>
              <div style={{ width: '4px', background: '#34d399', borderRadius: '2px', animation: 'callSoundWave 0.9s ease-in-out infinite' }} />
              <div style={{ width: '4px', background: '#34d399', borderRadius: '2px', animation: 'callSoundWave 1.2s ease-in-out 0.2s infinite' }} />
              <div style={{ width: '4px', background: '#34d399', borderRadius: '2px', animation: 'callSoundWave 0.7s ease-in-out 0.4s infinite' }} />
              <div style={{ width: '4px', background: '#34d399', borderRadius: '2px', animation: 'callSoundWave 1.4s ease-in-out 0.1s infinite' }} />
              <div style={{ width: '4px', background: '#34d399', borderRadius: '2px', animation: 'callSoundWave 0.8s ease-in-out 0.3s infinite' }} />
            </div>

            {/* Glowing Big Timer */}
            <div style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#34d399',
              fontVariantNumeric: 'tabular-nums',
              textShadow: '0 0 20px rgba(52, 211, 153, 0.6)'
            }}>
              {formatTimer(elapsedSeconds)} / 05:00
            </div>

            {/* Real-Time Audio Quality QoS Indicator */}
            {callState.audioQualityStats && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${callState.audioQualityStats.color || '#34d399'}55`,
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.74rem',
                color: callState.audioQualityStats.color || '#34d399',
                fontWeight: 600,
                marginTop: '2px'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: callState.audioQualityStats.color || '#34d399',
                  boxShadow: `0 0 8px ${callState.audioQualityStats.color || '#34d399'}`
                }} />
                <span>{callState.audioQualityStats.rating} • Opus HD (36 kbps)</span>
                {callState.audioQualityStats.jitterMs ? (
                  <span style={{ opacity: 0.8 }}>({callState.audioQualityStats.jitterMs}ms)</span>
                ) : null}
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              color: remainingSeconds <= 30 ? '#fca5a5' : 'rgba(255,255,255,0.7)'
            }}>
              <Clock size={14} />
              <span>
                {remainingSeconds <= 30 
                  ? `⚠️ कॉल समाप्त होने में केवल ${remainingSeconds} सेकंड शेष!`
                  : `अधिकतम कॉल समय सीमा: 05 मिनट (शेष: ${formatTimer(remainingSeconds)})`
                }
              </span>
            </div>
          </div>
        ) : isOffline ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '420px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <span>🔴 अधिकारी अभी ऑफ़लाइन हैं / नेटवर्क क्षेत्र से बाहर हैं</span>
            </div>
            <div style={{ fontSize: '0.84rem', color: '#fca5a5', fontWeight: 600 }}>
              डिवाइस से संपर्क नहीं हो पा रहा है • मिस्ड कॉल अलर्ट प्रेषित कर दिया गया है
            </div>
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '0.78rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: '4px',
              lineHeight: 1.5
            }}>
              ⚠️ प्राप्तकर्ता अधिकारी की डिवाइस इंटरनेट या ऐप से कनेक्ट नहीं है। उनके ऑनलाइन आते ही मिस्ड कॉल का अलर्ट प्रदर्शित हो जाएगा।
            </div>
          </div>
        ) : isChecking ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#38bdf8',
              animation: 'callIncomingBlink 1.4s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>🔄 नेटवर्क एवं उपस्थिति जांच जारी है...</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
              सुरक्षित विभागीय कनेक्शन स्थापित किया जा रहा है...
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: isIncoming ? '#38bdf8' : '#34d399',
              animation: 'callIncomingBlink 1.4s ease-in-out infinite',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>
                {isIncoming ? '🔔 इनकमिंग विभागीय कॉल आ रही है...' : '🟢 अधिकारी ऑनलाइन हैं • रिंग जा रही है...'}
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.65)' }}>
              {isIncoming ? 'कृपया कॉल रिसीव करने के लिए हरा बटन दबाएं' : 'अधिकारी के फोन पर सुरक्षित रिंग जा रही है...'}
            </div>
          </div>
        )}

        {/* Warning Banner if call limit near */}
        {isConnected && remainingSeconds <= 30 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.25)',
            border: '1px solid #ef4444',
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            color: '#fca5a5',
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} color="#ef4444" />
            <span>05 मिनट की अधिकतम सीमा पूर्ण होते ही कॉल स्वतः डिस्कनेक्ट हो जाएगी।</span>
          </div>
        )}
      </div>

      {/* BOTTOM: Action Controls (WhatsApp / Phone Full Screen Style) */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        {isIncoming ? (
          /* Incoming Call Mode: Two Big WhatsApp Action Buttons */
          <div style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 1rem'
          }}>
            {/* Decline Button (Red) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => callManager.rejectCall()}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 25px rgba(239, 68, 68, 0.6)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                title="कॉल अस्वीकार करें (Decline)"
              >
                <PhoneOff size={32} />
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>
                अस्वीकार करें
              </span>
            </div>

            {/* Accept Button (Green with Pulse Glow) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => callManager.acceptCall()}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(16, 185, 129, 0.75)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent',
                  animation: 'callAvatarPulse 1.8s infinite'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                title="कॉल उठाएं (Accept)"
              >
                <Phone size={32} />
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#6ee7b7' }}>
                कॉल उठाएं
              </span>
            </div>
          </div>
        ) : (
          /* Connected or Dialing Outgoing Call Mode */
          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}>
            {/* Mid Action Buttons: Mute & Speaker */}
            {isConnected && (
              <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
                {/* Mute Mic Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => callManager.toggleMute()}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(255,255,255,0.25)',
                      background: callState.isMuted ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.12)',
                      color: callState.isMuted ? '#fca5a5' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                    title={callState.isMuted ? "माइक अनम्यूट करें" : "माइक म्यूट करें"}
                  >
                    {callState.isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <span style={{ fontSize: '0.74rem', color: callState.isMuted ? '#fca5a5' : 'rgba(255,255,255,0.7)' }}>
                    {callState.isMuted ? 'म्यूट है' : 'म्यूट'}
                  </span>
                </div>

                {/* Speaker Toggle Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => callManager.toggleSpeaker()}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: callState.isSpeaker ? '1.5px solid #10b981' : '1.5px solid rgba(255,255,255,0.25)',
                      background: callState.isSpeaker ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255, 255, 255, 0.12)',
                      color: callState.isSpeaker ? '#6ee7b7' : '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.2s ease',
                      boxShadow: callState.isSpeaker ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none'
                    }}
                    title={callState.isSpeaker ? "स्पीकर लाउड सक्रिय (धीमा करने हेतु दबाएं)" : "ईयरपीस / कम आवाज (लाउडस्पीकर हेतु दबाएं)"}
                  >
                    {callState.isSpeaker ? <Volume2 size={24} /> : <VolumeX size={24} />}
                  </button>
                  <span style={{ fontSize: '0.74rem', color: callState.isSpeaker ? '#6ee7b7' : 'rgba(255,255,255,0.7)', fontWeight: callState.isSpeaker ? 700 : 500 }}>
                    {callState.isSpeaker ? 'स्पीकर ऑन' : 'ईयरपीस'}
                  </span>
                </div>
              </div>
            )}

            {/* Connected State: Audio Booster & Mic Status Quick Bar */}
            {isConnected && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    callManager.forcePlayRemoteAudio();
                    setAudioBoosterFeedback(true);
                    setTimeout(() => setAudioBoosterFeedback(false), 2500);
                  }}
                  style={{
                    background: audioBoosterFeedback ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.15)',
                    border: audioBoosterFeedback ? '1px solid #10b981' : '1px solid rgba(56, 189, 248, 0.4)',
                    color: audioBoosterFeedback ? '#6ee7b7' : '#38bdf8',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(6px)',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  <Volume2 size={16} />
                  <span>
                    {audioBoosterFeedback 
                      ? '✓ ऑडियो पुनः सक्रिय एवं लाउड किया गया!' 
                      : '🔊 आवाज़ नहीं आ रही? यहाँ टैप करें'}
                  </span>
                </button>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.65)', display: 'flex', gap: '8px' }}>
                  <span>{callState.isMuted ? '🔴 माइक: म्यूट' : '🟢 माइक: सक्रिय'}</span>
                  <span>•</span>
                  <span>{callState.isSpeaker ? '🔊 लाउडस्पीकर' : '🔈 ईयरपीस'}</span>
                  {callState.audioQualityStats?.packetLossPercent !== undefined && (
                    <>
                      <span>•</span>
                      <span>लॉस: {callState.audioQualityStats.packetLossPercent}%</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Hangup / Dismiss Button */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => isOffline ? callManager.cleanup() : callManager.endCall(true, 'completed')}
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 8px 30px rgba(239, 68, 68, 0.7)',
                  transition: 'transform 0.15s ease',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                title={isOffline ? "कॉल बंद करें" : "कॉल समाप्त करें (End Call)"}
              >
                <PhoneOff size={32} />
              </button>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fca5a5' }}>
                {isOffline ? 'कॉल बंद करें' : 'कॉल समाप्त करें'}
              </span>
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div style={{
          fontSize: '0.74rem',
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '0.5rem'
        }}>
          <span>🔒 एंड-टू-एंड एन्क्रिप्टेड • यह कॉल विभागीय कॉल-लॉग में दर्ज होगी</span>
        </div>
      </div>
    </div>
  );
}
