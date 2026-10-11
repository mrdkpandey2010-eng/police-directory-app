import React from 'react';
import { Shield, FileText } from 'lucide-react';

export default function TermsFooter({ onOpenPolicy }) {
  return (
    <footer style={{
      marginTop: '2rem',
      padding: '1.25rem 1rem 1.5rem',
      borderTop: '1px solid rgba(196, 151, 86, 0.2)',
      background: 'rgba(7, 14, 28, 0.75)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px 12px 0 0',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.65rem'
    }}>
      {/* Hyperlink to View Rules & Policies (नियम व नीतियां देखने के लिए) */}
      <div>
        <button
          type="button"
          onClick={onOpenPolicy}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--khaki-primary, #c49756)',
            fontSize: '0.78rem',
            fontWeight: 700,
            textDecoration: 'underline',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#fef08a'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--khaki-primary, #c49756)'}
          title="शासकीय नियम, गोपनीयता नीति एवं सेवा शर्तें देखें"
        >
          <FileText size={14} color="var(--khaki-primary, #c49756)" />
          <span>नियम व नीतियां देखने के लिए यहाँ क्लिक करें</span>
        </button>
      </div>

      {/* Official Government Emblem & Copyright Line */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '0.73rem',
        color: 'var(--text-dim, #64748b)',
        flexWrap: 'wrap'
      }}>
        <Shield size={13} color="var(--khaki-primary, #c49756)" />
        <span>© {new Date().getFullYear()} उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ • सर्वाधिकार सुरक्षित</span>
        <span style={{ opacity: 0.5 }}>•</span>
        <span>गोपनीय विभागीय निर्देशिका • आईटी एक्ट 2000 एवं शासकीय गोपनीयता नियमावली द्वारा संरक्षित</span>
      </div>
    </footer>
  );
}
