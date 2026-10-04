import React, { useState } from 'react';
import { X, Lock, Shield, User, KeyRound, Building, ArrowRight } from 'lucide-react';

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
      setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
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
      setErrorMsg('गलत Co-Admin पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
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
      setErrorMsg('गलत Admin PIN! कृपया सही PIN दर्ज करें।');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '480px', padding: '1.25rem' }}
      >
        <div className="modal-header" style={{ paddingBottom: '0.65rem' }}>
          <div className="modal-title" style={{ fontSize: '1.1rem' }}>
            <Lock size={18} color="var(--khaki-primary, #c49756)" />
            <span>उत्तर प्रदेश पुलिस पोर्टल लॉगिन</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Selection */}
        <div className="admin-tabs" style={{ justifyContent: 'center', gap: '0.35rem' }}>
          <button 
            className={`admin-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <User size={14} />
            कर्मचारी लॉगिन
          </button>

          <button 
            className={`admin-tab ${activeTab === 'co_admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Building size={14} />
            ज़िला Co-Admin
          </button>

          <button 
            className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
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
        {activeTab === 'user' && (
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
                placeholder="पासवर्ड दर्ज करें"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <ArrowRight size={15} />
              कर्मचारी लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 2: CO-ADMIN LOGIN */}
        {activeTab === 'co_admin' && (
          <form onSubmit={handleCoAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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

        {/* TAB 3: SUPER ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '0.65rem', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--khaki-light)' }}>
              👑 <strong>Super Admin Access:</strong> पूरे राज्य के सभी ज़िलों, कार्मिकों, Co-Admins एवं सेटिंग्स का पूर्ण प्रशासनिक नियंत्रण।
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
    </div>
  );
}
