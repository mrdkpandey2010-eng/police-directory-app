import React from 'react';
import { X, ShieldAlert, FileText, Lock, Globe, Copyright } from 'lucide-react';

export default function PolicyModal({ isOpen, onClose, activePolicy = 'disclaimer' }) {
  if (!isOpen) return null;

  const policies = {
    disclaimer: {
      title: "अस्वीकरण (Disclaimer)",
      icon: <ShieldAlert size={20} color="var(--khaki-primary)" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <p>
            यह पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के सेवारत अधिकृत पुलिस कार्मिकों के शासकीय समन्वय एवं आपातकालीन कार्यों हेतु विकसित की गई है।
          </p>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#fcd34d' }}>
            <strong>महत्वपूर्ण सूचना:</strong> इस पोर्टल पर प्रदर्शित समस्त कार्मिक विवरण, पदस्थापना एवं संपर्क नंबर आधिकारिक शासकीय रिकॉर्ड पर आधारित हैं। इसे किसी भी अनधिकृत तीसरे पक्ष अथवा सार्वजनिक माध्यम पर साझा करना भारतीय टेलीग्राफ अधिनियम एवं आईटी एक्ट के अंतर्गत दंडात्मक अपराध है।
          </div>
          <p>
            उत्तर प्रदेश पुलिस विभाग किसी भी ऐसे व्यक्ति के विरुद्ध कड़ी वैधानिक एवं अनुशासनात्मक कार्यवाही करने का अधिकार सुरक्षित रखता है जो इस पोर्टल के डेटा का अनधिकृत संग्रह, स्क्रीन रिकॉर्डिंग, स्क्रीनशॉट या व्यावसायिक उपयोग करता है।
          </p>
        </div>
      )
    },
    terms: {
      title: "नियम एवं शर्तें (Terms and Conditions)",
      icon: <FileText size={20} color="var(--khaki-primary)" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <p>
            उत्तर प्रदेश पुलिस संपर्क पोर्टल के उपयोग हेतु निम्नलिखित शर्तों की पाबंदी अनिवार्य है:
          </p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>अधिकृत पहुँच:</strong> केवल वैध PNO एवं पुलिस पहचान पत्र धारक पुलिस कार्मिक ही पोर्टल में प्रवेश के पात्र हैं।</li>
            <li><strong>वर्दी फोटो अनिवार्यता:</strong> प्रत्येक कार्मिक द्वारा अपनी आधिकारिक वर्दी वाली स्पष्ट फोटो अपलोड एवं सत्यापित कराना अनिवार्य है।</li>
            <li><strong>कॉलिंग एवं संचार मर्यादा:</strong> इन-ऐप कॉलिंग एवं मैसेज बॉक्स का उपयोग पूर्णतः शासकीय, आधिकारिक एवं गरिमामय संवाद हेतु ही किया जाएगा।</li>
            <li><strong>अधिकतम कॉल सीमा:</strong> नेटवर्क एवं सर्वर सुरक्षा के दृष्टिगत प्रति कॉल अधिकतम 05 मिनट की सीमा निर्धारित है।</li>
            <li><strong>गोपनीयता भंग पर कार्रवाई:</strong> किसी भी सहकर्मी का फोन नंबर बिना अनुमति सार्वजनिक करने पर विभागीय जांच एवं सेवा समाप्ति की अनुशंसा की जा सकेगी।</li>
          </ol>
        </div>
      )
    },
    copyright: {
      title: "कॉपीराइट नीति (Copyright Policy)",
      icon: <Copyright size={20} color="var(--khaki-primary)" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <p>
            इस पोर्टल पर उपलब्ध समस्त सामग्री, डिज़ाइन, लोगो, डेटाबेस संरचना, एवं सॉफ्टवेयर कोड <strong>उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ</strong> के अनन्य स्वामित्व एवं कॉपीराइट के अधीन हैं।
          </p>
          <p>
            सक्षम प्राधिकारी की पूर्व लिखित अनुमति के बिना इस पोर्टल की किसी भी सामग्री, डेटाबेस सूची, या कार्मिक जानकारी का किसी भी रूप में पुनरुत्पादन, डाउनलोड, प्रतिलिपि, या अन्यत्र प्रकाशन पूर्णतः प्रतिबंधित है।
          </p>
          <div style={{ background: 'rgba(30, 58, 138, 0.25)', border: '1px solid rgba(196, 151, 86, 0.3)', padding: '0.75rem', borderRadius: '8px' }}>
            © {new Date().getFullYear()} उत्तर प्रदेश पुलिस (Uttar Pradesh Police). सर्वाधिकार सुरक्षित।
          </div>
        </div>
      )
    },
    privacy: {
      title: "गोपनीयता नीति (Privacy Policy)",
      icon: <Lock size={20} color="var(--khaki-primary)" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <p>
            यह पोर्टल उपयोगकर्ता पुलिस कार्मिकों की निजता एवं शासकीय डेटा सुरक्षा के उच्चतम मानकों का पालन करता है।
          </p>
          <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li><strong>नंबर सुरक्षा:</strong> यदि कोई कार्मिक अपना मोबाइल नंबर अन्य सहकर्मियों से छिपाना चाहता है, तो उसे 'नंबर गोपनीयता' सक्षम करने का पूर्ण अधिकार है।</li>
            <li><strong>सहमति आधारित पहुँच:</strong> गोपनीय नंबर देखने के लिए अन्य कार्मिकों को विधिवत अनुमति अनुरोध (Permission Request) भेजना अनिवार्य होगा।</li>
            <li><strong>कॉल एवं चैट लॉग्स:</strong> आंतरिक सुरक्षा एवं ऑडिट हेतु इन-ऐप कॉल का समय, अवधि एवं सहभागी लॉग्स एडमिन कंसोल में सुरक्षित रखे जाते हैं। कॉल ऑडियो का कोई अनधिकृत तीसरे पक्ष पर भंडारण नहीं होता।</li>
            <li><strong>सुरक्षा उपाय:</strong> पोर्टल पर स्क्रीनशॉट अवरोधन (Anti-Screenshot) तकनीक सक्रिय है।</li>
          </ul>
        </div>
      )
    },
    hyperlinking: {
      title: "हाइपरलिंकिंग नीति (Hyperlinking Policy)",
      icon: <Globe size={20} color="var(--khaki-primary)" />,
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.84rem', lineHeight: 1.6 }}>
          <p>
            <strong>बाह्य वेबसाइटों के लिंक:</strong> इस पोर्टल से केवल उत्तर प्रदेश शासन अथवा भारत सरकार की आधिकारिक वेबसाइटों (उदा. uppolice.gov.in, up.gov.in) के अधिकृत लिंक ही संदर्भित किए जा सकते हैं।
          </p>
          <p>
            <strong>इस पोर्टल हेतु लिंकिंग अनुमति:</strong> किसी भी बाह्य पोर्टल अथवा ऐप द्वारा इस आंतरिक पोर्टल के किसी भी पृष्ठ को फ्रेम या हाइपरलिंक करने की अनुमति पूर्व लिखित शासकीय आदेश के बिना पूर्णतः अमान्य है।
          </p>
          <p>
            हम यह गारंटी नहीं देते कि बाह्य लिंक हर समय सक्रिय रहेंगे तथा लिंक किए गए बाहरी पृष्ठों की सामग्री पर हमारा कोई नियंत्रण नहीं है।
          </p>
        </div>
      )
    }
  };

  const current = policies[activePolicy] || policies.disclaimer;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '640px', padding: '1.25rem 1.5rem' }}
      >
        <div className="modal-header">
          <div className="modal-title">
            {current.icon}
            <span>{current.title}</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Policy Tab Switcher inside Modal */}
        <div style={{
          display: 'flex',
          gap: '0.35rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {Object.keys(policies).map((key) => (
            <button
              key={key}
              type="button"
              className={`admin-tab ${activePolicy === key ? 'active' : ''}`}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
              onClick={() => {
                // Parent can pass state or internal switch
                const event = new CustomEvent('policy_tab_change', { detail: key });
                window.dispatchEvent(event);
              }}
            >
              {policies[key].title.split(' ')[0]}
            </button>
          ))}
        </div>

        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {current.content}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
          <button type="button" className="btn btn-primary" onClick={onClose} style={{ padding: '0.45rem 1.25rem' }}>
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
}
