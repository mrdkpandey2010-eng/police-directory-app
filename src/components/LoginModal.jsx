import React, { useState } from 'react';
import { X, Lock, Shield, User, KeyRound, Building, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  contacts, 
  coAdmins 
}) {
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'co_admin' | 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCoAdminId, setSelectedCoAdminId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

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
      setErrorMsg('यह PNO/मोबाइल नंबर पंजीकृत नहीं है। कृपया सही विवरण भरें या पंजीकरण करें।');
      return;
    }

    if (matchedUser.status === 'blocked') {
      setErrorMsg('आपकी प्रोफ़ाइल/लॉगिन एडमिन द्वारा ब्लॉक कर दी गई है। कृपया नोडल अधिकारी से संपर्क करें।');
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
    onClose();
  };

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
    onClose();
  };

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
      onClose();
    } else {
      setErrorMsg('गलत Admin PIN! डिफ़ॉल्ट PIN 1234 है।');
    }
  };

  // Quick 1-click preset logins for evaluation
  const triggerQuickLogin = (role, extraData) => {
    if (role === 'admin') {
      onLoginSuccess({
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      });
    } else if (role === 'co_admin') {
      const co = coAdmins.find(c => c.district === extraData) || coAdmins[0];
      onLoginSuccess({
        role: 'co_admin',
        ...co
      });
    } else if (role === 'user') {
      const u = contacts.find(c => c.id === extraData) || contacts[2];
      onLoginSuccess({
        role: 'user',
        ...u
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Lock size={22} color="var(--gold-primary)" />
            पोर्टल लॉगिन (Role-Based Login)
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="admin-tabs" style={{ marginBottom: '0.5rem' }}>
          <button 
            type="button"
            className={`admin-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user'); setErrorMsg(''); }}
          >
            <User size={15} />
            कर्मचारी (User)
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'co_admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); }}
          >
            <Building size={15} />
            ज़िला Co-Admin
          </button>

          <button 
            type="button"
            className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
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
        {activeTab === 'user' && (
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
              <label className="form-label">पासवर्ड / PIN (Default: 1234)</label>
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
              <ArrowRight size={16} />
              कर्मचारी लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 2: CO-ADMIN LOGIN */}
        {activeTab === 'co_admin' && (
          <form onSubmit={handleCoAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">ज़िला नोडल अधिकारी चुनें</label>
              <select
                className="form-select"
                value={selectedCoAdminId}
                onChange={e => setSelectedCoAdminId(e.target.value)}
                required
              >
                <option value="">-- अपना ज़िला Co-Admin चुनें --</option>
                {coAdmins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.district} - {c.name}
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

        {/* TAB 3: SUPER ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              👑 <strong>Super Admin Access:</strong> पूरे राज्य के सभी ज़िलों, यूज़र्स, Co-Admins, एक्सेल अपडेट और सेटिंग्स का पूर्ण अधिकार।
            </div>

            <div className="form-group">
              <label className="form-label">Master Admin PIN / Password (Default: 1234)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Admin PIN दर्ज करें"
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

        {/* Quick Testing Shortcuts */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--gold-primary)', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ 1-क्लिक टेस्ट लॉगिन (Testing Shortcuts):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuickLogin('admin')}
              style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '6px 10px' }}
            >
              👑 <strong>Super Admin</strong> (सभी ज़िले & फुल अधिकार)
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuickLogin('co_admin', 'लखनऊ')}
              style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '6px 10px' }}
            >
              🛡️ <strong>Co-Admin: लखनऊ</strong> (केवल लखनऊ ज़िले का प्रबंधन)
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuickLogin('co_admin', 'कानपुर नगर')}
              style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '6px 10px' }}
            >
              🛡️ <strong>Co-Admin: कानपुर नगर</strong> (केवल कानपुर का प्रबंधन)
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => triggerQuickLogin('user', 'pol-103')}
              style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '6px 10px' }}
            >
              👮 <strong>User: प्रिया वर्मा</strong> (क्षेत्राधिकारी, DSP लखनऊ)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
