import React, { useState } from 'react';
import { X, UserPlus, AlertTriangle, CheckCircle2, Camera, Upload } from 'lucide-react';
import { validateFileSize, compressImage } from '../utils/imageCompressor';
import { ALL_UP_DISTRICTS, STANDARD_POLICE_POSTS } from '../data/mockContacts';

export default function RegistrationModal({ 
  isOpen, 
  onClose, 
  onSubmitRegistration,
  onOpenPolicy,
  districts = [],
  posts = [],
  offices = []
}) {
  const effectiveDistricts = React.useMemo(() => {
    if (Array.isArray(districts) && districts.length > 1) {
      return districts.filter((_, idx) => idx > 0);
    }
    return ALL_UP_DISTRICTS.filter((_, idx) => idx > 0);
  }, [districts]);

  const effectivePosts = React.useMemo(() => {
    if (Array.isArray(posts) && posts.length > 1) {
      return posts.filter((_, idx) => idx > 0);
    }
    return STANDARD_POLICE_POSTS.filter((_, idx) => idx > 0);
  }, [posts]);

  const [formData, setFormData] = useState({
    pno: '',
    name: '',
    post: (posts && posts[1]) || (STANDARD_POLICE_POSTS && STANDARD_POLICE_POSTS[1]) || '',
    district: (districts && districts[1]) || (ALL_UP_DISTRICTS && ALL_UP_DISTRICTS[1]) || '',
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
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const districtOffices = React.useMemo(() => {
    if (!Array.isArray(offices)) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === formData.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, formData.district]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    const sizeCheck = validateFileSize(file, 'photo');
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error);
      return;
    }

    setErrorMsg('');
    try {
      const compressedUrl = await compressImage(file, 480, 480, 0.75);
      setFormData(prev => ({ ...prev, uniformPhoto: compressedUrl }));
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData(prev => ({ ...prev, uniformPhoto: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim() || !formData.office.trim()) {
      setErrorMsg('कृपया नाम, मोबाइल नंबर एवं कार्यालय/थाना अनिवार्य रूप से भरें।');
      return;
    }

    if (formData.phone.trim().length < 10) {
      setErrorMsg('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (!formData.password || formData.password.trim().length < 4) {
      setErrorMsg('कृपया कम से कम 4 अक्षरों/अंकों का पासवर्ड बनाएं।');
      return;
    }

    // MANDATORY UNIFORM PHOTO VALIDATION
    if (!formData.uniformPhoto) {
      setErrorMsg('⚠️ सुरक्षा नीति: वर्दी (यूनिफॉर्म) वाली वास्तविक फोटो अपलोड करना अनिवार्य है। इसके बिना ऐप का संचालन संभव नहीं होगा।');
      return;
    }

    // MANDATORY CONFIDENTIALITY TERMS CHECKBOX
    if (!termsAgreed) {
      setErrorMsg('⚠️ कृपया उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तों को स्वीकार करें।');
      return;
    }

    setErrorMsg('');
    onSubmitRegistration(formData);
    setSubmittedSuccess(true);
  };

  const handleCloseAll = () => {
    setSubmittedSuccess(false);
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCloseAll}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <UserPlus size={22} color="var(--gold-primary)" />
            कर्मचारी स्व-पंजीकरण / प्रोफ़ाइल अपडेट
          </h2>
          <button className="close-btn" onClick={handleCloseAll}>
            <X size={20} />
          </button>
        </div>

        {submittedSuccess ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <CheckCircle2 size={56} color="var(--success-emerald)" />
            <h3 style={{ color: 'var(--text-bright)', fontSize: '1.25rem', fontWeight: 700 }}>
              पंजीकरण सफलतापूर्वक दर्ज किया गया!
            </h3>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', padding: '1rem', borderRadius: '12px', color: '#fcd34d', fontSize: '0.9rem', maxWidth: '480px' }}>
              <strong>Admin Approval Mandatory:</strong> आपकी प्रोफ़ाइल जानकारी संबंधित ज़िला Co-Admin / Admin के पास अनुमोदन (Approval) हेतु भेज दी गई है। स्वीकृत होने के पश्चात यह निर्देशिका में दिखने लगेगी।
            </div>
            <button className="btn btn-primary" onClick={handleCloseAll} style={{ marginTop: '0.5rem' }}>
              ठीक है (Close)
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--gold-light)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={20} color="var(--gold-primary)" style={{ flexShrink: 0 }} />
              <span>
                केवल पुलिस विभाग के कर्मचारी ही अपनी प्रोफ़ाइल बना या अपडेट कर सकते हैं। एडमिन / ज़िला Co-Admin द्वारा सत्यापन के बाद ही यह सार्वजनिक रूप से सक्रिय होगी।
              </span>
            </div>

            {errorMsg && (
              <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger-red)', color: '#fca5a5', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                {errorMsg}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  कर्मचारी का नाम <span className="req">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="उदा. अमित कुमार सिंह"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">PNO नंबर / बैज नंबर</label>
                <input
                  type="text"
                  name="pno"
                  className="form-input"
                  placeholder="उदा. PNO-948120011"
                  value={formData.pno}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  पद / पदनाम (Post) <span className="req">*</span>
                </label>
                <select
                  name="post"
                  className="form-select"
                  value={formData.post}
                  onChange={handleChange}
                >
                  <option value="">-- पद चुनें --</option>
                  {effectivePosts.map((p, idx) => (
                    <option key={idx} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  ज़िला (District) <span className="req">*</span>
                </label>
                <select
                  name="district"
                  className="form-select"
                  value={formData.district}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- जनपद चुनें --</option>
                  {effectiveDistricts.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  कार्यालय / थाना (Office / Thana) <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    name="office"
                    className="form-input"
                    placeholder="उदा. थाना हजरतगंज / साइबर सेल / एसपी कार्यालय"
                    value={formData.office}
                    onChange={handleChange}
                    required
                  />
                  <select
                    className="form-select"
                    style={{ width: '220px' }}
                    onChange={e => {
                      if (e.target.value) setFormData({ ...formData, office: e.target.value });
                    }}
                  >
                    <option value="">-- त्वरित चयन ({formData.district || 'ज़िला'}) --</option>
                    {districtOffices.map((o, i) => (
                      <option key={i} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  मोबाइल नंबर (Calling Number) <span className="req">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="form-input"
                  placeholder="10 अंकों का मोबाइल नंबर"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  लॉगिन पासवर्ड <span className="req">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="कम से कम 4 अक्षरों का पासवर्ड"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">वॉट्सऐप नंबर (WhatsApp)</label>
                <input
                  type="tel"
                  name="whatsapp"
                  className="form-input"
                  placeholder="यदि कॉलिंग नंबर से अलग हो"
                  value={formData.whatsapp}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ईमेल पता (Email)</label>
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="उदा. officer@up.gov.in"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* MANDATORY UNIFORM PHOTO FIELD */}
              <div className="form-group full-width" style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '0.85rem',
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ margin: 0, color: 'var(--gold-light)', fontWeight: 700 }}>
                    👮 वर्दी (यूनिफॉर्म) वाली फोटो * (अनिवार्य / Mandatory)
                  </label>
                  {formData.uniformPhoto ? (
                    <span style={{ fontSize: '0.72rem', color: 'var(--success-emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={13} />
                      फोटो संलग्न
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600 }}>
                      * अपलोड अनिवार्य
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{
                    width: '65px',
                    height: '65px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: formData.uniformPhoto ? '2px solid var(--gold-primary)' : '2px dashed rgba(255,255,255,0.3)',
                    background: 'rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {formData.uniformPhoto ? (
                      <img src={formData.uniformPhoto} alt="Uniform" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Camera size={24} color="rgba(255,255,255,0.4)" />
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Camera capture button */}
                    <label style={{
                      background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
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

                    {/* Gallery / File button */}
                    <label style={{
                      background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
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
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
                  सुरक्षा नीति: केवल आधिकारिक वर्दी (यूनिफॉर्म) वाली वास्तविक फोटो ही मान्य है।
                </div>
              </div>

              <div className="form-group full-width">
                <label className="form-label">पंजीकरण / अपडेट का विवरण (Notes)</label>
                <textarea
                  name="registrationNotes"
                  className="form-textarea"
                  rows={2}
                  placeholder="उदा. नई पदस्थापना, नंबर परिवर्तन, या नया खाता"
                  value={formData.registrationNotes}
                  onChange={handleChange}
                />
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
                    checked={formData.isPhoneHidden}
                    onChange={e => setFormData({ ...formData, isPhoneHidden: e.target.checked })}
                    style={{ accentColor: 'var(--khaki-primary)', cursor: 'pointer' }}
                  />
                  <span>🔒 <strong>नंबर गोपनीयता:</strong> मेरा मोबाइल नंबर अन्य सामान्य यूज़र्स से छिपाएं (अनुमति मिलने पर ही दिखेगा)</span>
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseAll}>
                रद्द करें
              </button>
              <button type="submit" className="btn btn-primary">
                आवेदन सबमिट करें (Submit)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
