import React, { useState } from 'react';
import { Phone, MessageSquare, MapPin, Building2, Copy, Check, Mail, Edit3, Lock, Unlock, Trash2, Power, ShieldCheck } from 'lucide-react';

export default function ContactCard({ 
  contact, 
  currentUser,
  onEdit, 
  onToggleBlock, 
  onToggleActive,
  onPromoteCoAdmin,
  onDelete,
  onOpenChatWithContact,
  onOpenDispatch
}) {
  const [copied, setCopied] = useState(false);

  // Scoped authorization: Admin can manage all; Co-Admin can only manage their posted district
  const canManage = 
    currentUser?.role === 'admin' || 
    (currentUser?.role === 'co_admin' && contact.district === currentUser.district);

  const isAdmin = currentUser?.role === 'admin';
  const isActive = contact.status === 'approved' || contact.status === 'active';

  // Clean phone number for tel: and whatsapp links
  const rawPhone = (contact.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`;
  const waPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitial = (name) => {
    if (!name) return 'POL';
    const cleanName = name.replace(/\(.*\)/, '').trim();
    return cleanName.charAt(0).toUpperCase();
  };

  return (
    <div className="officer-card">
      <div className="card-top">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="avatar-badge" style={{
            overflow: 'hidden',
            padding: 0,
            border: contact.uniformPhoto ? '2px solid var(--gold-primary)' : '2px solid rgba(255,255,255,0.2)'
          }}>
            {contact.uniformPhoto ? (
              <img 
                src={contact.uniformPhoto} 
                alt={contact.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              getInitial(contact.name)
            )}
          </div>
          {contact.uniformPhoto && (
            <span 
              title="वर्दी फोटो सत्यापित (Uniform Verified)"
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                background: '#10b981',
                borderRadius: '50%',
                padding: '2px',
                display: 'flex',
                border: '2px solid #0f172a'
              }}
            >
              <ShieldCheck size={11} color="#fff" />
            </span>
          )}
        </div>
        <div className="officer-details">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            <h3 className="officer-name" title={contact.name}>
              {contact.name}
            </h3>
            {contact.isCoAdmin && (
              <span style={{ fontSize: '0.7rem', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                Co-Admin
              </span>
            )}
          </div>
          <div className="officer-pno">{contact.pno}</div>
          <span className="officer-post">{contact.post}</span>
        </div>
      </div>

      <div className="info-rows">
        <div className="info-item">
          <MapPin size={15} />
          <span>ज़िला: <strong>{contact.district}</strong></span>
        </div>
        <div className="info-item">
          <Building2 size={15} />
          <span>कार्यालय/थाना: <strong>{contact.office}</strong></span>
        </div>
        <div className="info-item" style={{ marginTop: '2px' }}>
          <Phone size={15} />
          <span className="phone-number-display">{contact.phone}</span>
          <button 
            onClick={handleCopy}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: copied ? 'var(--success-emerald)' : 'var(--text-dim)', 
              cursor: 'pointer',
              marginLeft: 'auto',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
            title="नंबर कॉपी करें"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
        </div>
        {contact.email && (
          <div className="info-item">
            <Mail size={15} />
            <span style={{ fontSize: '0.78rem', opacity: 0.9 }}>{contact.email}</span>
          </div>
        )}
      </div>

      {/* Action Buttons: Call, WhatsApp, and Police Internal Chat */}
      <div className="card-actions" style={{ gridTemplateColumns: '1fr 1fr 1.15fr', gap: '0.4rem' }}>
        <a 
          href={`tel:${cleanPhone}`} 
          className="btn btn-call" 
          title={`${contact.name} को डायरेक्ट कॉल करें`}
          style={{ padding: '0.5rem 0.4rem', fontSize: '0.8rem' }}
        >
          <Phone size={14} />
          <span>कॉल</span>
        </a>

        <a 
          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`जय हिंद, ${contact.name} जी!`)}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="btn btn-wa" 
          title={`${contact.name} को वॉट्सऐप मैसेज भेजें`}
          style={{ padding: '0.5rem 0.4rem', fontSize: '0.8rem' }}
        >
          <MessageSquare size={14} />
          <span>वॉट्सऐप</span>
        </a>

        <button 
          onClick={() => onOpenDispatch ? onOpenDispatch(contact) : (onOpenChatWithContact && onOpenChatWithContact(contact))}
          className="btn btn-primary"
          title={`${contact.name} को आधिकारिक संदेश भेजें (WhatsApp / SMS / Live Chat)`}
          style={{ padding: '0.5rem 0.4rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)' }}
        >
          <Mail size={14} />
          <span>मैसेज भेजें</span>
        </button>
      </div>

      {/* Admin / Co-Admin Operations Bar */}
      {canManage && (
        <div style={{ 
          marginTop: '0.75rem', 
          paddingTop: '0.65rem', 
          borderTop: '1px solid rgba(229,184,66,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--gold-primary)', fontWeight: 600 }}>
              {isAdmin ? 'ADMIN CONTROLS:' : `CO-ADMIN (${currentUser.district}):`}
            </span>

            {/* Active / Inactive Toggle */}
            <button
              className={`btn ${isActive ? 'btn-danger' : 'btn-success'}`}
              style={{ padding: '2px 6px', fontSize: '0.7rem' }}
              onClick={() => onToggleActive(contact.id)}
              title={isActive ? "यूजर को निष्क्रिय (Inactive) करें" : "यूजर को सक्रिय (Active) करें"}
            >
              <Power size={11} />
              {isActive ? "निष्क्रिय" : "सक्रिय"}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => onEdit(contact)} 
              style={{ padding: '4px 6px', fontSize: '0.75rem' }}
              title="प्रोफ़ाइल संपादित करें"
            >
              <Edit3 size={12} />
              संपादित
            </button>

            {isAdmin && (
              <button
                className={`btn ${contact.isCoAdmin ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '4px 6px', fontSize: '0.75rem', borderColor: 'var(--gold-primary)' }}
                onClick={() => onPromoteCoAdmin(contact.id, contact.district)}
                title={contact.isCoAdmin ? "Co-Admin पद हटाएं" : `${contact.district} का Co-Admin बनाएं`}
              >
                <ShieldCheck size={12} />
                {contact.isCoAdmin ? "हटाएं" : "Co-Admin"}
              </button>
            )}

            <button 
              className={`btn ${contact.status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
              onClick={() => onToggleBlock(contact.id)}
              style={{ padding: '4px 6px', fontSize: '0.75rem' }}
              title={contact.status === 'blocked' ? 'लॉगिन अनब्लॉक करें' : 'लॉगिन ब्लॉक करें'}
            >
              {contact.status === 'blocked' ? <Unlock size={12} /> : <Lock size={12} />}
              {contact.status === 'blocked' ? 'अनब्लॉक' : 'ब्लॉक'}
            </button>

            <button 
              className="btn btn-danger" 
              onClick={() => onDelete(contact.id)} 
              style={{ padding: '4px 6px', fontSize: '0.75rem', marginLeft: 'auto' }}
              title="प्रोफाइल डिलीट करें"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
