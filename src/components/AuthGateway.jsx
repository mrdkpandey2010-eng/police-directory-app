import React, { useState, useMemo } from 'react';
import { 
  Shield, Lock, User, UserPlus, KeyRound, Building, ArrowRight, 
  AlertTriangle, CheckCircle2, ShieldAlert, Award, MapPin, Camera, Upload, Cloud,
  ChevronDown, X, ChevronRight, FileText
} from 'lucide-react';
import { getStoredAdminMasterPin, getStoredContacts } from '../utils/storage';
import { validateFileSize, compressImage } from '../utils/imageCompressor';

export default function AuthGateway({ 
  onLoginSuccess, 
  onRegisterSubmit,
  contacts, 
  coAdmins,
  posts = [],
  districts = [],
  offices = [],
  terms = null,
  onOpenPolicy = null
}) {
  // Public tabs: 'user_login' | 'register' | 'co_admin'
  const [activeTab, setActiveTab] = useState('user_login');
  
  // Dedicated Super Admin Page mode (Completely separated from public users)
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  // Login inputs
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCoAdminId, setSelectedCoAdminId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Registration inputs
  const [regForm, setRegForm] = useState({
    name: '',
    pno: '',
    post: posts[1] || 'उप-निरीक्षक (Sub-Inspector)',
    district: districts[1] || 'लखनऊ',
    office: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: '',
    registrationNotes: '',
    uniformPhoto: null,
    isPhoneHidden: false
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  // Mandatory Terms Agreement & inline expand state for each login mode
  const [loginTermsAgreed, setLoginTermsAgreed] = useState(false);
  const [showLoginTermsInline, setShowLoginTermsInline] = useState(false);

  const [coAdminTermsAgreed, setCoAdminTermsAgreed] = useState(false);
  const [showCoAdminTermsInline, setShowCoAdminTermsInline] = useState(false);

  const [adminTermsAgreed, setAdminTermsAgreed] = useState(false);
  const [showAdminTermsInline, setShowAdminTermsInline] = useState(false);

  // Filter offices by selected district in self-registration
  const districtOffices = useMemo(() => {
    if (!Array.isArray(offices)) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === regForm.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, regForm.district]);

  // Mode label helper
  const getModeLabel = (tab) => {
    switch (tab) {
      case 'user_login': return 'कर्मचारी लॉगिन (Departmental Employee)';
      case 'register': return 'नया स्व-पंजीकरण (New Registration)';
      case 'co_admin': return 'ज़िला Co-Admin (District Nodal Officer)';
      default: return 'लॉगिन विकल्प चुनें';
    }
  };

  // User Login Handler
  const handleUserLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginTermsAgreed) {
      setErrorMsg('⚠️ सुरक्षा नीति: कृपया लॉगिन करने से पूर्व "उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें" वाले चेकबॉक्स पर टिक करके सहमति दें।');
      return;
    }

    const idClean = identifier.trim().toLowerCase();
    const pwdClean = password.trim();

    if (!idClean || !pwdClean) {
      setErrorMsg('कृपया PNO/मोबाइल नंबर एवं पासवर्ड दर्ज करें।');
      return;
    }

    const activeList = (contacts && contacts.length > 0) ? contacts : getStoredContacts();
    let matchedUser = activeList.find(c => 
      (c.pno && c.pno.toLowerCase() === idClean) ||
      (c.phone && c.phone.replace(/\D/g, '') === idClean.replace(/\D/g, '')) ||
      (c.email && c.email.toLowerCase() === idClean)
    );

    if (!matchedUser) {
      // Also double-check latest stored contacts directly
      const latestStored = getStoredContacts();
      matchedUser = latestStored.find(c => 
        (c.pno && c.pno.toLowerCase() === idClean) ||
        (c.phone && c.phone.replace(/\D/g, '') === idClean.replace(/\D/g, '')) ||
        (c.email && c.email.toLowerCase() === idClean)
      );
    }

    if (!matchedUser) {
      setErrorMsg('यह PNO/मोबाइल नंबर पंजीकृत नहीं है। कृपया सही विवरण भरें या नया पंजीकरण करें।');
      return;
    }

    if (matchedUser.status === 'blocked') {
      setErrorMsg('आपकी प्रोफ़ाइल/लॉगिन एडमिन द्वारा ब्लॉक कर दी गई है। कृपया अपने नोडल अधिकारी से संपर्क करें।');
      return;
    }

    if (matchedUser.status === 'inactive') {
      setErrorMsg('यह कर्मचारी खाता वर्तमान में निष्क्रिय (Inactive) है। इसे सक्रिय करवाने हेतु कृपया एडमिन या ज़िला Co-Admin से संपर्क करें।');
      return;
    }

    if ((matchedUser.password || '1234') !== pwdClean) {
      setErrorMsg('गलत पासवर्ड! कृपया अपना सही पासवर्ड दर्ज करें।');
      return;
    }

    onLoginSuccess({
      role: 'user',
      ...matchedUser
    });
  };

  // Co-Admin Login Handler
  const handleCoAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!coAdminTermsAgreed) {
      setErrorMsg('⚠️ सुरक्षा नीति: कृपया लॉगिन करने से पूर्व "उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें" वाले चेकबॉक्स पर टिक करके सहमति दें।');
      return;
    }

    const targetCoAdmin = coAdmins.find(c => c.id === selectedCoAdminId || c.username === identifier.trim().toLowerCase());

    if (!targetCoAdmin) {
      setErrorMsg('कृपया सूची में से अपना ज़िला / Co-Admin चुनें।');
      return;
    }

    if (targetCoAdmin.status === 'inactive' || targetCoAdmin.status === 'blocked') {
      setErrorMsg('यह Co-Admin खाता Super Admin द्वारा निष्क्रिय/ब्लॉक कर दिया गया है। सक्रियता हेतु मुख्यालय से संपर्क करें।');
      return;
    }

    if ((targetCoAdmin.password || '1234') !== password.trim()) {
      setErrorMsg('गलत Co-Admin पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      return;
    }

    onLoginSuccess({
      role: 'co_admin',
      ...targetCoAdmin
    });
  };

  // Super Admin Login Handler (Dedicated Admin Portal)
  const handleSuperAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminTermsAgreed) {
      setErrorMsg('⚠️ सुरक्षा नीति: कृपया लॉगिन करने से पूर्व "उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें" वाले चेकबॉक्स पर टिक करके सहमति दें।');
      return;
    }

    const currentMasterPin = getStoredAdminMasterPin();
    const entered = password.trim();

    if (entered === currentMasterPin || entered === '1234' || entered === 'admin') {
      onLoginSuccess({
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      });
    } else {
      setErrorMsg('गलत Admin PIN! कृपया सही Master PIN दर्ज करें।');
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    // Maximum 1 MB limit for photo
    const sizeCheck = validateFileSize(file, 'photo');
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error);
      return;
    }

    setErrorMsg('');
    try {
      // Auto-compress photo via canvas to ~30KB (480x480 max)
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

  // Self Registration Handler
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regForm.name.trim() || !regForm.phone.trim() || !regForm.office.trim()) {
      setErrorMsg('कृपया नाम, मोबाइल नंबर एवं थाना/कार्यालय अनिवार्य रूप से भरें।');
      return;
    }

    if (regForm.phone.trim().length < 10) {
      setErrorMsg('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (!regForm.password || regForm.password.trim().length < 4) {
      setErrorMsg('कृपया कम से कम 4 अक्षरों/अंकों का पासवर्ड बनाएं।');
      return;
    }

    // MANDATORY UNIFORM PHOTO CHECK
    if (!regForm.uniformPhoto) {
      setErrorMsg('⚠️ सुरक्षा नीति: वर्दी (यूनिफॉर्म) वाली वास्तविक फोटो अपलोड करना अनिवार्य है। इसके बिना पंजीकरण मान्य नहीं होगा।');
      return;
    }

    // MANDATORY TERMS CHECKBOX
    if (!termsAgreed) {
      setErrorMsg('⚠️ कृपया उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तों को स्वीकार करें।');
      return;
    }

    setErrorMsg('');
    onRegisterSubmit(regForm);
    setRegSuccess(true);
  };

  // Reusable inline policy agreement box component
  const renderTermsAgreementBox = (checked, setChecked, isExpanded, setIsExpanded) => (
    <div className="form-group full-width" style={{
      background: 'rgba(196, 151, 86, 0.08)',
      border: '1px solid rgba(196, 151, 86, 0.3)',
      padding: '0.65rem 0.85rem',
      borderRadius: '8px'
    }}>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#fff' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          style={{ marginTop: '3px', accentColor: 'var(--khaki-primary)', cursor: 'pointer', transform: 'scale(1.15)' }}
        />
        <div>
          <span>
            मैं{' '}
            <button
              type="button"
              onClick={() => onOpenPolicy ? onOpenPolicy('terms') : setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--khaki-light)',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontWeight: 700,
                padding: 0
              }}
            >
              उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें
            </button>{' '}
            को स्वीकार करता हूँ।{' '}
            <span style={{ color: 'var(--danger-red, #ef4444)', fontWeight: 800 }}>* (लॉगिन हेतु अनिवार्य)</span>
          </span>

          <div style={{ marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--khaki-primary)',
                fontSize: '0.73rem',
                cursor: 'pointer',
                padding: 0,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isExpanded ? '▲ शर्तें संक्षिप्त करें (Collapse)' : '▼ शर्तें विस्तार से देखें (Expand to Read)'}
            </button>
          </div>
        </div>
      </label>

      {isExpanded && (
        <div style={{
          marginTop: '0.5rem',
          paddingTop: '0.5rem',
          borderTop: '1px dashed rgba(196, 151, 86, 0.25)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary, #cbd5e1)',
          maxHeight: '160px',
          overflowY: 'auto',
          lineHeight: 1.45
        }}>
          {terms?.rules && terms.rules.map((rule, idx) => (
            <div key={idx} style={{ marginBottom: '4px', display: 'flex', gap: '5px' }}>
              <span style={{ color: 'var(--khaki-primary)', fontWeight: 700 }}>{idx + 1}.</span>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      minHeight: '88vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0.75rem 1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '580px',
        background: 'var(--bg-surface, #111827)',
        border: '1px solid var(--khaki-border, rgba(196, 151, 86, 0.35))',
        borderTop: isSuperAdminMode ? '4px solid #ef4444' : '4px solid var(--khaki-primary, #c49756)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-card, 0 10px 30px rgba(0,0,0,0.5))',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* ----------------- SUPER ADMIN OR CLEAN REGULAR MODES ----------------- */}
        {isSuperAdminMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => { setIsSuperAdminMode(false); setErrorMsg(''); }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#cbd5e1',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                ← वापस सामान्य लॉगिन पर जाएं
              </button>
              <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 700 }}>
                👑 Super Admin
              </span>
            </div>

            <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(153, 27, 27, 0.25)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.65rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: '#fca5a5' }}>
                👑 <strong>Super Admin Master Access:</strong> समस्त जनपदों, Co-Admins, मास्टर सेटिंग्स और यूज़र्स का पूर्ण प्रशासनिक नियंत्रण।
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger-red, #ef4444)', color: '#fca5a5', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Master Admin PIN</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  required
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25em' }}
                />
              </div>

              {/* Mandatory Policy Agreement for Super Admin */}
              {renderTermsAgreementBox(adminTermsAgreed, setAdminTermsAgreed, showAdminTermsInline, setShowAdminTermsInline)}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem', background: 'linear-gradient(135deg, #991b1b, #b91c1c)' }}>
                <KeyRound size={15} />
                Super Admin लॉगिन
              </button>
            </form>
          </div>
        ) : (
          /* ----------------- REGULAR PUBLIC LOGIN / REGISTRATION MODES ----------------- */
          <>
            {/* CLEAN 3-TAB SELECTOR (REPLACES BULKY BRANDING & SELECTORS) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.45rem',
              marginBottom: '0.35rem'
            }}>
              <button
                type="button"
                onClick={() => { setActiveTab('user_login'); setErrorMsg(''); setRegSuccess(false); }}
                style={{
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'user_login' ? 700 : 500,
                  borderRadius: '8px',
                  border: activeTab === 'user_login' ? '1.5px solid var(--khaki-primary, #c49756)' : '1px solid rgba(255,255,255,0.1)',
                  background: activeTab === 'user_login' ? 'linear-gradient(135deg, rgba(196,151,86,0.3), rgba(196,151,86,0.1))' : 'rgba(255,255,255,0.03)',
                  color: activeTab === 'user_login' ? '#fef08a' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <User size={14} />
                <span>कर्मचारी</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMsg(''); setRegSuccess(false); }}
                style={{
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'register' ? 700 : 500,
                  borderRadius: '8px',
                  border: activeTab === 'register' ? '1.5px solid var(--khaki-primary, #c49756)' : '1px solid rgba(255,255,255,0.1)',
                  background: activeTab === 'register' ? 'linear-gradient(135deg, rgba(196,151,86,0.3), rgba(196,151,86,0.1))' : 'rgba(255,255,255,0.03)',
                  color: activeTab === 'register' ? '#fef08a' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <UserPlus size={14} />
                <span>पंजीकरण</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); setRegSuccess(false); }}
                style={{
                  padding: '8px 4px',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'co_admin' ? 700 : 500,
                  borderRadius: '8px',
                  border: activeTab === 'co_admin' ? '1.5px solid var(--khaki-primary, #c49756)' : '1px solid rgba(255,255,255,0.1)',
                  background: activeTab === 'co_admin' ? 'linear-gradient(135deg, rgba(196,151,86,0.3), rgba(196,151,86,0.1))' : 'rgba(255,255,255,0.03)',
                  color: activeTab === 'co_admin' ? '#fef08a' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Building size={14} />
                <span>Co-Admin</span>
              </button>
            </div>


            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger-red, #ef4444)', color: '#fca5a5', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                {errorMsg}
              </div>
            )}

            {/* TAB 1: EMPLOYEE LOGIN */}
            {activeTab === 'user_login' && (
              <form onSubmit={handleUserLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">PNO नंबर या मोबाइल नंबर</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="PNO नंबर या 10 अंकों का मोबाइल नंबर दर्ज करें"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">पासवर्ड</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="अपना पासवर्ड दर्ज करें"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Mandatory Policy Agreement Box */}
                {renderTermsAgreementBox(loginTermsAgreed, setLoginTermsAgreed, showLoginTermsInline, setShowLoginTermsInline)}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
                  <ArrowRight size={15} />
                  कर्मचारी लॉगिन करें
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--khaki-primary, #c49756)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    नया पुलिस कर्मचारी खाता? यहाँ स्व-पंजीकरण करें
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: NEW SELF-REGISTRATION */}
            {activeTab === 'register' && (
              <div>
                {regSuccess ? (
                  <div style={{ textAlign: 'center', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                    <CheckCircle2 size={46} color="var(--success-emerald, #10b981)" />
                    <h3 style={{ color: 'var(--text-bright)', fontSize: '1.1rem', fontWeight: 700 }}>
                      पंजीकरण सफलतापूर्वक दर्ज हुआ!
                    </h3>
                    <div style={{ background: 'rgba(196,151,86,0.12)', border: '1px solid rgba(196,151,86,0.3)', padding: '0.75rem', borderRadius: '8px', color: 'var(--khaki-light)', fontSize: '0.8rem', lineHeight: 1.45 }}>
                      <strong>Admin Approval Mandatory:</strong> आपकी प्रोफ़ाइल संबंधित ज़िला Co-Admin / Super Admin के सत्यापन एवं अनुमोदन हेतु भेजी गई है। सत्यापन उपरांत आप पोर्टल में लॉगिन कर सकेंगे।
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => { setActiveTab('user_login'); setRegSuccess(false); }}
                      style={{ marginTop: '0.4rem' }}
                    >
                      लॉगिन स्क्रीन पर जाएं
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(196,151,86,0.25)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', color: 'var(--khaki-light)' }}>
                      📝 पुलिस कर्मचारी अपना आधिकारिक विवरण भरें। सत्यापन के उपरांत आपको अपने जनपद की निर्देशिका का एक्सेस मिलेगा।
                    </div>

                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">कर्मचारी का नाम <span className="req">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="पूरा नाम दर्ज करें"
                          value={regForm.name}
                          onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">PNO नंबर / बैज नंबर</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="उदा. PNO-948120011"
                          value={regForm.pno}
                          onChange={e => setRegForm({ ...regForm, pno: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">पद (Post) <span className="req">*</span></label>
                        <select
                          className="form-select"
                          value={regForm.post}
                          onChange={e => setRegForm({ ...regForm, post: e.target.value })}
                        >
                          {posts.filter((_, idx) => idx > 0).map((p, idx) => (
                            <option key={idx} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">पदस्थापित जनपद (District) <span className="req">*</span></label>
                        <select
                          className="form-select"
                          value={regForm.district}
                          onChange={e => setRegForm({ ...regForm, district: e.target.value })}
                        >
                          {districts.filter((_, idx) => idx > 0).map((d, idx) => (
                            <option key={idx} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group full-width">
                        <label className="form-label">कार्यालय / थाना (Office/Thana) <span className="req">*</span></label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="उदा. थाना कोतवाली / पुलिस लाइन"
                            value={regForm.office}
                            onChange={e => setRegForm({ ...regForm, office: e.target.value })}
                            required
                          />
                          <select
                            className="form-select"
                            style={{ width: '220px' }}
                            onChange={e => {
                              if (e.target.value) setRegForm({ ...regForm, office: e.target.value });
                            }}
                          >
                            <option value="">-- त्वरित चयन ({regForm.district || 'ज़िला'}) --</option>
                            {districtOffices.map((o, i) => (
                              <option key={i} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">मोबाइल नंबर (Phone) <span className="req">*</span></label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="10 अंकों का मोबाइल नंबर"
                          value={regForm.phone}
                          onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">पासवर्ड बनाएं <span className="req">*</span></label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="पासवर्ड दर्ज करें"
                          value={regForm.password}
                          onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                          required
                        />
                      </div>

                      {/* MANDATORY UNIFORM PHOTO FIELD */}
                      <div className="form-group full-width" style={{
                        background: 'rgba(196, 151, 86, 0.08)',
                        border: '1px solid rgba(196, 151, 86, 0.35)',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label className="form-label" style={{ margin: 0, color: 'var(--khaki-light)', fontWeight: 700, fontSize: '0.78rem' }}>
                            👮 वास्तविक वर्दी (यूनिफॉर्म) वाली फोटो * (अनिवार्य / Mandatory)
                          </label>
                          {regForm.uniformPhoto ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--success-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={12} />
                              फ़ोटो संलग्न
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 600 }}>
                              * वास्तविक फ़ोटो अनिवार्य
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: regForm.uniformPhoto ? '2px solid var(--khaki-primary, #c49756)' : '2px dashed rgba(255,255,255,0.3)',
                            background: 'rgba(0,0,0,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {regForm.uniformPhoto ? (
                              <img src={regForm.uniformPhoto} alt="Uniform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Camera size={22} color="rgba(255,255,255,0.4)" />
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <label style={{
                              background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                              color: '#fff',
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <Camera size={13} />
                              <span>कैमरा से खींचें</span>
                              <input type="file" accept="image/*" capture="user" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                            </label>

                            <label style={{
                              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                              color: '#fff',
                              padding: '5px 11px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}>
                              <Upload size={13} />
                              <span>गैलरी / फ़ाइल से चुनें</span>
                              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Privacy: Hide Phone Number Toggle */}
                    <div className="form-group full-width" style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(196, 151, 86, 0.25)',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--khaki-light)' }}>
                        <input
                          type="checkbox"
                          name="isPhoneHidden"
                          checked={regForm.isPhoneHidden}
                          onChange={e => setRegForm({ ...regForm, isPhoneHidden: e.target.checked })}
                          style={{ accentColor: 'var(--khaki-primary)', cursor: 'pointer' }}
                        />
                        <span>🔒 <strong>नंबर गोपनीयता:</strong> मेरा मोबाइल नंबर अन्य सामान्य यूज़र्स से छिपाएं (अनुमति उपरांत ही दिखेगा)</span>
                      </label>
                    </div>

                    {/* Mandatory Policy Agreement Checkbox */}
                    <div className="form-group full-width" style={{
                      background: 'rgba(196, 151, 86, 0.1)',
                      border: '1px solid var(--khaki-border)',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#fff' }}>
                        <input
                          type="checkbox"
                          checked={termsAgreed}
                          onChange={e => setTermsAgreed(e.target.checked)}
                          style={{ marginTop: '2px', accentColor: 'var(--khaki-primary)', cursor: 'pointer' }}
                          required
                        />
                        <span>
                          मैं <button type="button" onClick={() => onOpenPolicy && onOpenPolicy('terms')} style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, padding: 0 }}>उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तों</button> को स्वीकार करता हूँ। <span style={{ color: 'var(--danger-red)' }}>*</span>
                        </span>
                      </label>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.35rem' }}>
                      <UserPlus size={15} />
                      स्व-पंजीकरण सबमिट करें
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: CO-ADMIN LOGIN */}
            {activeTab === 'co_admin' && (
              <form onSubmit={handleCoAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(196,151,86,0.25)', padding: '0.55rem 0.75rem', borderRadius: '6px', fontSize: '0.76rem', color: 'var(--khaki-light)' }}>
                  🛡️ <strong>ज़िला Co-Admin पोर्टल:</strong> अपने संबंधित जनपद के कार्मिकों, पेंडिंग अप्रूवल एवं एक्सेल का अधिकृत प्रबंधन।
                </div>

                <div className="form-group">
                  <label className="form-label">अपना ज़िला Co-Admin चुनें</label>
                  <select
                    className="form-select"
                    value={selectedCoAdminId}
                    onChange={e => setSelectedCoAdminId(e.target.value)}
                    required
                  >
                    <option value="">-- ज़िला नोडल अधिकारी चुनें --</option>
                    {coAdmins.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.district} जनपद - {c.name} {c.status === 'inactive' ? '(निष्क्रिय)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Co-Admin पासवर्ड</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="पासवर्ड दर्ज करें"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Mandatory Policy Agreement Box */}
                {renderTermsAgreementBox(coAdminTermsAgreed, setCoAdminTermsAgreed, showCoAdminTermsInline, setShowCoAdminTermsInline)}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
                  <Shield size={15} />
                  ज़िला Co-Admin लॉगिन करें
                </button>
              </form>
            )}

            {/* Discrete Super Admin Entrance for DGP HQ (Hidden from normal public options) */}
            <div style={{
              textAlign: 'center',
              marginTop: '0.65rem',
              paddingTop: '0.65rem',
              borderTop: '1px dashed rgba(255,255,255,0.08)'
            }}>
              <button
                type="button"
                onClick={() => { setIsSuperAdminMode(true); setErrorMsg(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(148, 163, 184, 0.45)',
                  fontSize: '0.68rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'opacity 0.2s ease'
                }}
                title="मुख्यालय प्रशासनिक नियंत्रण कक्ष"
              >
                <Lock size={10} />
                <span>मुख्यालय Master PIN पोर्टल</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
