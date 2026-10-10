import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Lock, Shield, FileText } from 'lucide-react';

export default function LoginDisclaimerModal({ isOpen, onAgree, onOpenPolicy, user }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);
  const [acceptedTermsCheckbox, setAcceptedTermsCheckbox] = useState(false);

  if (!isOpen) return null;

  const handleAgreeClick = () => {
    if (!acceptedTermsCheckbox) {
      alert('कृपया आगे बढ़ने हेतु पहले "मैंने अस्वीकरण एवं सेवा शर्तों को पढ़ लिया है" चेकबॉक्स को टिक करें।');
      return;
    }
    if (onAgree) onAgree();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(3, 7, 18, 0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100060,
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'linear-gradient(180deg, #0d1b33 0%, #081020 100%)',
        border: '2px solid var(--khaki-primary, #c49756)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(196,151,86,0.25)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(196,151,86,0.3)',
          background: 'rgba(196,151,86,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid #ef4444',
            borderRadius: '50%',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={26} color="#ef4444" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--khaki-light, #dfb97e)', letterSpacing: '0.02em' }}>
              उत्तर प्रदेश पुलिस • आधिकारिक अस्वीकरण (Disclaimer)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              लॉगिन उपरांत अनिवार्य शासकीय स्वीकृति • Official Acknowledgment Required
            </p>
          </div>
        </div>

        {/* User Badge Info */}
        {user && (
          <div style={{
            padding: '0.65rem 1.5rem',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem'
          }}>
            <span style={{ color: '#cbd5e1' }}>
              लॉगिन कार्मिक: <strong>{user.name}</strong> ({user.post || 'अधिकारी'})
            </span>
            <span style={{ color: 'var(--khaki-primary, #c49756)', fontWeight: 600 }}>
              PNO: {user.pno || 'N/A'} • {user.district || 'उत्तर प्रदेश'}
            </span>
          </div>
        )}

        {/* Scrollable Disclaimer Content */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          fontSize: '0.84rem',
          lineHeight: 1.6,
          color: '#e2e8f0'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '0.85rem',
            color: '#fca5a5'
          }}>
            <strong>गोपनीय शासकीय सूचना:</strong> यह आंतरिक पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के अधिकृत, कार्यरत पुलिस अधिकारियों एवं कर्मचारियों के शासकीय समन्वय, आपातकालीन संवाद तथा कानून-व्यवस्था प्रबंधन हेतु है।
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '0.9rem' }}>
              पोर्टल उपयोग हेतु आपकी अनिवार्य बाध्यताएं:
            </h4>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <li>
                <strong>डेटा सुरक्षा एवं निजता:</strong> इस पोर्टल से किसी भी कार्मिक का संपर्क विवरण, तैनाती या वर्दी फोटो बाहरी सोशल मीडिया, अनधिकृत व्यक्तियों या तीसरे पक्ष को साझा करना कठोरता से वर्जित है।
              </li>
              <li>
                <strong>स्क्रीन रिकॉर्डिंग एवं स्क्रीनशॉट प्रतिबंध:</strong> पोर्टल पर स्क्रीन रिकॉर्डिंग, स्क्रीनशॉट लेना अथवा डेटा स्क्रैपिंग पूर्णतः निषिद्ध है। प्रत्येक सत्र की सुरक्षा लॉगिंग सुरक्षित की जा रही है।
              </li>
              <li>
                <strong>इन-ऐप कॉलिंग मर्यादा:</strong> इन-ऐप वॉइस कॉल केवल शासकीय कार्य हेतु मान्य है। अधिकतम प्रति कॉल 05 मिनट की सीमा लागू है।
              </li>
              <li>
                <strong>दंडात्मक प्रावधान:</strong> नियमों के किसी भी उल्लंघन की दशा में सूचना प्रौद्योगिकी अधिनियम 2000 एवं भारतीय पुलिस सेवा नियमावली के अंतर्गत तत्काल विभागीय जांच एवं प्राथमिकी दर्ज की जाएगी।
              </li>
            </ul>
          </div>

          <div style={{
            fontSize: '0.78rem',
            padding: '0.65rem',
            background: 'rgba(196,151,86,0.08)',
            border: '1px solid rgba(196,151,86,0.2)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>विस्तृत नीतियां देखें:</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => onOpenPolicy && onOpenPolicy('terms')}
                style={{ background: 'none', border: 'none', color: 'var(--khaki-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.76rem' }}
              >
                नियम व शर्तें
              </button>
              <span style={{ color: '#64748b' }}>|</span>
              <button
                type="button"
                onClick={() => onOpenPolicy && onOpenPolicy('privacy')}
                style={{ background: 'none', border: 'none', color: 'var(--khaki-primary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.76rem' }}
              >
                गोपनीयता नीति
              </button>
            </div>
          </div>
        </div>

        {/* Mandatory Agreement Checkbox & Confirm Button */}
        <div style={{
          padding: '1.15rem 1.5rem',
          borderTop: '1px solid rgba(196,151,86,0.25)',
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            color: '#f1f5f9'
          }}>
            <input
              type="checkbox"
              checked={acceptedTermsCheckbox}
              onChange={(e) => setAcceptedTermsCheckbox(e.target.checked)}
              style={{
                marginTop: '3px',
                width: '16px',
                height: '16px',
                accentColor: 'var(--khaki-primary, #c49756)',
                cursor: 'pointer'
              }}
            />
            <span>
              मैंने उत्तर प्रदेश पुलिस निर्देशिका के समस्त <strong>अस्वीकरण (Disclaimer)</strong>, शासकीय गोपनीयता नियम एवं सुरक्षा निर्देशों को भली-भांति पढ़ व समझ लिया है तथा मैं इनसे पूर्णतः <strong>सहमत (Agree)</strong> हूँ।
            </span>
          </label>

          <button
            type="button"
            onClick={handleAgreeClick}
            disabled={!acceptedTermsCheckbox}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: acceptedTermsCheckbox ? '1px solid var(--khaki-primary, #c49756)' : '1px solid rgba(255,255,255,0.1)',
              background: acceptedTermsCheckbox 
                ? 'linear-gradient(135deg, #c49756, #8e6833)' 
                : 'rgba(255, 255, 255, 0.08)',
              color: acceptedTermsCheckbox ? '#0a1020' : '#64748b',
              fontWeight: 800,
              fontSize: '0.92rem',
              cursor: acceptedTermsCheckbox ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: acceptedTermsCheckbox ? '0 4px 15px rgba(196,151,86,0.35)' : 'none'
            }}
          >
            <CheckCircle size={18} />
            <span>मैं सहमत हूँ एवं स्वीकार करता हूँ (Agree & Proceed)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
