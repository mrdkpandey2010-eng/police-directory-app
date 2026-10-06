import React, { useState } from 'react';
import { 
  X, User, Phone, MapPin, Building2, KeyRound, Save, AlertCircle, 
  CheckCircle2, ShieldCheck, Camera, Upload, ArrowRightLeft, Clock, Send
} from 'lucide-react';
import { OFFICES } from '../data/mockContacts';
import { validateFileSize, compressImage } from '../utils/imageCompressor';

export default function UserProfileModal({ 
  user, 
  isOpen, 
  onClose, 
  onUpdateProfileRequest,
  onChangePassword,
  onUpdateUniformPhoto,
  onRequestDistrictTransfer,
  onCancelDistrictTransfer,
  districts = [],
  offices = []
}) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'edit' | 'transfer' | 'password'

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

  // Transfer Request Form State
  const [transferTargetDistrict, setTransferTargetDistrict] = useState(
    districts.find(d => d !== 'सभी ज़िले' && d !== 'सभी ज़िले (All Districts)' && d !== user?.district) || ''
  );
  const [transferReason, setTransferReason] = useState('');

  const [notice, setNotice] = useState(null);

  if (!isOpen || !user) return null;

  const handleUniformPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', text: 'कृपया केवल इमेज (JPG / PNG) फ़ाइल चुनें।' });
      return;
    }

    const sizeCheck = validateFileSize(file, 'photo');
    if (!sizeCheck.valid) {
      setNotice({ type: 'error', text: sizeCheck.error });
      return;
    }

    try {
      const compressed = await compressImage(file, 480, 480, 0.75);
      if (onUpdateUniformPhoto) {
        onUpdateUniformPhoto(user.id, compressed);
        setNotice({ type: 'success', text: 'वर्दी फोटो सफलतापूर्वक अपडेट की गई!' });
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (onUpdateUniformPhoto) {
          onUpdateUniformPhoto(user.id, event.target.result);
          setNotice({ type: 'success', text: 'वर्दी फोटो सफलतापूर्वक अपडेट की गई!' });
        }
      };
      reader.readAsDataURL(file);
    }
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

  // Submit District Transfer Request Handler
  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferTargetDistrict || transferTargetDistrict === user.district) {
      setNotice({ type: 'error', text: 'कृपया अपने वर्तमान जनपद से भिन्न कोई अन्य जनपद चुनें।' });
      return;
    }

    if (!transferReason.trim()) {
      setNotice({ type: 'error', text: 'कृपया स्थानांतरण का कारण या आदेश संख्या अवश्य दर्ज करें।' });
      return;
    }

    if (onRequestDistrictTransfer) {
      onRequestDistrictTransfer(user.id, transferTargetDistrict, transferReason);
      setNotice({
        type: 'success',
        text: `जनपद स्थानांतरण अनुरोध (${user.district} ➔ ${transferTargetDistrict}) दर्ज हुआ! वर्तमान ज़िला Co-Admin द्वारा अग्रसारित होने व Super Admin अनुमोदन उपरांत यह प्रभावी होगा।`
      });
      setTransferReason('');
    }
  };

  const hasPendingTransfer = Boolean(user.districtTransfer);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
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
                {user.pno} • पदस्थापित जनपद: {user.district}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="admin-tabs" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
          <button 
            className={`admin-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => { setActiveTab('details'); setNotice(null); }}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
          >
            <User size={14} />
            विवरण
          </button>

          <button 
            className={`admin-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => { setActiveTab('edit'); setNotice(null); }}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Save size={14} />
            थाना/फोन अपडेट
          </button>

          <button 
            className={`admin-tab ${activeTab === 'transfer' ? 'active' : ''}`}
            onClick={() => { setActiveTab('transfer'); setNotice(null); }}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
          >
            <ArrowRightLeft size={14} />
            जनपद स्थानांतरण
            {hasPendingTransfer && (
              <span style={{ background: '#f59e0b', color: '#000', borderRadius: '10px', fontSize: '0.68rem', padding: '1px 6px', fontWeight: 800, marginLeft: '4px' }}>
                लंबित
              </span>
            )}
          </button>

          <button 
            className={`admin-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => { setActiveTab('password'); setNotice(null); }}
            style={{ padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
          >
            <KeyRound size={14} />
            पासवर्ड
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
                  {user.status === 'inactive' && <span className="status-tag status-blocked" style={{ color: '#94a3b8', borderColor: '#475569' }}>निष्क्रिय (Inactive)</span>}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>रोल (Role):</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
                  {user.isCoAdmin ? `ज़िला Co-Admin (${user.district})` : 'पुलिस कर्मचारी (User)'}
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
                <span>पदस्थापित जनपद: <strong style={{ color: 'var(--khaki-light)' }}>{user.district}</strong> <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>(स्थायी)</span></span>
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
              💡 <strong>विभागीय सुरक्षा नियम:</strong> नाम, पद एवं पदस्थापित जनपद सीधे नहीं बदले जा सकते। जनपद बदलने हेतु 'जनपद स्थानांतरण' टैब से विधिवत आवेदन करें।
            </div>
          </div>
        )}

        {/* TAB 2: UPDATE REQUEST (THANA / PHONE / EMAIL) */}
        {activeTab === 'edit' && (
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--gold-light)' }}>
              थाना या मोबाइल नंबर अपडेट करें (यह बदलाव आपके ज़िला Co-Admin / Admin द्वारा स्वीकृत किया जाएगा):
            </div>

            {/* Locked District Display */}
            <div className="form-group" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
              <label className="form-label" style={{ margin: 0, color: 'var(--khaki-primary)', fontSize: '0.78rem' }}>
                🔒 पदस्थापित जनपद (District Locked):
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                  {user.district}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('transfer')}
                  style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', fontSize: '0.74rem', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  जनपद स्थानांतरण अनुरोध करें &rarr;
                </button>
              </div>
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

        {/* TAB 3: DISTRICT TRANSFER REQUEST (STRICT APPROVAL WORKFLOW) */}
        {activeTab === 'transfer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(30, 58, 138, 0.25)',
              border: '1px solid rgba(196, 151, 86, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem',
              fontSize: '0.8rem',
              color: 'var(--khaki-light)',
              lineHeight: 1.5
            }}>
              🏛️ <strong>जनपद स्थानांतरण नियम:</strong> पुलिस कार्मिक सीधे स्वयं अपना जनपद नहीं बदल सकते। आपके द्वारा सबमिट किया गया स्थानांतरण अनुरोध पहले <strong>वर्तमान जनपद के Co-Admin</strong> द्वारा अग्रसारित किया जाएगा, तत्पश्चात <strong>मुख्यालय Super Admin</strong> के अनुमोदन उपरांत ही नया जनपद मान्य होगा।
            </div>

            {hasPendingTransfer ? (
              /* Already Pending Transfer Status Card */
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={18} color="#f59e0b" />
                    <span style={{ fontWeight: 700, color: '#fcd34d', fontSize: '0.92rem' }}>
                      स्थानांतरण अनुरोध प्रक्रियाधीन (Under Process)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {user.districtTransfer.requestedAt ? new Date(user.districtTransfer.requestedAt).toLocaleDateString('hi-IN') : ''}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>वर्तमान जनपद</div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{user.districtTransfer.fromDistrict}</div>
                  </div>

                  <ArrowRightLeft size={20} color="var(--khaki-primary)" />

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>नवीन पदस्थापित जनपद</div>
                    <div style={{ fontWeight: 800, color: '#34d399', fontSize: '1rem' }}>{user.districtTransfer.toDistrict}</div>
                  </div>
                </div>

                {user.districtTransfer.reason && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    <strong>आदेश/कारण:</strong> {user.districtTransfer.reason}
                  </div>
                )}

                {/* Workflow Status Tracker */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span style={{ color: '#fff' }}>चरण 1: कार्मिक द्वारा आवेदन सबमिट (पूर्ण)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                    {user.districtTransfer.status === 'pending_admin' ? (
                      <>
                        <CheckCircle2 size={15} color="#10b981" />
                        <span style={{ color: '#fff' }}>
                          चरण 2: ज़िला Co-Admin द्वारा सत्यापित व मुख्यालय अग्रसारित ({user.districtTransfer.forwardedBy || 'Co-Admin'})
                        </span>
                      </>
                    ) : (
                      <>
                        <Clock size={15} color="#f59e0b" />
                        <span style={{ color: '#fcd34d' }}>
                          चरण 2: वर्तमान ज़िला Co-Admin ({user.districtTransfer.fromDistrict}) की समीक्षाधीन
                        </span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                    <Clock size={15} color={user.districtTransfer.status === 'pending_admin' ? '#f59e0b' : '#64748b'} />
                    <span style={{ color: user.districtTransfer.status === 'pending_admin' ? '#fcd34d' : '#64748b' }}>
                      चरण 3: पुलिस महानिदेशक मुख्यालय (Super Admin) अंतिम स्वीकृति
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('क्या आप अपना स्थानांतरण अनुरोध रद्द करना चाहते हैं?')) {
                      if (onCancelDistrictTransfer) onCancelDistrictTransfer(user.id);
                    }
                  }}
                  className="btn btn-danger"
                  style={{ width: '100%', marginTop: '0.4rem', fontSize: '0.8rem' }}
                >
                  स्थानांतरण अनुरोध रद्द करें
                </button>
              </div>
            ) : (
              /* New District Transfer Form */
              <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">वर्तमान पदस्थापित जनपद (Locked)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={user.district}
                    disabled
                    style={{ background: 'rgba(0,0,0,0.3)', color: '#94a3b8', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">नवीन पदस्थापित जनपद (Transfer To District) <span className="req">*</span></label>
                  <select
                    className="form-select"
                    value={transferTargetDistrict}
                    onChange={e => setTransferTargetDistrict(e.target.value)}
                    required
                  >
                    {districts
                      .filter(d => d !== 'सभी ज़िले' && d !== user.district)
                      .map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">स्थानांतरण आदेश संख्या / कारण (Order No. & Reason) <span className="req">*</span></label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="उदा. मुख्यालय आदेश क्रमांक DG-Trf/2026/894 अथवा पारिवारिक/प्रशासनिक कारण..."
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.35rem' }}>
                  <Send size={15} />
                  स्थानांतरण अनुरोध प्रेषित करें (Submit for Co-Admin Review)
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 4: PASSWORD CHANGE */}
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
