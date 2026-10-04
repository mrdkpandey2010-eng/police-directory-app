import React, { useState } from 'react';
import { 
  Shield, Lock, User, UserPlus, KeyRound, Building, ArrowRight, 
  AlertTriangle, CheckCircle2, ShieldAlert, Award, MapPin, Camera, Upload, Sparkles 
} from 'lucide-react';
import { DEFAULT_UNIFORM_PHOTO } from '../data/mockContacts';

export default function AuthGateway({ 
  onLoginSuccess, 
  onRegisterSubmit,
  contacts, 
  coAdmins,
  posts = [],
  districts = [],
  offices = []
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
    password: '1234',
    registrationNotes: '',
    uniformPhoto: null
  });
  const [regSuccess, setRegSuccess] = useState(false);

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
      setErrorMsg('गलत पासवर्ड! डिफ़ॉल्ट पासवर्ड 1234 है।');
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
      setErrorMsg('गलत Co-Admin पासवर्ड! डिफ़ॉल्ट पासवर्ड 1234 है।');
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
      setErrorMsg('गलत Admin PIN! डिफ़ॉल्ट PIN 1234 है।');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMsg('कृपया 3 MB से छोटी फ़ोटो अपलोड करें।');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setRegForm(prev => ({ ...prev, uniformPhoto: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUseDemoPhoto = () => {
    setErrorMsg('');
    setRegForm(prev => ({ ...prev, uniformPhoto: DEFAULT_UNIFORM_PHOTO }));
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

    // MANDATORY UNIFORM PHOTO CHECK
    if (!regForm.uniformPhoto) {
      setErrorMsg('⚠️ सुरक्षा नीति: वर्दी (यूनिफॉर्म) वाली फोटो अपलोड करना अनिवार्य है। इसके बिना ऐप का संचालन संभव नहीं होगा।');
      return;
    }

    setErrorMsg('');
    onRegisterSubmit(regForm);
    setRegSuccess(true);
  };

  // Quick 1-click test login triggers
  const triggerQuick = (roleKey, param) => {
    if (roleKey === 'admin') {
      onLoginSuccess({
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      });
    } else if (roleKey === 'co_admin') {
      const co = coAdmins.find(c => c.district === param) || coAdmins[0];
      onLoginSuccess({
        role: 'co_admin',
        ...co
      });
    } else if (roleKey === 'user') {
      const u = contacts.find(c => c.id === param) || contacts[2];
      onLoginSuccess({
        role: 'user',
        ...u
      });
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '620px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--glass-border)',
        borderTop: '4px solid var(--gold-primary)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        {/* Police Branding Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
          <div className="police-badge-icon" style={{ width: '60px', height: '60px' }}>
            <Shield size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              उत्तर प्रदेश पुलिस संपर्क पोर्टल
            </h1>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              आधिकारिक निर्देशिका एवं कॉलर ऐप • अधिकृत कार्मिक लॉगिन
            </p>
          </div>

          <div style={{ 
            background: 'rgba(229,184,66,0.1)', 
            border: '1px solid rgba(229,184,66,0.25)', 
            borderRadius: '8px', 
            padding: '6px 12px', 
            fontSize: '0.78rem', 
            color: 'var(--gold-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '4px'
          }}>
            <Lock size={13} color="var(--gold-primary)" />
            <span>गोपनीयता नियम: निर्देशिका केवल लॉगिन के पश्चात ही संबंधित जनपद अनुसार दिखेगी।</span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="admin-tabs" style={{ justifyContent: 'center' }}>
          <button 
            type="button"
            className={`admin-tab ${activeTab === 'user_login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user_login'); setErrorMsg(''); setRegSuccess(false); }}
          >
            <User size={15} />
            कर्मचारी लॉगिन
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setErrorMsg(''); setRegSuccess(false); }}
          >
            <UserPlus size={15} />
            नया स्व-पंजीकरण
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'co_admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); setRegSuccess(false); }}
          >
            <Building size={15} />
            ज़िला Co-Admin
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); setRegSuccess(false); }}
          >
            <Shield size={15} />
            Super Admin
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger-red)', color: '#fca5a5', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* TAB 1: EMPLOYEE LOGIN */}
        {activeTab === 'user_login' && (
          <form onSubmit={handleUserLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">PNO नंबर या मोबाइल नंबर</label>
              <input
                type="text"
                className="form-input"
                placeholder="उदा. PNO-012849103 या 9454401203"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">पासवर्ड (Default: 1234)</label>
              <input
                type="password"
                className="form-input"
                placeholder="अपना पासवर्ड दर्ज करें"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
              <ArrowRight size={16} />
              लॉगिन करें (अपने जनपद की निर्देशिका देखें)
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.25rem' }}>
              <button 
                type="button" 
                onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--gold-primary)', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                नया कर्मचारी खाता? यहाँ स्व-पंजीकरण करें
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: NEW SELF-REGISTRATION */}
        {activeTab === 'register' && (
          <div>
            {regSuccess ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={52} color="var(--success-emerald)" />
                <h3 style={{ color: 'var(--text-bright)', fontSize: '1.2rem', fontWeight: 700 }}>
                  पंजीकरण सफलतापूर्वक दर्ज हुआ!
                </h3>
                <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.85rem', borderRadius: '10px', color: '#fcd34d', fontSize: '0.85rem' }}>
                  <strong>Admin Approval Mandatory:</strong> आपकी प्रोफ़ाइल संबंधित ज़िला Co-Admin / Admin के सत्यापन एवं अनुमोदन हेतु भेजी गई है। अप्रूवल के पश्चात आप लॉगिन कर पाएंगे।
                </div>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => { setActiveTab('user_login'); setRegSuccess(false); }}
                  style={{ marginTop: '0.5rem' }}
                >
                  लॉगिन स्क्रीन पर जाएं
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--gold-light)' }}>
                  📝 पुलिस कर्मचारी अपना विवरण भरें। सत्यापन के बाद आपको अपने जनपद की निर्देशिका का एक्सेस मिलेगा।
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">कर्मचारी का नाम <span className="req">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. अमित कुमार सिंह"
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
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. थाना हजरतगंज / एसपी कार्यालय"
                      value={regForm.office}
                      onChange={e => setRegForm({ ...regForm, office: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">मोबाइल नंबर (Phone) <span className="req">*</span></label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="10 अंकों का मोबाइल"
                      value={regForm.phone}
                      onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">पासवर्ड चुनें (Default: 1234)</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="1234"
                      value={regForm.password}
                      onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                    />
                  </div>

                  {/* MANDATORY UNIFORM PHOTO FIELD */}
                  <div className="form-group full-width" style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.75rem',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label className="form-label" style={{ margin: 0, color: 'var(--gold-light)', fontWeight: 700, fontSize: '0.8rem' }}>
                        👮 वर्दी (यूनिफॉर्म) वाली फोटो * (अनिवार्य / Mandatory)
                      </label>
                      {regForm.uniformPhoto ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={12} />
                          फोटो संलग्न
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#fca5a5', fontWeight: 600 }}>
                          * अपलोड अनिवार्य
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '55px',
                        height: '55px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: regForm.uniformPhoto ? '2px solid var(--gold-primary)' : '2px dashed rgba(255,255,255,0.3)',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {regForm.uniformPhoto ? (
                          <img src={regForm.uniformPhoto} alt="Uniform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Camera size={20} color="rgba(255,255,255,0.4)" />
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <label style={{
                          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Upload size={12} />
                          <span>गैलरी से चुनें</span>
                          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                        </label>

                        <button
                          type="button"
                          onClick={handleUseDemoPhoto}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(229,184,66,0.4)',
                            color: 'var(--gold-light)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="आधिकारिक वर्दी डेमो फोटो"
                        >
                          <Sparkles size={12} />
                          <span>डेमो वर्दी फोटो</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.4rem' }}>
                  <UserPlus size={16} />
                  स्व-पंजीकरण सबमिट करें
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: CO-ADMIN LOGIN */}
        {activeTab === 'co_admin' && (
          <form onSubmit={handleCoAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--gold-light)' }}>
              🛡️ <strong>ज़िला Co-Admin पोर्टल:</strong> अपने संबंधित जनपद के यूज़र्स, पेंडिंग अप्रूवल एवं एक्सेल का प्रबंधन।
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
              <label className="form-label">Co-Admin पासवर्ड (Default: 1234)</label>
              <input
                type="password"
                className="form-input"
                placeholder="पासवर्ड दर्ज करें"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
              <Shield size={16} />
              ज़िला Co-Admin लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 4: SUPER ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              👑 <strong>Super Admin Access:</strong> समस्त जनपदों, Co-Admins, मास्टर सेटिंग्स और यूज़र्स का पूर्ण नियंत्रण।
            </div>

            <div className="form-group">
              <label className="form-label">Master Admin PIN (Default: 1234)</label>
              <input
                type="password"
                className="form-input"
                placeholder="1234"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
              <KeyRound size={16} />
              Super Admin लॉगिन
            </button>
          </form>
        )}

        {/* 1-Click Evaluation Shortcuts */}
        <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--gold-primary)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            ⚡ त्वरित 1-क्लिक परीक्षण शॉर्टकट (Instant Demo Logins):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('admin')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start' }}
            >
              👑 <strong>Super Admin</strong>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('co_admin', 'लखनऊ')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start' }}
            >
              🛡️ <strong>Co-Admin: लखनऊ</strong>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('co_admin', 'कानपुर नगर')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start' }}
            >
              🛡️ <strong>Co-Admin: कानपुर</strong>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('user', 'pol-103')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start' }}
            >
              👮 <strong>प्रिया वर्मा (लखनऊ)</strong>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('user', 'pol-106')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start' }}
            >
              👮 <strong>राकेश कुमार (कानपुर)</strong>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuick('user', 'pol-115')}
              style={{ fontSize: '0.78rem', padding: '6px 8px', justifyContent: 'flex-start', borderColor: 'rgba(245,158,11,0.5)', color: '#fde047' }}
              title="परीक्षण हेतु बिना फोटो वाला खाता: इसे क्लिक करने पर अनिवार्य वर्दी फोटो गेट खुलेगा"
            >
              ⚠️ <strong>विकास यादव (फोटो गेट टेस्ट)</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
