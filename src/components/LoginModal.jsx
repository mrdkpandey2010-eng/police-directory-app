import React, { useState } from 'react';
import { 
  X, Lock, Shield, User, Building, ArrowRight, ArrowLeft, 
  AlertTriangle, RefreshCw, Eye, EyeOff, Award 
} from 'lucide-react';
import { lookupPnoAuth, verifyCredentialsAuth } from '../utils/cloudflareR2';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  onOpenRegister,
  onOpenPolicy,
  onOpenAdmin = null,
  contacts = [], 
  coAdmins = []
}) {
  const [stage, setStage] = useState('pno_entry'); // 'pno_entry' | 'password_entry'
  const [pnoInput, setPnoInput] = useState('');
  const [isVerifyingPno, setIsVerifyingPno] = useState(false);
  const [pnoError, setPnoError] = useState('');
  const [pnoServerError, setPnoServerError] = useState(false);

  const [verifiedAccount, setVerifiedAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  if (!isOpen) return null;

  const handlePnoSubmit = async (e) => {
    if (e) e.preventDefault();
    setPnoError('');
    setPnoServerError(false);

    const clean = pnoInput.trim();
    if (!clean) {
      setPnoError('कृपया अपना PNO नंबर दर्ज करें।');
      return;
    }

    if (clean.length < 3) {
      setPnoError('PNO नंबर कम से कम 3 अक्षर/अंक का होना आवश्यक है।');
      return;
    }

    setIsVerifyingPno(true);

    try {
      const result = await lookupPnoAuth(clean, contacts, coAdmins);

      if (result.serverUnavailable) {
        setPnoServerError(true);
        setPnoError(result.error || 'सर्वर से संपर्क नहीं हो पा रहा है। कृपया पुनः प्रयास करें।');
        return;
      }

      if (result.error) {
        setPnoError(result.error);
        return;
      }

      if (result.exists) {
        if (result.status === 'blocked' || result.status === 'super_blocked' || result.status === 'inactive') {
          setPnoError(result.message || 'आपका खाता ब्लॉक अथवा निष्क्रिय है। कृपया नोडल अधिकारी से संपर्क करें।');
          return;
        }

        if (result.status === 'pending') {
          setPnoError(result.message || '⏳ आपका पंजीकरण अभी विचाराधीन है। सत्यापन के पश्चात ही लॉगिन सक्रिय होगा।');
          return;
        }

        setVerifiedAccount(result);
        setPassword('');
        setLoginError('');
        setStage('password_entry');
      } else {
        // Not registered -> Inform and allow navigating to registration
        if (typeof onOpenRegister === 'function') {
          onClose();
          onOpenRegister(clean);
        } else {
          setPnoError(`यह PNO (${clean}) पंजीकृत नहीं है। कृपया नया पंजीकरण करें।`);
        }
      }
    } catch (err) {
      setPnoServerError(true);
      setPnoError('नेटवर्क त्रुटि: सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।');
    } finally {
      setIsVerifyingPno(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    const cleanPwd = password.trim();
    if (!cleanPwd) {
      setLoginError('कृपया पासवर्ड दर्ज करें।');
      return;
    }

    if (!verifiedAccount) {
      setStage('pno_entry');
      return;
    }

    setIsLoggingIn(true);

    try {
      const res = await verifyCredentialsAuth(
        verifiedAccount.pno,
        cleanPwd,
        verifiedAccount.role,
        contacts,
        coAdmins
      );

      if (res.success && res.user) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setLoginError(res.error || 'अमान्य पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      }
    } catch (err) {
      setLoginError('लॉगिन सत्यापन में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '440px', padding: '1.35rem' }}
      >
        <div className="modal-header" style={{ paddingBottom: '0.45rem' }}>
          <div className="modal-title" style={{ fontSize: '1.1rem' }}>
            <Lock size={18} color="var(--khaki-primary, #c49756)" />
            <span>उत्तर प्रदेश पुलिस पोर्टल लॉगिन</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Official Police Emblem Badge (Centered above text fields, crisp & properly proportioned) */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '6px 0 10px 0',
          width: '100%'
        }}>
          <img 
            src="/police-badge.png" 
            alt="उत्तर प्रदेश पुलिस डायरेक्टरी" 
            onError={(e) => { e.currentTarget.src = '/police-logo.png'; }}
            style={{
              height: 'clamp(76px, 14vh, 98px)',
              width: 'auto',
              maxHeight: '105px',
              maxWidth: '120px',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.55)',
              filter: 'drop-shadow(0 4px 12px rgba(196, 151, 86, 0.25))'
            }}
          />
        </div>

        {/* STAGE 1: PNO INPUT (MINIMAL) */}
        {stage === 'pno_entry' && (
          <form
            onSubmit={handlePnoSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginTop: '0.5rem'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              borderRadius: '10px',
              padding: '4px 6px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <input
                type="text"
                value={pnoInput}
                onChange={e => {
                  setPnoInput(e.target.value);
                  if (pnoError) setPnoError('');
                }}
                placeholder="PNO"
                aria-label="PNO Number"
                autoFocus
                disabled={isVerifyingPno}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f8fafc',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  padding: '0.6rem 0.8rem',
                  letterSpacing: '0.04em'
                }}
              />
              <button
                type="submit"
                disabled={isVerifyingPno || !pnoInput.trim()}
                aria-label="Submit PNO"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (isVerifyingPno || !pnoInput.trim()) ? 'rgba(196, 151, 86, 0.3)' : 'var(--khaki-primary, #c49756)',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isVerifyingPno || !pnoInput.trim()) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {isVerifyingPno ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>

            {pnoError && (
              <div style={{
                fontSize: '0.78rem',
                color: '#fca5a5',
                textAlign: 'center',
                padding: '2px 8px'
              }}>
                {pnoError}
              </div>
            )}
          </form>
        )}

        {/* STAGE 2: PASSWORD SCREEN (MINIMAL) */}
        {stage === 'password_entry' && (
          <form
            onSubmit={handlePasswordSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              marginTop: '0.5rem'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              borderRadius: '10px',
              padding: '4px 6px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
            }}>
              <input
                type="password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (loginError) setLoginError('');
                }}
                placeholder="••••••••"
                aria-label="Password"
                autoFocus
                disabled={isLoggingIn}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f8fafc',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  padding: '0.6rem 0.8rem',
                  letterSpacing: '0.08em'
                }}
              />
              <button
                type="submit"
                disabled={isLoggingIn || !password.trim()}
                aria-label="Submit Password"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: 'none',
                  background: (isLoggingIn || !password.trim()) ? 'rgba(196, 151, 86, 0.3)' : 'var(--khaki-primary, #c49756)',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isLoggingIn || !password.trim()) ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {isLoggingIn ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            </div>

            {loginError && (
              <div style={{
                fontSize: '0.78rem',
                color: '#fca5a5',
                textAlign: 'center',
                padding: '2px 8px'
              }}>
                {loginError}
              </div>
            )}
          </form>
        )}

        {/* Quick Super Admin 2FA Access Button */}
        {typeof onOpenAdmin === 'function' && (
          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdmin('pending');
              }}
              style={{
                background: 'rgba(196, 151, 86, 0.1)',
                border: '1px solid rgba(196, 151, 86, 0.35)',
                borderRadius: '8px',
                color: 'var(--khaki-light, #dfb97e)',
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '6px 14px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
              title="सुपर एडमिन 2FA डायरेक्ट प्रवेश (किसी पूर्व ID/पासवर्ड की आवश्यकता नहीं)"
            >
              <Shield size={13} color="var(--khaki-primary, #c49756)" />
              <span>👑 सुपर एडमिन 2FA त्वरित प्रवेश</span>
            </button>
          </div>
        )}

        {/* Subdued Footer Informational Hyperlinks (Discreet/Subdued until mouse hover or touch) */}
        <div 
          style={{
            marginTop: '1.25rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            opacity: 0.38,
            transition: 'opacity 0.25s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.95'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.38'}
          onTouchStart={e => e.currentTarget.style.opacity = '0.95'}
        >
          <button
            type="button"
            onClick={() => {
              if (typeof onOpenPolicy === 'function') {
                onOpenPolicy('disclaimer');
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '3px 6px',
              borderRadius: '4px'
            }}
            title="विभागीय नियम, गोपनीयता नीति एवं सेवा शर्तें देखें"
          >
            शासकीय नियम, गोपनीयता नीति एवं सेवा शर्तें
          </button>
        </div>
      </div>
    </div>
  );
}
