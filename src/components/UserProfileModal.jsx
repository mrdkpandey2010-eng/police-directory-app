import React, { useState } from 'react';
import { X, User, Phone, MapPin, Building2, KeyRound, Save, AlertCircle, CheckCircle2, ShieldCheck, Camera, Upload } from 'lucide-react';
import { OFFICES } from '../data/mockContacts';

export default function UserProfileModal({ 
  user, 
  isOpen, 
  onClose, 
  onUpdateProfileRequest,
  onChangePassword,
  onUpdateUniformPhoto,
  offices = []
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'edit' | 'password'

  const districtOffices = React.useMemo(() => {
    if (!Array.isArray(offices) || !user) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === user.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, user]);

  const [formData, setFormData] = useState({
    office: user?.office || '',
    phone: user?.phone || '',
    whatsapp: user?.whatsapp || user?.phone || '',
    email: user?.email || ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notice, setNotice] = useState(null);

  if (!isOpen || !user) return null;

  const handleUniformPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'कृपया केवल इमेज (JPG / PNG) फ़ाइल चुनें।' });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'कृपया 3 MB से छोटी फ़ोटो चुनें।' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (onUpdateUniformPhoto) {
        onUpdateUniformPhoto(user.id, event.target.result);
        setNotice({ type: 'success', text: 'वर्दी फोटो सफलतापूर्वक अपडेट की गई!' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!formData.phone || !formData.office) {
      setNotice({ type: 'error', text: 'कृपया मोबाइल नंबर एवं थाना/कार्यालय अवश्य भरें।' });
      return;
    }

    onUpdateProfileRequest(user.id, formData);
    setNotice({ 
      type: 'success', 
      text: 'आपकी प्रोफ़ाइल अपडेट का अनुरोध सबमिट हो गया है! यह आपके ज़िला Co-Admin या Admin के अनुमोदन (Approval) के बाद अपडेट होगी।' 
    });
    setTimeout(() => {
      setActiveTab('details');
      setNotice(null);
    }, 2500);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setNotice({ type: 'error', text: 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते हैं।' });
      return;
    }
    if (passwordData.newPassword.length < 4) {
      setNotice({ type: 'error', text: 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए।' });
      return;
    }

    onChangePassword(user.id, passwordData.newPassword);
    setNotice({ type: 'success', text: 'पासवर्ड सफलतापूर्वक बदल दिया गया है!' });
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setTimeout(() => {
      setActiveTab('details');
      setNotice(null);
    }, 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.1)',
              border: '2px solid var(--gold-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {user.uniformPhoto ? (
                <img src={user.uniformPhoto} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontWeight: 700, color: 'var(--gold-primary)', fontSize: '1.1rem' }}>
                  {user.name.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>
                मेरी प्रोफ़ाइल (My Profile)
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--gold-primary)' }}>
                {user.pno} • {user.district}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => { setActiveTab('details'); setNotice(null); }}
          >
            <User size={15} />
            प्रोफ़ाइल विवरण
          </button>

          <button 
            className={`admin-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('edit'); setNotice(null); }}
          >
            <Save size={15} />
            प्रोफ़ाइल अपडेट अनुरोध
          </button>

          <button 
            className={`admin-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => { setActiveTab('password'); setNotice(null); }}
          >
            <KeyRound size={15} />
            पासवर्ड बदलें
          </button>
        </div>

        {notice && (
          <div className={`status-tag ${notice.type === 'success' ? 'status-approved' : 'status-blocked'}`} style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', width: '100%', borderRadius: '8px' }}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notice.text}
          </div>
        )}

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--glass-border-light)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>खाता स्थिति (Status):</span>
                <div style={{ marginTop: '2px' }}>
                  {user.status === 'approved' && <span className="status-tag status-approved">सक्रिय एवं स्वीकृत (Active)</span>}
                  {user.status === 'pending' && <span className="status-tag status-pending">अनुमोदन हेतु लंबित (Pending Approval)</span>}
                  {user.status === 'blocked' && <span className="status-tag status-blocked">ब्लॉक (Blocked)</span>}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>रोल (Role):</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
                  पुलिस कर्मचारी (User)
                </div>
              </div>
            </div>

            <div className="info-rows" style={{ border: 'none', padding: 0 }}>
              <div className="info-item">
                <User size={16} />
                <span>नाम: <strong style={{ color: 'var(--text-bright)' }}>{user.name}</strong></span>
              </div>
              <div className="info-item">
                <Building2 size={16} />
                <span>पद (Post): <strong>{user.post}</strong></span>
              </div>
              <div className="info-item">
                <MapPin size={16} />
                <span>ज़िला: <strong>{user.district}</strong></span>
              </div>
              <div className="info-item">
                <Building2 size={16} />
                <span>कार्यालय / थाना: <strong>{user.office}</strong></span>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <span>मोबाइल: <strong>{user.phone}</strong></span>
              </div>
              <div className="info-item">
                <Phone size={16} />
                <span>वॉट्सऐप: <strong>{user.whatsapp || user.phone}</strong></span>
              </div>
            </div>

            {/* UNIFORM PHOTO VERIFICATION CARD */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '2px solid #10b981',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {user.uniformPhoto ? (
                    <img src={user.uniformPhoto} alt="Uniform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={22} color="#f59e0b" />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ShieldCheck size={16} color="#10b981" />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#34d399' }}>
                      {user.uniformPhoto ? 'विभागीय वर्दी फोटो सत्यापित' : 'वर्दी फोटो प्रतीक्षारत'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                    {user.uniformPhoto ? 'यह फोटो आपके संपर्क कार्ड एवं मैसेज बॉक्स में प्रदर्शित हो रही है।' : 'ऐप संचालन हेतु वर्दी वाली फोटो अपलोड करना अनिवार्य है।'}
                  </div>
                </div>
              </div>

              <label style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <Upload size={13} />
                <span>फोटो बदलें</span>
                <input type="file" accept="image/*" onChange={handleUniformPhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#fcd34d' }}>
              💡 <strong>नोट:</strong> सुरक्षा कारणों से कर्मचारी का नाम और पद सीधे नहीं बदल सकते। थाना, फोन या ईमेल अपडेट करने पर अनुरोध आपके ज़िला Co-Admin / Admin के अप्रूवल के बाद अपडेट होता है।
            </div>
          </div>
        )}

        {/* TAB 2: UPDATE REQUEST */}
        {activeTab === 'edit' && (
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              प्रोफ़ाइल विवरण अपडेट करें (यह बदलाव आपके ज़िला Co-Admin द्वारा स्वीकृत किया जाएगा):
            </div>

            <div className="form-group">
              <label className="form-label">वर्तमान कार्यालय / थाना (Office/Thana)</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={formData.office}
                  onChange={e => setFormData({ ...formData, office: e.target.value })}
                  required
                />
                {districtOffices.length > 0 && (
                  <select
                    className="form-select"
                    style={{ width: '220px' }}
                    onChange={e => {
                      if (e.target.value) setFormData({ ...formData, office: e.target.value });
                    }}
                  >
                    <option value="">-- त्वरित चयन ({user.district}) --</option>
                    {districtOffices.map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">मोबाइल नंबर (Calling Phone)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">वॉट्सऐप नंबर (WhatsApp)</label>
              <input
                type="tel"
                className="form-input"
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ईमेल पता</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <Save size={16} />
              अपडेट अनुरोध सबमिट करें (Submit For Approval)
            </button>
          </form>
        )}

        {/* TAB 3: PASSWORD CHANGE */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">नया पासवर्ड</label>
              <input
                type="password"
                className="form-input"
                placeholder="नया पासवर्ड दर्ज करें"
                value={passwordData.newPassword}
                onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">नए पासवर्ड की पुष्टि करें</label>
              <input
                type="password"
                className="form-input"
                placeholder="पुष्टि हेतु पुनः पासवर्ड दर्ज करें"
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              <KeyRound size={16} />
              पासवर्ड सुरक्षित करें
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
