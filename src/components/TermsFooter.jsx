import React from 'react';
import { Shield } from 'lucide-react';

export default function TermsFooter() {
  return (
    <footer style={{
      marginTop: '2rem',
      padding: '1rem 1rem 1.25rem',
      borderTop: '1px solid rgba(196, 151, 86, 0.2)',
      background: 'rgba(7, 14, 28, 0.75)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px 12px 0 0',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.4rem'
    }}>
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
