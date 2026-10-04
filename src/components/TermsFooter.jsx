import React from 'react';
import { ShieldAlert, Lock, ExternalLink } from 'lucide-react';

export default function TermsFooter({ terms, onOpenAdminTermsEdit = null, canEdit = false, onOpenPolicy = null }) {
  if (!terms) return null;

  return (
    <footer className="terms-footer-container" style={{
      marginTop: '1.25rem',
      background: 'linear-gradient(180deg, rgba(14, 26, 48, 0.96), rgba(8, 14, 26, 0.98))',
      border: '1px solid var(--khaki-border, rgba(196, 151, 86, 0.35))',
      borderTop: '3px solid var(--khaki-primary, #c49756)',
      borderRadius: 'var(--radius-lg, 12px)',
      padding: '0.85rem 1.15rem',
      color: 'var(--text-secondary, #94a3b8)',
      fontSize: '0.82rem',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Top Banner with UP Police Flag accent line */}
      <div style={{
        height: '3px',
        width: '100%',
        background: 'linear-gradient(90deg, #991b1b 0%, #991b1b 50%, #1e3a8a 50%, #1e3a8a 100%)',
        borderRadius: '2px',
        marginBottom: '0.75rem'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            background: 'rgba(196, 151, 86, 0.15)',
            border: '1px solid var(--khaki-primary, #c49756)',
            borderRadius: '6px',
            padding: '4px 6px',
            display: 'flex',
            alignItems: 'center',
            color: 'var(--khaki-primary, #c49756)'
          }}>
            <Lock size={14} />
          </div>
          <div>
            <h4 style={{
              margin: 0,
              fontSize: '0.9rem',
              fontWeight: 800,
              color: 'var(--khaki-light, #dfb97e)',
              letterSpacing: '0.02em'
            }}>
              {terms.title || "उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें"}
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #64748b)' }}>
              {terms.subtitle || "Official Confidentiality Policy • केवल अधिकृत पुलिस कार्मिकों हेतु"}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {canEdit && onOpenAdminTermsEdit && (
            <button
              type="button"
              onClick={onOpenAdminTermsEdit}
              style={{
                background: 'rgba(196, 151, 86, 0.2)',
                border: '1px solid var(--khaki-primary, #c49756)',
                color: 'var(--khaki-light, #dfb97e)',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ✏️ शर्तें संशोधित करें
            </button>
          )}

          <span style={{
            fontSize: '0.7rem',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '2px 8px',
            borderRadius: '4px',
            color: 'var(--text-dim, #64748b)'
          }}>
            अंतिम संपादन: {terms.lastUpdated || '2026-10-04'}
          </span>
        </div>
      </div>

      {/* Rules Bullet List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '0.4rem',
        background: 'rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '0.65rem 0.85rem',
        lineHeight: 1.45
      }}>
        {terms.rules && terms.rules.map((rule, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
            <span style={{
              color: 'var(--khaki-primary, #c49756)',
              fontWeight: 700,
              fontSize: '0.78rem',
              lineHeight: '1.4',
              flexShrink: 0
            }}>
              {idx + 1}.
            </span>
            <span style={{ color: 'var(--text-secondary, #cbd5e1)', fontSize: '0.78rem' }}>
              {rule}
            </span>
          </div>
        ))}
      </div>

      {/* 5 Mandatory Policy Hyperlinks */}
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.55rem',
        borderTop: '1px solid rgba(196, 151, 86, 0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '0.6rem',
        fontSize: '0.76rem'
      }}>
        <button
          type="button"
          onClick={() => onOpenPolicy && onOpenPolicy('disclaimer')}
          style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
        >
          Disclaimer
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <button
          type="button"
          onClick={() => onOpenPolicy && onOpenPolicy('terms')}
          style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
        >
          Terms and Condition
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <button
          type="button"
          onClick={() => onOpenPolicy && onOpenPolicy('copyright')}
          style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
        >
          Copyright Policy
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <button
          type="button"
          onClick={() => onOpenPolicy && onOpenPolicy('privacy')}
          style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
        >
          Privacy Policy
        </button>
        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
        <button
          type="button"
          onClick={() => onOpenPolicy && onOpenPolicy('hyperlinking')}
          style={{ background: 'none', border: 'none', color: 'var(--khaki-light)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600, fontSize: 'inherit' }}
        >
          Hyperlinking Policy
        </button>
      </div>

      {/* Bottom official footer copyright & emblem */}
      <div style={{
        marginTop: '0.6rem',
        paddingTop: '0.5rem',
        borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.72rem',
        color: 'var(--text-dim, #64748b)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={13} color="var(--khaki-primary, #c49756)" />
          <span>उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ • सर्वाधिकार सुरक्षित</span>
        </div>
        <div>
          <span>गोपनीय विभागीय निर्देशिका • आईटी एक्ट 2000 एवं पुलिस नियमावली द्वारा संरक्षित</span>
        </div>
      </div>
    </footer>
  );
}
