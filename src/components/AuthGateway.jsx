import React, { useState, useMemo } from 'react';
import { 
  Shield, Lock, User, UserPlus, KeyRound, Building, ArrowRight, 
  AlertTriangle, CheckCircle2, ShieldAlert, Award, MapPin, Camera, Upload, Cloud
} from 'lucide-react';
import TermsFooter from './TermsFooter';

export default function AuthGateway({ 
  onLoginSuccess, 
  onRegisterSubmit,
  onOpenFirebaseSetup,
  isFirebaseConnected = false,
  contacts, 
  coAdmins,
  posts = [],
  districts = [],
  offices = [],
  terms = null,
  onOpenPolicy = null
}) {
  const [activeTab, setActiveTab] = useState('user_login'); // 'user_login' | 'register' | 'co_admin' | 'admin'
  
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

  // Filter offices by selected district
  const districtOffices = useMemo(() => {
    if (!Array.isArray(offices)) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === regForm.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, regForm.district]);

  // User Login Handler
  const handleUserLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const idClean = identifier.trim().toLowerCase();
    const pwdClean = password.trim();

    if (!idClean || !pwdClean) {
      setErrorMsg('कृपया PNO/मोबाइल नंबर एवं पासवर्ड दर्ज करें।');
      return;
    }

    const matchedUser = contacts.find(c => 
      (c.pno && c.pno.toLowerCase() === idClean) ||
      (c.phone && c.phone.replace(/\D/g, '') === idClean.replace(/\D/g, '')) ||
      (c.email && c.email.toLowerCase() === idClean)
    );

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
    const targetCoAdmin = coAdmins.find(c => c.id === selectedCoAdminId || c.username === identifier.trim().toLowerCase());

    if (!targetCoAdmin) {
      setErrorMsg('कृपया सूची में से अपना ज़िला / Co-Admin चुनें।');
      return;
    }

    if (targetCoAdmin.status === 'inactive') {
      setErrorMsg('यह Co-Admin खाता Super Admin द्वारा निष्क्रिय (Inactive) कर दिया गया है। सक्रियता हेतु मुख्यालय से संपर्क करें।');
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

  // Super Admin Login Handler
  const handleSuperAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.trim() === '1234' || password.trim() === 'admin') {
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('कृपया 5 MB से छोटी फ़ोटो अपलोड करें।');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setRegForm(prev => ({ ...prev, uniformPhoto: event.target.result }));
    };
    reader.readAsDataURL(file);
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
        borderTop: '4px solid var(--khaki-primary, #c49756)',
        borderRadius: 'var(--radius-lg, 12px)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-card, 0 10px 30px rgba(0,0,0,0.5))',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {/* Cloud Setup Button on Login Screen */}
        {onOpenFirebaseSetup && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '-0.35rem -0.5rem 0 0' }}>
            <button
              type="button"
              onClick={onOpenFirebaseSetup}
              style={{
                background: isFirebaseConnected ? 'rgba(16,185,129,0.15)' : 'rgba(196,151,86,0.15)',
                border: isFirebaseConnected ? '1px solid #10b981' : '1px solid var(--khaki-primary, #c49756)',
                color: isFirebaseConnected ? '#34d399' : 'var(--khaki-light, #dfb97e)',
                padding: '3px 8px',
                borderRadius: '16px',
                fontSize: '0.72rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Cloud size={12} />
              <span>{isFirebaseConnected ? 'क्लाउड लाइव चैट' : 'क्लाउड सिंक'}</span>
            </button>
          </div>
        )}

        {/* Police Branding Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem' }}>
          {/* Official UP Police Ribbon Accent */}
          <div style={{
            height: '3px',
            width: '60px',
            background: 'linear-gradient(90deg, #991b1b 50%, #1e3a8a 50%)',
            borderRadius: '2px',
            marginBottom: '2px'
          }} />

          <div className="police-badge-icon" style={{ 
            width: '54px', 
            height: '54px', 
            background: 'linear-gradient(145deg, #162c5b, #0b1a30)',
            border: '2px solid var(--khaki-primary, #c49756)',
            boxShadow: '0 0 15px rgba(196, 151, 86, 0.35)'
          }}>
            <Shield size={28} color="var(--khaki-light, #dfb97e)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-bright, #fff)' }}>
              उत्तर प्रदेश पुलिस संपर्क पोर्टल
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--khaki-light, #dfb97e)', marginTop: '1px' }}>
              आधिकारिक निर्देशिका एवं कॉलर ऐप • अधिकृत विभागीय लॉगिन
            </p>
          </div>

          <div style={{ 
            background: 'rgba(196,151,86,0.1)', 
            border: '1px solid rgba(196,151,86,0.3)', 
            borderRadius: '6px', 
            padding: '4px 10px', 
            fontSize: '0.74rem', 
            color: 'var(--khaki-light, #dfb97e)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <Lock size={12} color="var(--khaki-primary, #c49756)" />
            <span>गोपनीय शासकीय पोर्टल: केवल अधिकृत पुलिस कार्मिकों के उपयोग हेतु।</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="admin-tabs" style={{ justifyContent: 'center', gap: '0.35rem' }}>
          <button 
            type="button"
            className={`admin-tab ${activeTab === 'user_login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user_login'); setErrorMsg(''); setRegSuccess(false); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <User size={14} />
            कर्मचारी लॉगिन
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setRegSuccess(false); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <UserPlus size={14} />
            नया स्व-पंजीकरण
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'co_admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); setRegSuccess(false); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Building size={14} />
            ज़िला Co-Admin
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); setRegSuccess(false); }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Shield size={14} />
            Super Admin
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
                placeholder="PNO नंबर या मोबाइल नंबर दर्ज करें"
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <ArrowRight size={15} />
              लॉगिन करें
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

                  {/* REAL & MANDATORY UNIFORM PHOTO FIELD */}
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
                        {/* Real Camera capture option */}
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

                        {/* File/Gallery upload option */}
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

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <Shield size={15} />
              ज़िला Co-Admin लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 4: SUPER ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(196,151,86,0.25)', padding: '0.65rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--khaki-light)' }}>
              👑 <strong>Super Admin Access:</strong> समस्त जनपदों, Co-Admins, मास्टर सेटिंग्स और यूज़र्स का पूर्ण प्रशासनिक नियंत्रण।
            </div>

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
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <KeyRound size={15} />
              Super Admin लॉगिन
            </button>
          </form>
        )}
      </div>

      {/* Confidentiality Rules and Terms & Conditions Footer on Login Gateway */}
      <div style={{ width: '100%', maxWidth: '580px' }}>
        <TermsFooter terms={terms} />
      </div>
    </div>
  );
}
