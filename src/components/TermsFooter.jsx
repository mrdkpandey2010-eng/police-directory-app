import React from 'react';
import { Shield, Settings } from 'lucide-react';
import { DEFAULT_POLICIES } from '../utils/storage';

export default function TermsFooter({ 
  policies = DEFAULT_POLICIES, 
  onOpenPolicy = null,
  canEdit = false, 
  onOpenAdminTermsEdit = null
}) {
  const policyList = (policies && policies.length > 0) ? policies : DEFAULT_POLICIES;

  return (
    <footer style={{
      marginTop: '2rem',
      padding: '1.25rem 1rem 1.5rem',
      borderTop: '1px solid rgba(196, 151, 86, 0.25)',
      background: 'rgba(7, 14, 28, 0.85)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px 12px 0 0',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.65rem'
    }}>
      {/* Dynamic Policy & Custom Links Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0.6rem 0.85rem',
        fontSize: '0.8rem',
        color: 'var(--khaki-light, #dfb97e)',
        lineHeight: 1.5
      }}>
        {policyList.map((policy, idx) => (
          <React.Fragment key={policy.id || idx}>
            <button
              type="button"
              onClick={() => onOpenPolicy && onOpenPolicy(policy.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--khaki-light, #dfb97e)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.8rem',
                padding: '2px 4px',
                transition: 'color 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={`${policy.title} विस्तार से पढ़ने हेतु क्लिक करें`}
            >
              {policy.title}
            </button>
            {idx < policyList.length - 1 && (
              <span style={{ color: 'rgba(255, 255, 255, 0.25)', userSelect: 'none' }}>|</span>
            )}
          </React.Fragment>
        ))}

        {/* Admin Direct Management Action */}
        {canEdit && onOpenAdminTermsEdit && (
          <>
            <span style={{ color: 'rgba(255, 255, 255, 0.25)', userSelect: 'none' }}>|</span>
            <button
              type="button"
              onClick={onOpenAdminTermsEdit}
              style={{
                background: 'rgba(196, 151, 86, 0.15)',
                border: '1px solid rgba(196, 151, 86, 0.4)',
                borderRadius: '4px',
                color: '#fef08a',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.74rem',
                padding: '2px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="एडमिन: नीतियां व कस्टम लिंक्स संशोधित करें"
            >
              <Settings size={12} />
              <span>नीतियां व लिंक्स प्रबंधित करें</span>
            </button>
          </>
        )}
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
