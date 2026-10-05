import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, FileText, Lock, Globe, Copyright, FileCode, CheckCircle, ExternalLink } from 'lucide-react';
import { DEFAULT_POLICIES } from '../utils/storage';

export default function PolicyModal({ 
  isOpen, 
  onClose, 
  activePolicy = 'disclaimer',
  policies = DEFAULT_POLICIES,
  onOpenAdminPolicyEdit = null,
  canEdit = false
}) {
  const [currentPolicyId, setCurrentPolicyId] = useState(activePolicy);

  useEffect(() => {
    if (activePolicy) {
      setCurrentPolicyId(activePolicy);
    }
  }, [activePolicy, isOpen]);

  if (!isOpen) return null;

  const policyList = (policies && policies.length > 0) ? policies : DEFAULT_POLICIES;
  const current = policyList.find(p => p.id === currentPolicyId) || policyList[0] || DEFAULT_POLICIES[0];

  const getPolicyIcon = (id) => {
    switch (id) {
      case 'disclaimer':
        return <ShieldAlert size={20} color="var(--khaki-primary)" />;
      case 'terms':
        return <FileText size={20} color="var(--khaki-primary)" />;
      case 'copyright':
        return <Copyright size={20} color="var(--khaki-primary)" />;
      case 'privacy':
        return <Lock size={20} color="var(--khaki-primary)" />;
      case 'hyperlinking':
        return <Globe size={20} color="var(--khaki-primary)" />;
      case 'confidentiality':
        return <Lock size={20} color="var(--khaki-primary)" />;
      default:
        return <FileCode size={20} color="var(--khaki-primary)" />;
    }
  };

  // Helper to format content paragraphs and lists
  const renderFormattedContent = (content) => {
    if (!content) return <p>सामग्री उपलब्ध नहीं है।</p>;

    const paragraphs = content.split('\n\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.86rem', lineHeight: 1.65, color: '#e2e8f0' }}>
        {paragraphs.map((p, idx) => {
          const lines = p.split('\n');
          // Check if lines are numbered or bullet list
          const isList = lines.length > 1 && lines.some(l => /^\s*(\d+\.|\*|-)\s+/.test(l));

          if (isList) {
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingLeft: '0.5rem' }}>
                {lines.map((line, lIdx) => (
                  <div key={lIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--khaki-primary, #c49756)', fontWeight: 700, flexShrink: 0 }}>•</span>
                    <span>{line.replace(/^\s*(\d+\.|\*|-)\s+/, '')}</span>
                  </div>
                ))}
              </div>
            );
          }

          // Check for alert notice
          if (p.includes('महत्वपूर्ण सूचना:') || p.includes('Important:')) {
            return (
              <div key={idx} style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '0.75rem 0.95rem',
                borderRadius: '8px',
                color: '#fef08a'
              }}>
                {p}
              </div>
            );
          }

          return <p key={idx} style={{ margin: 0 }}>{p}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', padding: '1.25rem 1.5rem' }}
      >
        <div className="modal-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getPolicyIcon(current.id)}
            <span style={{ color: 'var(--text-bright, #fff)', fontWeight: 800 }}>
              {current.title} {current.hindiTitle && current.hindiTitle !== current.title ? `(${current.hindiTitle})` : ''}
            </span>
          </div>
          <button className="close-btn" onClick={onClose} title="बंद करें"><X size={18} /></button>
        </div>

        {/* Policy Tab Switcher inside Modal */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '1rem',
          flexShrink: 0
        }}>
          {policyList.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`admin-tab ${currentPolicyId === p.id ? 'active' : ''}`}
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                whiteSpace: 'nowrap',
                fontWeight: currentPolicyId === p.id ? 700 : 500
              }}
              onClick={() => setCurrentPolicyId(p.id)}
            >
              {p.title}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.35rem' }}>
          {renderFormattedContent(current.content)}
        </div>

        {/* Modal Footer with metadata and actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '0.85rem',
          marginTop: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim, #64748b)' }}>
            अंतिम संपादन: {current.lastUpdated || '2026-10-05'} • उत्तर प्रदेश पुलिस मुख्यालय
          </span>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {canEdit && onOpenAdminPolicyEdit && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem' }}
                onClick={() => {
                  onClose();
                  onOpenAdminPolicyEdit(current.id);
                }}
              >
                ✏️ इस नीति को संशोधित करें
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={onClose} 
              style={{ padding: '0.35rem 1.25rem', fontSize: '0.82rem' }}
            >
              बंद करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
