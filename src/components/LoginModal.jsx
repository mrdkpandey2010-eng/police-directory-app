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
        <div className="modal-header" style={{ paddingBottom: '0.65rem' }}>
          <div className="modal-title" style={{ fontSize: '1.1rem' }}>
            <Lock size={18} color="var(--khaki-primary, #c49756)" />
            <span>उत्तर प्रदेश पुलिस पोर्टल लॉगिन</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* STAGE 1: PNO INPUT */}
        {stage === 'pno_entry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
            {pnoError && (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                lineHeight: 1.45
              }}>
                {pnoError}
                {pnoServerError && (
                  <div style={{ marginTop: '5px' }}>
                    <button
                      type="button"
                      onClick={handlePnoSubmit}
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: '1px solid rgba(255,255,255,0.3)',
                        color: '#fff',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '0.74rem',
                        cursor: 'pointer'
                      }}
                    >
                      पुनः प्रयास करें (Retry)
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handlePnoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group">
                <label className="form-label">PNO नंबर (Personal No.)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="अपना PNO नंबर दर्ज करें (उदा. 987654321)"
                  value={pnoInput}
                  onChange={e => {
                    setPnoInput(e.target.value);
                    if (pnoError) setPnoError('');
                  }}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isVerifyingPno}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
              >
                {isVerifyingPno ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>सत्यापित हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <span>आगे बढ़ें (Continue)</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STAGE 2: DYNAMIC PASSWORD SCREEN */}
        {stage === 'password_entry' && verifiedAccount && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStage('pno_entry');
                  setLoginError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--khaki-primary, #c49756)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  padding: 0
                }}
              >
                <ArrowLeft size={14} />
                PNO बदलें
              </button>

              <span style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                PNO: <strong>{verifiedAccount.pno}</strong>
              </span>
            </div>

            {/* Role Header Badge */}
            <div style={{
              background: 'rgba(196,151,86,0.1)',
              border: '1px solid var(--khaki-primary, #c49756)',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {verifiedAccount.role === 'admin' ? (
                <Award size={20} color="#fca5a5" />
              ) : verifiedAccount.role === 'co_admin' ? (
                <Building size={20} color="#93c5fd" />
              ) : (
                <User size={20} color="var(--khaki-primary, #c49756)" />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 700 }}>
                  {verifiedAccount.role === 'admin' ? '👑 Super Admin' : verifiedAccount.role === 'co_admin' ? `🏛️ Co-Admin • ${verifiedAccount.district}` : '👮 पुलिस कार्मिक'}
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                  {verifiedAccount.name}
                </div>
              </div>
            </div>

            {loginError && (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem'
              }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="form-group">
                <label className="form-label">
                  {verifiedAccount.role === 'admin' ? 'Master Admin PIN' : 'पासवर्ड'}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="पासवर्ड दर्ज करें"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    required
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem' }}
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>लॉगिन हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Lock size={15} />
                    <span>लॉगिन करें</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
