import React, { useState } from 'react';
import { 
  X, Send, MessageSquare, Phone, Mail, Copy, Check, 
  Shield, AlertTriangle, FileText, CheckCircle2, Clock, 
  ExternalLink, ArrowRight
} from 'lucide-react';

const QUICK_TEMPLATES = [
  {
    id: 'wireless',
    title: '🚨 अति-आवश्यक वायरलेस / लॉ एंड ऑर्डर सूचना',
    desc: 'तत्काल संज्ञान एवं आवश्यक कार्रवाई हेतु वायरलेस फ्लैश संदेश'
  },
  {
    id: 'duty',
    title: '📋 ड्यूटी एवं तैनाती निर्देश',
    desc: 'आगामी वीआईपी ड्यूटी, नाकाबंदी एवं गश्त निर्देश'
  },
  {
    id: 'meeting',
    title: '🏛️ मीटिंग / वीसी (Video Conference) सूचना',
    desc: 'कार्यालयी बैठक एवं वर्चुअल कॉन्फ्रेंस में अनिवार्य उपस्थिति'
  },
  {
    id: 'official_memo',
    title: '📝 शासकीय पत्राचार / आख्या प्रेषण',
    desc: 'लंबित विवेचना व डाक आख्या तत्काल प्रेषित करने बाबत'
  },
  {
    id: 'general',
    title: '💬 सामान्य विभागीय संदेश',
    desc: 'दैनिक शासकीय समन्वय एवं संपर्क'
  }
];

export default function OfficialDispatchModal({
  isOpen,
  onClose,
  targetContact,
  currentUser,
  onOpenInAppChat
}) {
  const [selectedTemplate, setSelectedTemplate] = useState('wireless');
  const [customSubject, setCustomSubject] = useState('अति-आवश्यक शासकीय/वायरलेस सूचना');
  const [messageBody, setMessageBody] = useState('');
  const [urgency, setUrgency] = useState('urgent'); // 'urgent' | 'routine' | 'immediate'
  const [copied, setCopied] = useState(false);

  if (!isOpen || !targetContact) return null;

  const handleTemplateChange = (tmplId) => {
    setSelectedTemplate(tmplId);
    const tmpl = QUICK_TEMPLATES.find(t => t.id === tmplId);
    if (tmpl) {
      setCustomSubject(tmpl.title.replace(/^[^\s]+\s*/, ''));
    }
  };

  // Format Official Police Dispatch Text
  const formatDispatchText = () => {
    const senderTitle = currentUser 
      ? `${currentUser.name} (${currentUser.post || 'पुलिस अधिकारी'}, PNO: ${currentUser.pno || 'N/A'}, जनपद: ${currentUser.district || 'N/A'})`
      : 'उत्तर प्रदेश पुलिस अधिकारी';

    const urgencyTag = urgency === 'immediate' 
      ? '⚡ [तत्काल / TOP PRIORITY]' 
      : urgency === 'urgent' 
        ? '🚨 [अति-आवश्यक / URGENT]' 
        : '📌 [सामान्य / ROUTINE]';

    return (
`🇮🇳 *उत्तर प्रदेश पुलिस - आधिकारिक संदेश (OFFICIAL DISPATCH)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
${urgencyTag}
*विषय:* ${customSubject}

*प्रेषक:* ${senderTitle}
*प्राप्तकर्ता:* ${targetContact.name} (${targetContact.post}, PNO: ${targetContact.pno || 'N/A'})
*कार्यालय/थाना:* ${targetContact.office || 'N/A'}, जनपद: ${targetContact.district || 'N/A'}
*दिनांक व समय:* ${new Date().toLocaleString('hi-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*संदेश विवरण:*
${messageBody.trim() ? messageBody.trim() : 'कृपया तत्काल संपर्क करें एवं आवश्यक शासकीय कार्रवाई सुनिश्चित करें।'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_यह उत्तर प्रदेश पुलिस डायरेक्टरी पोर्टल द्वारा स्वचालित रूप से तैयार किया गया संदेश है।_`
    );
  };

  const dispatchText = formatDispatchText();

  // Clean phone numbers
  const rawPhone = targetContact.phone ? String(targetContact.phone).replace(/\D/g, '') : '';
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  // Actions
  const handleSendWhatsApp = () => {
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(dispatchText)}`;
    window.open(url, '_blank');
  };

  const handleSendSMS = () => {
    // Native SMS URI
    const smsUri = `sms:${rawPhone}?body=${encodeURIComponent(dispatchText)}`;
    window.location.href = smsUri;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(dispatchText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(229,184,66,0.3)', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(229,184,66,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--gold-primary)' }}>
              <Shield size={20} color="var(--gold-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--gold-primary)' }}>
                विभागीय संदेश प्रेषक (Official Police Dispatch)
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                100% विश्वसनीय डिलीवरी — WhatsApp, CUG SMS या लाइव चैट पर भेजें
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Officer Details Banner */}
          <div style={{ 
            background: 'rgba(15,23,42,0.85)', 
            border: '1px solid rgba(59,130,246,0.3)', 
            borderRadius: '8px', 
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '50%', 
                overflow: 'hidden', 
                border: '2px solid var(--gold-primary)',
                background: '#1e293b',
                flexShrink: 0
              }}>
                <img 
                  src={targetContact.uniformPhoto || targetContact.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'} 
                  alt={targetContact.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                  {targetContact.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gold-light)' }}>
                  {targetContact.post} • {targetContact.office} ({targetContact.district})
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  CUG: <strong>{targetContact.phone}</strong> | PNO: {targetContact.pno || 'N/A'}
                </div>
              </div>
            </div>

            <a 
              href={`tel:${rawPhone}`}
              className="btn btn-call" 
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
              title="डायरेक्ट CUG कॉल"
            >
              <Phone size={13} />
              <span>कॉल</span>
            </a>
          </div>

          {/* Urgency Selector */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
              संदेश प्राथमिकता (Priority):
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setUrgency('immediate')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: urgency === 'immediate' ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                  background: urgency === 'immediate' ? 'rgba(239,68,68,0.2)' : 'rgba(15,23,42,0.4)',
                  color: urgency === 'immediate' ? '#fca5a5' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                ⚡ तत्काल (Top Priority)
              </button>

              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: urgency === 'urgent' ? '2px solid #eab308' : '1px solid rgba(255,255,255,0.1)',
                  background: urgency === 'urgent' ? 'rgba(234,179,8,0.2)' : 'rgba(15,23,42,0.4)',
                  color: urgency === 'urgent' ? '#fef08a' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                🚨 अति-आवश्यक (Urgent)
              </button>

              <button
                type="button"
                onClick={() => setUrgency('routine')}
                style={{
                  padding: '6px',
                  borderRadius: '6px',
                  border: urgency === 'routine' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  background: urgency === 'routine' ? 'rgba(59,130,246,0.2)' : 'rgba(15,23,42,0.4)',
                  color: urgency === 'routine' ? '#93c5fd' : 'var(--text-dim)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                📌 सामान्य (Routine)
              </button>
            </div>
          </div>

          {/* Quick Template Picker */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
              त्वरित विषय टेम्पलेट (Quick Template):
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {QUICK_TEMPLATES.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleTemplateChange(tmpl.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: selectedTemplate === tmpl.id ? '1px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.08)',
                    background: selectedTemplate === tmpl.id ? 'rgba(229,184,66,0.12)' : 'rgba(15,23,42,0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: selectedTemplate === tmpl.id ? 'var(--gold-primary)' : '#e2e8f0' }}>
                      {tmpl.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {tmpl.desc}
                    </div>
                  </div>
                  {selectedTemplate === tmpl.id && (
                    <CheckCircle2 size={16} color="var(--gold-primary)" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Message Field */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
              संदेश का विवरण (Message Content):
            </label>
            <textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="यहाँ अपना संदेश या दिशा-निर्देश टाइप करें (उदा: कल प्रातः 10:00 बजे पुलिस लाइन में ब्रीफिंग हेतु उपस्थित होना सुनिश्चित करें)..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(15,23,42,0.7)',
                color: '#fff',
                fontSize: '0.85rem',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Formatted Preview Box */}
          <div style={{ 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: '6px', 
            padding: '0.75rem', 
            border: '1px dashed rgba(255,255,255,0.15)',
            maxHeight: '120px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                आउटगोइंग संदेश पूर्वावलोकन (Preview):
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copied ? 'var(--success-emerald)' : 'var(--gold-primary)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'कॉपी हो गया' : 'टेक्स्ट कॉपी करें'}
              </button>
            </div>
            <pre style={{ 
              margin: 0, 
              fontSize: '0.72rem', 
              color: '#cbd5e1', 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'inherit',
              lineHeight: 1.4
            }}>
              {dispatchText}
            </pre>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          padding: '0.85rem 1rem',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: '8px'
        }}>
          {/* WhatsApp Button */}
          <button
            onClick={handleSendWhatsApp}
            className="btn btn-wa"
            style={{ 
              padding: '0.65rem 0.5rem', 
              fontSize: '0.82rem', 
              justifyContent: 'center',
              fontWeight: 600
            }}
            title="प्राप्तकर्ता के WhatsApp पर सीधा भेजें"
          >
            <MessageSquare size={16} />
            <span>वॉट्सऐप पर भेजें</span>
          </button>

          {/* SMS Button */}
          <button
            onClick={handleSendSMS}
            className="btn btn-call"
            style={{ 
              padding: '0.65rem 0.5rem', 
              fontSize: '0.82rem', 
              justifyContent: 'center',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 600
            }}
            title="प्राप्तकर्ता के फोन पर सीधा SMS भेजें"
          >
            <Mail size={16} />
            <span>SMS पर भेजें</span>
          </button>

          {/* Live In-App Chat Modal button */}
          <button
            onClick={() => {
              onClose();
              if (onOpenInAppChat) onOpenInAppChat(targetContact);
            }}
            className="btn btn-secondary"
            style={{ 
              padding: '0.65rem 0.5rem', 
              fontSize: '0.82rem', 
              justifyContent: 'center'
            }}
            title="वेबसाइट के अंदर लाइव चैट बॉक्स में खोलें"
          >
            <Send size={15} />
            <span>लाइव चैट बॉक्स</span>
          </button>
        </div>

      </div>
    </div>
  );
}
