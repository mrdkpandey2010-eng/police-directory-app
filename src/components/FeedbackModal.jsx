import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Clock, Check, Building2, MapPin } from 'lucide-react';
import { DISTRICTS } from '../data/mockContacts';

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  feedbacks, 
  currentUser, 
  onSubmitFeedback, 
  onToggleResolveFeedback 
}) {
  const [activeTab, setActiveTab] = useState(currentUser?.role === 'user' ? 'submit' : 'list');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(currentUser?.district || 'लखनऊ');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const canManage = isAdmin || isCoAdmin;

  // Filter feedback: Co-Admin sees only their district, Admin sees all
  const filteredFeedbacks = feedbacks.filter(f => {
    if (isCoAdmin) {
      return f.district === currentUser.district;
    }
    return true;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    onSubmitFeedback({
      userId: currentUser?.id || '',
      userName: currentUser?.name || 'अज्ञात कर्मचारी',
      district: currentUser?.district || selectedDistrict,
      phone: currentUser?.phone || '',
      subject: subject.trim(),
      message: message.trim()
    });

    setSubmitSuccess(true);
    setSubject('');
    setMessage('');
    setTimeout(() => {
      setSubmitSuccess(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <MessageSquare size={22} color="var(--gold-primary)" />
            फीडबैक एवं सहायता केंद्र (Feedback & Helpdesk)
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Tab selection */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'submit' ? 'active' : ''}`}
            onClick={() => setActiveTab('submit')}
          >
            <Send size={15} />
            नया फीडबैक / समस्या दर्ज करें
          </button>

          {canManage && (
            <button 
              className={`admin-tab ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              <Clock size={15} />
              प्राप्त फीडबैक ({filteredFeedbacks.length})
              {isCoAdmin && <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({currentUser.district})</span>}
            </button>
          )}
        </div>

        {/* TAB 1: SUBMIT FEEDBACK */}
        {activeTab === 'submit' && (
          <div>
            {submitSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <CheckCircle2 size={48} color="var(--success-emerald)" />
                <h3 style={{ color: 'var(--text-bright)', fontSize: '1.2rem', fontWeight: 700 }}>
                  फीडबैक सफलतापूर्वक दर्ज हो गया!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  आपके सुझाव/शिकायत की समीक्षा संबंधित नोडल अधिकारी (Co-Admin) एवं एडमिन द्वारा की जाएगी।
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(30,58,138,0.25)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--gold-light)' }}>
                  💬 <strong>सुझाव एवं सहायता:</strong> ऐप में किसी नंबर की त्रुटि, स्थानांतरण, नई सुविधा या अन्य किसी समस्या की सूचना यहाँ दें।
                </div>

                {!currentUser && (
                  <div className="form-group">
                    <label className="form-label">आपका ज़िला चुनें</label>
                    <select
                      className="form-select"
                      value={selectedDistrict}
                      onChange={e => setSelectedDistrict(e.target.value)}
                    >
                      {DISTRICTS.filter((_, i) => i > 0).map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">विषय (Subject)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. मोबाइल नंबर में सुधार / नई सुविधा का सुझाव"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">विस्तृत संदेश / विवरण (Message)</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    placeholder="अपनी समस्या या सुझाव का विवरण यहाँ लिखें..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
                  <Send size={16} />
                  फीडबैक सबमिट करें
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE FEEDBACKS (ADMIN & CO-ADMIN) */}
        {activeTab === 'list' && canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {isAdmin ? 'सभी ज़िलों से प्राप्त फीडबैक:' : `${currentUser.district} ज़िले से प्राप्त फीडबैक:`}
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <CheckCircle2 size={36} color="var(--success-emerald)" />
                <p>कोई नया फीडबैक लंबित नहीं है।</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {filteredFeedbacks.map(f => (
                  <div 
                    key={f.id}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      border: f.status === 'open' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`status-tag ${f.status === 'open' ? 'status-pending' : 'status-approved'}`}>
                            {f.status === 'open' ? 'लंबित (Open)' : 'निस्तारित (Resolved)'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--gold-primary)', fontWeight: 600 }}>
                            <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {f.district}
                          </span>
                        </div>
                        <h4 style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 700, marginTop: '4px' }}>
                          {f.subject}
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          भेजने वाले: <strong>{f.userName}</strong> {f.phone ? `(${f.phone})` : ''} • तिथि: {new Date(f.createdAt).toLocaleDateString('hi-IN')}
                        </div>
                      </div>

                      <button 
                        className={`btn ${f.status === 'open' ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => onToggleResolveFeedback(f.id)}
                        style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                      >
                        <Check size={14} />
                        {f.status === 'open' ? 'निस्तारित चिह्नित करें' : 'पुनः खोलें'}
                      </button>
                    </div>

                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-line', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                      {f.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
