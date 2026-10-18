import React, { useState, useMemo } from 'react';
import { 
  Shield, Lock, User, UserPlus, KeyRound, Building, ArrowRight, 
  AlertTriangle, CheckCircle2, ShieldAlert, Award, MapPin, Camera, Upload,
  RefreshCw, Eye, EyeOff, ArrowLeft, HelpCircle
} from 'lucide-react';
import { validateFileSize, compressImage } from '../utils/imageCompressor';
import { ALL_UP_DISTRICTS, STANDARD_POLICE_POSTS } from '../data/mockContacts';
import { lookupPnoAuth, verifyCredentialsAuth } from '../utils/cloudflareR2';
import { handleTransliterateOnSpace, transliterateText } from '../utils/transliteration';

export default function AuthGateway({ 

  onLoginSuccess, 
  onRegisterSubmit,
  contacts = [], 
  coAdmins = [],
  posts = [],
  districts = [],
  offices = [],
  terms = null,
  onOpenPolicy = null
}) {
  // Current screen stage: 'pno_entry' | 'password_entry' | 'register_entry' | 'reg_success'
  const [stage, setStage] = useState('pno_entry');

  // Stage 1: PNO Entry
  const [pnoInput, setPnoInput] = useState('');
  const [isVerifyingPno, setIsVerifyingPno] = useState(false);
  const [pnoError, setPnoError] = useState('');
  const [pnoServerError, setPnoServerError] = useState(false);

  // Stage 2: Verified Account & Password Screen
  const [verifiedAccount, setVerifiedAccount] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Stage 3: New Registration
  const [regForm, setRegForm] = useState({
    name: '',
    pno: '',
    post: (posts && posts[1]) || (STANDARD_POLICE_POSTS && STANDARD_POLICE_POSTS[1]) || 'आरक्षी (Constable)',
    district: (districts && districts[1]) || (ALL_UP_DISTRICTS && ALL_UP_DISTRICTS[1]) || 'लखनऊ',
    office: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: '',
    registrationNotes: '',
    uniformPhoto: null,
    isPhoneHidden: false
  });
  const [regError, setRegError] = useState('');

  // Fallback safe lists
  const effectiveDistricts = useMemo(() => {
    if (Array.isArray(districts) && districts.length > 1) {
      return districts.filter((_, idx) => idx > 0);
    }
    return ALL_UP_DISTRICTS.filter((_, idx) => idx > 0);
  }, [districts]);

  const effectivePosts = useMemo(() => {
    if (Array.isArray(posts) && posts.length > 1) {
      return posts.filter((_, idx) => idx > 0);
    }
    return STANDARD_POLICE_POSTS.filter((_, idx) => idx > 0);
  }, [posts]);

  // District offices
  const districtOffices = useMemo(() => {
    if (!Array.isArray(offices)) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === regForm.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, regForm.district]);

  // Automatic Hindi transliteration on Space / Blur for Registration fields (Name, Office)
  const handleRegTransliterateChange = (e, fieldName) => {
    const input = e.target;
    const val = input.value;
    const cursor = (input.selectionEnd !== null && input.selectionEnd !== undefined) ? input.selectionEnd : val.length;

    const res = handleTransliterateOnSpace(val, cursor);
    if (res.changed) {
      setRegForm(prev => ({ ...prev, [fieldName]: res.text }));
      requestAnimationFrame(() => {
        if (input && typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(res.cursor, res.cursor);
        }
      });
    } else {
      setRegForm(prev => ({ ...prev, [fieldName]: val }));
    }
  };

  const handleRegFieldBlur = (fieldName) => {
    setRegForm(prev => {
      const current = prev[fieldName];
      if (!current || typeof current !== 'string') return prev;
      const converted = transliterateText(current);
      if (converted !== current) {
        return { ...prev, [fieldName]: converted };
      }
      return prev;
    });
  };

  // ---------------- STEP 1: PNO VERIFICATION ----------------
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

      // Check account status if found
      if (result.exists) {
        if (result.status === 'blocked' || result.status === 'super_blocked' || result.status === 'inactive') {
          setPnoError(result.message || 'आपका खाता ब्लॉक अथवा निष्क्रिय है। कृपया नोडल अधिकारी से संपर्क करें।');
          return;
        }

        if (result.status === 'pending') {
          setPnoError(result.message || '⏳ आपका पंजीकरण अभी विचाराधीन (Pending Approval) है। सत्यापन के पश्चात ही लॉगिन सक्रिय होगा।');
          return;
        }

        // Active account found -> Navigate to Password Screen (Step 2)
        setVerifiedAccount(result);
        setPassword('');
        setLoginError('');
        setStage('password_entry');
      } else {
        // Not registered -> Navigate directly to New Registration Page (Step 3)
        setRegForm(prev => ({
          ...prev,
          pno: clean,
          district: (districts && districts[1]) || 'लखनऊ',
          post: (posts && posts[1]) || 'आरक्षी (Constable)'
        }));
        setRegError('');
        setStage('register_entry');
      }
    } catch (err) {
      setPnoServerError(true);
      setPnoError('नेटवर्क त्रुटि: सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।');
    } finally {
      setIsVerifyingPno(false);
    }
  };

  // ---------------- STEP 2: PASSWORD VERIFICATION & LOGIN ----------------
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
        // Successful login -> App.jsx takes over for Terms check & Permission check
        onLoginSuccess(res.user);
      } else {
        setLoginError(res.error || 'अमान्य पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      }
    } catch (err) {
      setLoginError('लॉगिन सत्यापन में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ---------------- STEP 3: SELF-REGISTRATION ----------------
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setRegError('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    const sizeCheck = validateFileSize(file, 'photo');
    if (!sizeCheck.valid) {
      setRegError(sizeCheck.error);
      return;
    }

    setRegError('');
    try {
      const compressedUrl = await compressImage(file, 480, 480, 0.75);
      setRegForm(prev => ({ ...prev, uniformPhoto: compressedUrl }));
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRegForm(prev => ({ ...prev, uniformPhoto: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterFormSubmit = (e) => {
    e.preventDefault();
    setRegError('');

    if (!regForm.name.trim() || !regForm.phone.trim() || !regForm.office.trim()) {
      setRegError('कृपया नाम, मोबाइल नंबर एवं थाना/कार्यालय अनिवार्य रूप से भरें।');
      return;
    }

    if (regForm.phone.trim().length < 10) {
      setRegError('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (!regForm.password || regForm.password.trim().length < 4) {
      setRegError('कृपया कम से कम 4 अक्षरों/अंकों का पासवर्ड बनाएं।');
      return;
    }

    // MANDATORY UNIFORM PHOTO VALIDATION
    if (!regForm.uniformPhoto) {
      setRegError('⚠️ सुरक्षा नीति: वर्दी (यूनिफॉर्म) वाली वास्तविक फोटो अपलोड करना अनिवार्य है।');
      return;
    }

    // Prevent duplicate PNO registration
    const existingOfficer = contacts.find(c => 
      c.pno && c.pno.trim().toLowerCase() === regForm.pno.trim().toLowerCase()
    );
    if (existingOfficer) {
      setRegError(`यह PNO (${regForm.pno}) पहले से पंजीकृत है। कृपया लॉगिन स्क्रीन पर जाएं।`);
      return;
    }

    // Always enforce regular officer role with pending status and ensure Hindi Devanagari text
    const finalName = transliterateText((regForm.name || '').trim());
    const finalOffice = transliterateText((regForm.office || '').trim());

    const submissionData = {
      ...regForm,
      name: finalName,
      office: finalOffice,
      role: 'user',
      status: 'pending'
    };

    onRegisterSubmit(submissionData);
    setStage('reg_success');
  };

  return (
    <div style={{
      minHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.75rem 1rem'
    }}>
      <div style={
        stage === 'pno_entry' || stage === 'password_entry'
          ? {
              width: '100%',
              maxWidth: '340px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }
          : {
              width: '100%',
              maxWidth: stage === 'register_entry' ? '680px' : '480px',
              background: 'var(--bg-surface, #111827)',
              border: '1px solid var(--khaki-border, rgba(196, 151, 86, 0.35))',
              borderTop: '4px solid var(--khaki-primary, #c49756)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-card, 0 10px 30px rgba(0,0,0,0.5))',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              transition: 'max-width 0.25s ease'
            }
      }>

        {/* ============================================================== */}
        {/* STAGE 1: ENTER PNO (EXTREMELY MINIMAL - INPUT + ARROW ONLY)    */}
        {/* ============================================================== */}
        {stage === 'pno_entry' && (
          <form
            onSubmit={handlePnoSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
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
                onChange={(e) => {
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

        {/* ============================================================== */}
        {/* STAGE 2: PASSWORD SCREEN (EXTREMELY MINIMAL - INPUT + ARROW)   */}
        {/* ============================================================== */}
        {stage === 'password_entry' && (
          <form
            onSubmit={handlePasswordSubmit}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
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
                onChange={(e) => {
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

        {/* ============================================================== */}
        {/* STAGE 3: NEW REGISTRATION (SHOWN WHEN PNO IS NOT REGISTERED)  */}
        {/* ============================================================== */}
        {stage === 'register_entry' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header with Back button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStage('pno_entry');
                  setRegError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--khaki-primary, #c49756)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.82rem',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                <ArrowLeft size={16} />
                वापस जाएं (Back)
              </button>

              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                नया कार्मिक स्व-पंजीकरण
              </span>
            </div>

            <div style={{
              background: 'rgba(196,151,86,0.1)',
              border: '1px solid rgba(196,151,86,0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              color: '#e2e8f0',
              lineHeight: 1.45
            }}>
              दर्ज किया गया PNO <strong>({regForm.pno})</strong> डेटाबेस में अपंजीकृत पाया गया। कृपया अपनी आधिकारिक विवरण भरें। सत्यापन उपरांत आपका खाता सक्रिय किया जाएगा।
            </div>

            {regError && (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.82rem'
              }}>
                {regError}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegisterFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {/* PNO Field (Read-only verified from Step 1) */}
              <div className="form-group">
                <label className="form-label">PNO नंबर (Personal No.) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={regForm.pno}
                  readOnly
                  style={{ background: 'rgba(0,0,0,0.3)', opacity: 0.85, cursor: 'not-allowed' }}
                />
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>अधिकारी/कर्मचारी का नाम *</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 500 }}>
                    🔤 स्वतः हिंदी टाइपिंग (English + Space)
                  </span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="उदा. अमित कुमार सिंह"
                  value={regForm.name}
                  onChange={(e) => handleRegTransliterateChange(e, 'name')}
                  onBlur={() => handleRegFieldBlur('name')}
                  required
                />
              </div>

              {/* Designation / Post */}
              <div className="form-group">
                <label className="form-label">पदनाम (Designation) *</label>
                <select
                  className="form-select"
                  value={regForm.post}
                  onChange={(e) => setRegForm({ ...regForm, post: e.target.value })}
                  required
                >
                  {effectivePosts.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="form-group">
                <label className="form-label">तैनाती जनपद (District) *</label>
                <select
                  className="form-select"
                  value={regForm.district}
                  onChange={(e) => setRegForm({ ...regForm, district: e.target.value, office: '' })}
                  required
                >
                  {effectiveDistricts.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Thana / Office */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>थाना / कार्यालय (Office/Thana) *</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 500 }}>
                    🔤 स्वतः हिंदी टाइपिंग (English + Space)
                  </span>
                </label>
                {districtOffices.length > 0 ? (
                  <select
                    className="form-select"
                    value={regForm.office}
                    onChange={(e) => setRegForm({ ...regForm, office: e.target.value })}
                    required
                  >
                    <option value="">-- थाना/कार्यालय चुनें --</option>
                    {districtOffices.map((off, idx) => (
                      <option key={idx} value={off}>{off}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. थाना कोतवाली / पुलिस लाइन"
                    value={regForm.office}
                    onChange={(e) => handleRegTransliterateChange(e, 'office')}
                    onBlur={() => handleRegFieldBlur('office')}
                    required
                  />
                )}
              </div>

              {/* Mobile Phone */}
              <div className="form-group">
                <label className="form-label">सरकारी/व्यक्तिगत मोबाइल नंबर *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="10 अंकों का मोबाइल नंबर"
                  maxLength="10"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value.replace(/\D/g, '') })}
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">नया पासवर्ड बनाएं *</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="कम से कम 4 अक्षरों का पासवर्ड"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  required
                />
              </div>

              {/* Mandatory Uniform Photo */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={16} color="var(--khaki-primary, #c49756)" />
                  आधिकारिक वर्दी (Uniform) फोटो * (अनिवार्य सत्यापन)
                </label>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px dashed rgba(196,151,86,0.4)',
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}>
                  {regForm.uniformPhoto ? (
                    <img
                      src={regForm.uniformPhoto}
                      alt="Uniform Photo Preview"
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--khaki-primary, #c49756)'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8'
                    }}>
                      <Camera size={26} />
                    </div>
                  )}

                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="uniform-upload-input"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="uniform-upload-input"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Upload size={14} />
                      {regForm.uniformPhoto ? 'फोटो बदलें' : 'वर्दी फोटो अपलोड करें'}
                    </label>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                      अधिकतम 1 MB (JPG/PNG)। स्वचालित कम्प्रेस होगी।
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.98rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <UserPlus size={18} />
                  <span>पंजीकरण सबमिट करें (Submit Registration)</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE 4: REGISTRATION SUCCESS NOTIFICATION                     */}
        {/* ============================================================== */}
        {stage === 'reg_success' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.2)',
              border: '2px solid #22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={36} color="#22c55e" />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#4ade80', fontWeight: 800 }}>
                पंजीकरण सफलतापूर्वक सबमिट हुआ!
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                आपका विवरण एवं वर्दी फोटो सुरक्षित रूप से डेटाबेस पर दर्ज कर लिया गया है। ज़िला Co-Admin अथवा Super Admin द्वारा सत्यापन के उपरांत आपका खाता सक्रिय किया जाएगा।
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStage('pno_entry');
                setPnoInput('');
              }}
              className="btn btn-primary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
                borderRadius: '8px',
                marginTop: '0.5rem'
              }}
            >
              ← वापस मुख्य लॉगिन पर जाएं
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
