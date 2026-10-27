import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, Lock } from 'lucide-react';

import { handleTransliterateOnSpace, transliterateText } from '../utils/transliteration';

export default function EditContactModal({ 
  contact, 
  isOpen, 
  onClose, 
  onSave,
  posts = [],
  districts = [],
  offices = []
}) {
  const [formData, setFormData] = useState({
    id: '',
    pno: '',
    name: '',
    post: '',
    district: '',
    office: '',
    phone: '',
    whatsapp: '',
    email: '',
    status: 'approved',
    isPhoneHidden: false
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id || '',
        pno: contact.pno || '',
        name: contact.name || '',
        post: contact.post || ((posts && posts[1]) || ''),
        district: contact.district || ((districts && districts[1]) || ''),
        office: contact.office || '',
        phone: contact.phone || '',
        whatsapp: contact.whatsapp || contact.phone || '',
        email: contact.email || '',
        status: contact.status || 'approved',
        isPhoneHidden: Boolean(contact.isPhoneHidden)
      });
    }
  }, [contact, posts, districts]);

  const districtOffices = React.useMemo(() => {
    if (!Array.isArray(offices)) return [];
    return offices.filter(o => {
      const dist = typeof o === 'object' ? o.district : null;
      return !dist || dist === formData.district;
    }).map(o => typeof o === 'string' ? o : o.name);
  }, [offices, formData.district]);

  if (!isOpen || !contact) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTransliterateChange = (e, fieldName) => {
    const input = e.target;
    const val = input.value;
    const cursor = (input.selectionEnd !== null && input.selectionEnd !== undefined) ? input.selectionEnd : val.length;

    const res = handleTransliterateOnSpace(val, cursor);
    if (res.changed) {
      setFormData(prev => ({ ...prev, [fieldName]: res.text }));
      requestAnimationFrame(() => {
        if (input && typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(res.cursor, res.cursor);
        }
      });
    } else {
      setFormData(prev => ({ ...prev, [fieldName]: val }));
    }
  };

  const handleFieldBlur = (fieldName) => {
    setFormData(prev => {
      const current = prev[fieldName];
      if (!current || typeof current !== 'string') return prev;
      const converted = transliterateText(current);
      if (converted !== current) {
        return { ...prev, [fieldName]: converted };
      }
      return prev;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      name: transliterateText((formData.name || '').trim()),
      office: transliterateText((formData.office || '').trim())
    };
    onSave(finalData);
    onClose();
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Edit3 size={22} color="var(--gold-primary)" />
            अधिकारी प्रोफ़ाइल संपादन (Admin Profile Edit)
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>अधिकारी का नाम</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 500 }}>
                  🔤 स्वतः हिंदी टाइपिंग (English + Space)
                </span>
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={e => handleTransliterateChange(e, 'name')}
                onBlur={() => handleFieldBlur('name')}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">PNO नंबर / बैज नंबर</label>
              <input
                type="text"
                name="pno"
                className="form-input"
                value={formData.pno}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">पद (Designation)</label>
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
              <label className="form-label">ज़िला (District)</label>
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
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>कार्यालय / थाना (Office/Thana)</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 500 }}>
                  🔤 स्वतः हिंदी टाइपिंग (English + Space)
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  name="office"
                  className="form-input"
                  value={formData.office}
                  onChange={e => handleTransliterateChange(e, 'office')}
                  onBlur={() => handleFieldBlur('office')}
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
              <label className="form-label">मोबाइल नंबर (Phone)</label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
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
                value={formData.whatsapp}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ईमेल (Email)</label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">खाता स्थिति (Account Status)</label>
              <select
                name="status"
                className="form-select"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="approved">सक्रिय एवं स्वीकृत (Active / Approved)</option>
                <option value="inactive">निष्क्रिय (Inactive)</option>
                <option value="pending">लंबित (Pending)</option>
                <option value="blocked">ब्लॉक (Blocked)</option>
              </select>
            </div>

            {/* Privacy: Hide Phone Number Choice (NO / YES) */}
            <div className="form-group" style={{
              gridColumn: '1 / -1',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(196, 151, 86, 0.25)',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px'
            }}>
              <label className="form-label" style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--khaki-light)', fontSize: '0.8rem', fontWeight: 600 }}>
                <Lock size={14} color="var(--khaki-primary)" />
                <span>फोन नंबर छिपाएं (Hide Phone Number):</span>
              </label>
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: !formData.isPhoneHidden ? '#34d399' : '#cbd5e1' }}>
                  <input
                    type="radio"
                    name="editIsPhoneHidden"
                    value="no"
                    checked={!formData.isPhoneHidden}
                    onChange={() => setFormData(prev => ({ ...prev, isPhoneHidden: false }))}
                    style={{ accentColor: 'var(--khaki-primary)', cursor: 'pointer' }}
                  />
                  <span>🟢 <strong>NO (सार्वजनिक)</strong> — सभी जनपदों के यूज़र्स सीधे देख सकेंगे</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: formData.isPhoneHidden ? '#f59e0b' : '#cbd5e1' }}>
                  <input
                    type="radio"
                    name="editIsPhoneHidden"
                    value="yes"
                    checked={Boolean(formData.isPhoneHidden)}
                    onChange={() => setFormData(prev => ({ ...prev, isPhoneHidden: true }))}
                    style={{ accentColor: 'var(--khaki-primary)', cursor: 'pointer' }}
                  />
                  <span>🔒 <strong>YES (छिपाएं)</strong> — गोपनीय रहेगा (केवल अनुमति अनुरोध स्वीकृत होने पर दिखेगा)</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              रद्द करें
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              बदलाव सुरक्षित करें (Save)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
