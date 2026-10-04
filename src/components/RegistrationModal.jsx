import React, { useState } from 'react';
import { X, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RegistrationModal({ 
  isOpen, 
  onClose, 
  onSubmitRegistration,
  districts = [],
  posts = [],
  offices = []
}) {
  const [formData, setFormData] = useState({
    pno: '',
    name: '',
    post: posts[1] || 'उप-निरीक्षक (Sub-Inspector)',
    district: districts[1] || 'लखनऊ',
    office: '',
    phone: '',
    whatsapp: '',
    email: '',
    password: '1234',
    registrationNotes: ''
  });

  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
                  {posts.filter((_, idx) => idx > 0).map((p, idx) => (
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
                >
                  {districts.filter((_, idx) => idx > 0).map((d, idx) => (
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
                    style={{ width: '190px' }}
                    onChange={e => {
                      if (e.target.value) setFormData({ ...formData, office: e.target.value });
                    }}
                  >
                    <option value="">-- त्वरित चयन --</option>
                    {offices.filter((_, i) => i > 0).map((o, i) => (
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
                <label className="form-label">लॉगिन पासवर्ड (Default: 1234)</label>
                <input
                  type="password"
                  name="password"
                  className="form-input"
                  placeholder="1234"
                  value={formData.password}
                  onChange={handleChange}
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
