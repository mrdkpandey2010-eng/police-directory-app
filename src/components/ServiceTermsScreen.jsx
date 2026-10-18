import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, CheckSquare, Square, FileText, ArrowRight, Lock, Award, Building, User } from 'lucide-react';
import { recordTermsAcceptanceAuth } from '../utils/cloudflareR2';

export default function ServiceTermsScreen({ user, terms, onAccepted, onOpenPolicy }) {
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentVersion = terms?.version || 2;

  const handleAccept = async () => {
    if (!acceptedCheckbox || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (user?.id) {
        await recordTermsAcceptanceAuth(user.id, currentVersion);
      }
      if (onAccepted) {
        onAccepted(currentVersion);
      }
    } catch (e) {
      console.warn('Error recording terms acceptance:', e);
      if (onAccepted) onAccepted(currentVersion);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultRules = [
    "यह पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के सेवारत अधिकृत पुलिस कार्मिकों के शासकीय एवं आपातकालीन समन्वय हेतु है।",
    "पोर्टल में उपलब्ध किसी भी अधिकारी अथवा कर्मचारी का व्यक्तिगत फोन नंबर, पता, या विवरण किसी अनधिकृत व्यक्ति अथवा सार्वजनिक सोशल मीडिया पर साझा करना पूर्णतः वर्जित है।",
    "सभी कार्मिकों के लिए पोर्टल में अपनी नवीनतम आधिकारिक वर्दी (Uniform) वाली स्पष्ट फोटो अपलोड एवं सत्यापित कराना अनिवार्य है। बिना वर्दी फोटो के ऐप का उपयोग प्रतिबंधित रहेगा।",
    "लॉगिन क्रेडेंशियल्स (PNO, मोबाइल नंबर, पासवर्ड) पूर्णतः व्यक्तिगत एवं गोपनीय हैं। अपने क्रेडेंशियल्स किसी अन्य के साथ साझा न करें।",
    "नियमों के उल्लंघन अथवा डेटा के दुरुपयोग की स्थिति में भारतीय सूचना प्रौद्योगिकी अधिनियम (IT Act 2000) एवं पुलिस आचरण नियमावली के अंतर्गत कठोर दंडात्मक व विभागीय कार्यवाही की जाएगी।"
  ];

  const rulesList = (terms && Array.isArray(terms.rules) && terms.rules.length > 0) ? terms.rules : defaultRules;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, #060b19 0%, #0a1329 100%)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        maxWidth: '620px',
        width: '100%',
        background: 'var(--bg-surface, #111827)',
        border: '2px solid var(--khaki-primary, #c49756)',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(196,151,86,0.25)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(90deg, rgba(196,151,86,0.18) 0%, rgba(13,27,51,0.6) 100%)',
          borderBottom: '1px solid rgba(196,151,86,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1.5px solid #ef4444',
            borderRadius: '50%',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldAlert size={28} color="#ef4444" />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.18rem',
              fontWeight: 800,
              color: 'var(--khaki-light, #dfb97e)',
              letterSpacing: '0.02em'
            }}>
              उत्तर प्रदेश पुलिस • सेवा शर्तें एवं गोपनीयता नीति
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              लॉगिन उपरांत अनिवार्य शासकीय स्वीकृति • Terms of Service Acceptance (v{currentVersion})
            </p>
          </div>
        </div>

        {/* Authenticated Officer Badge */}
        {user && (
          <div style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(0,0,0,0.35)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ color: '#e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="var(--khaki-primary, #c49756)" />
              सत्यापित कार्मिक: <strong>{user.name}</strong> ({user.post || 'अधिकारी'})
            </span>
            <span style={{
              color: 'var(--khaki-primary, #c49756)',
              fontWeight: 700,
              background: 'rgba(196,151,86,0.15)',
              padding: '3px 10px',
              borderRadius: '12px',
              border: '1px solid rgba(196,151,86,0.3)'
            }}>
              PNO: {user.pno || 'N/A'} • {user.district || 'उत्तर प्रदेश'}
            </span>
          </div>
        )}

        {/* Scrollable Terms Content */}
        <div style={{
          padding: '1.25rem 1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          fontSize: '0.86rem',
          lineHeight: '1.55',
          color: '#cbd5e1'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            borderLeft: '4px solid #ef4444',
            padding: '0.75rem 1rem',
            borderRadius: '0 8px 8px 0',
            fontSize: '0.82rem',
            color: '#fca5a5'
          }}>
            <strong>महत्वपूर्ण शासकीय सूचना:</strong> इस पोर्टल पर उपलब्ध समस्त डेटाबेस गोपनीय है। आगे बढ़ने हेतु सेवा शर्तों को स्वीकार करना अनिवार्य है।
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rulesList.map((rule, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}
              >
                <div style={{
                  background: 'rgba(196,151,86,0.2)',
                  color: 'var(--khaki-primary, #c49756)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  minWidth: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, color: '#e2e8f0' }}>
                  {rule}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: '0.76rem',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '0.5rem 0'
          }}>
            अंतिम अद्यतन संस्करण (Version): {currentVersion} • उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ
          </div>
        </div>

        {/* Mandatory Checkbox & Action Button */}
        <div style={{
          padding: '1.25rem 1.5rem',
          background: 'rgba(13, 27, 51, 0.95)',
          borderTop: '1px solid rgba(196,151,86,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none',
            background: acceptedCheckbox ? 'rgba(196,151,86,0.12)' : 'rgba(255,255,255,0.03)',
            border: acceptedCheckbox ? '1px solid var(--khaki-primary, #c49756)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="checkbox"
              checked={acceptedCheckbox}
              onChange={(e) => setAcceptedCheckbox(e.target.checked)}
              style={{
                marginTop: '3px',
                width: '18px',
                height: '18px',
                accentColor: 'var(--khaki-primary, #c49756)',
                cursor: 'pointer'
              }}
            />
            <div style={{ fontSize: '0.84rem', color: '#f8fafc', lineHeight: '1.4' }}>
              <strong>मैंने उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तों को पढ़ लिया है</strong> और मैं इन सभी सेवा शर्तों व गोपनीय नियमों का पालन करने हेतु पूर्णतः सहमत हूँ।
              <span style={{ display: 'block', color: 'var(--khaki-primary, #c49756)', fontSize: '0.76rem', marginTop: '3px' }}>
                * ऐप में प्रवेश हेतु स्वीकृति अनिवार्य है
              </span>
            </div>
          </label>

          <button
            type="button"
            disabled={!acceptedCheckbox || isSubmitting}
            onClick={handleAccept}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.98rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '10px',
              opacity: acceptedCheckbox ? 1 : 0.45,
              cursor: acceptedCheckbox ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
          >
            {isSubmitting ? (
              <span>सत्यापन सुरक्षित किया जा रहा है...</span>
            ) : (
              <>
                <ShieldCheck size={20} />
                <span>सेवा शर्तें स्वीकार करें एवं आगे बढ़ें (Continue)</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
