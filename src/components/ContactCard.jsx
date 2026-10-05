import React, { useState } from 'react';
import { 
  Phone, MessageSquare, MapPin, Building2, Copy, Check, Mail, Edit3, 
  Lock, Unlock, Trash2, Power, ShieldCheck, PhoneCall, KeyRound, EyeOff, Send
} from 'lucide-react';
import { canViewPhoneNumber, requestPhonePermission } from '../utils/storage';
import { callManager } from '../utils/webrtc';

export default function ContactCard({ 
  contact, 
  currentUser,
  permissions = [],
  onEdit, 
  onToggleBlock, 
  onToggleActive,
  onPromoteCoAdmin,
  onRevokeCoAdmin,
  onDelete,
  onOpenChatWithContact,
  onPermissionUpdated
}) {
  const [copied, setCopied] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);

  // Check if current user has permission to view this officer's phone number
  const isPhoneVisible = canViewPhoneNumber(currentUser, contact, permissions);

  // Check if a request is already pending
  const existingReq = permissions.find(p => p.requesterId === currentUser?.id && p.targetId === contact.id);

  // Scoped authorization: Admin can manage all; Co-Admin can only manage their posted district
  const canManage = 
    currentUser?.role === 'admin' || 
    (currentUser?.role === 'co_admin' && contact.district === currentUser?.district);

  const isAdmin = currentUser?.role === 'admin';
  const isActive = contact.status === 'approved' || contact.status === 'active';

  // Format clean phone for tel link if visible
  const rawPhone = (contact.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 ? `+91${rawPhone}` : `+${rawPhone}`;

  const handleCopy = () => {
    if (!isPhoneVisible) return;
    navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartInAppCall = () => {
    if (!currentUser) {
      alert('कॉल करने हेतु पहले पोर्टल में लॉगिन करें।');
      return;
    }
    if (currentUser.id === contact.id) {
      alert('आप स्वयं को कॉल नहीं कर सकते।');
      return;
    }
    callManager.startCall(currentUser, contact);
  };

  const handleRequestAccess = () => {
    if (!currentUser) {
      alert('फोन नंबर देखने का अनुरोध भेजने हेतु कृपया लॉगिन करें।');
      return;
    }
    const res = requestPhonePermission(currentUser, contact);
    if (res.success) {
      setRequestStatus('sent');
      if (onPermissionUpdated) onPermissionUpdated();
      alert(`✅ ${contact.name} को फोन नंबर देखने हेतु अनुमति अनुरोध भेज दिया गया है।`);
    } else {
      alert(res.message || 'अनुरोध पहले से भेजा गया है।');
    }
  };

  const getInitial = (name) => {
    if (!name) return 'POL';
    const cleanName = name.replace(/\(.*\)/, '').trim();
    return cleanName.charAt(0).toUpperCase();
  };

  return (
    <div className="officer-card" style={{
      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 26, 0.98))',
      border: '1px solid var(--khaki-border, rgba(196, 151, 86, 0.3))',
      borderRadius: '12px',
      padding: '0.85rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
      position: 'relative'
    }}>
      {/* Top Section with Avatar & Officer info */}
      <div className="card-top" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="avatar-badge" style={{
            width: '52px',
            height: '52px',
            borderRadius: '10px',
            overflow: 'hidden',
            padding: 0,
            border: contact.uniformPhoto ? '2px solid var(--khaki-primary, #c49756)' : '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(30, 58, 138, 0.3)',
            fontWeight: 800,
            color: 'var(--khaki-light, #dfb97e)',
            fontSize: '1.2rem'
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
                bottom: -3,
                right: -3,
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

        <div className="officer-details" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
            <h3 className="officer-name" style={{
              margin: 0,
              fontSize: '0.98rem',
              fontWeight: 800,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }} title={contact.name}>
              {contact.name}
            </h3>
            {contact.isCoAdmin && (
              <span style={{ fontSize: '0.68rem', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                Co-Admin
              </span>
            )}
          </div>
          <div className="officer-pno" style={{ fontSize: '0.74rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 600, marginTop: '1px' }}>
            PNO: {contact.pno}
          </div>
          <span className="officer-post" style={{
            fontSize: '0.74rem',
            color: '#cbd5e1',
            display: 'inline-block',
            background: 'rgba(255,255,255,0.06)',
            padding: '1px 6px',
            borderRadius: '4px',
            marginTop: '2px'
          }}>
            {contact.post}
          </span>
        </div>
      </div>

      {/* Info Rows */}
      <div className="info-rows" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.3rem',
        fontSize: '0.78rem',
        color: '#94a3b8',
        background: 'rgba(0,0,0,0.2)',
        padding: '0.5rem 0.65rem',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={13} color="var(--khaki-primary)" />
          <span>ज़िला: <strong style={{ color: '#e2e8f0' }}>{contact.district}</strong></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Building2 size={13} color="var(--khaki-primary)" />
          <span>कार्यालय/थाना: <strong style={{ color: '#e2e8f0' }}>{contact.office}</strong></span>
        </div>

        {/* Phone Number Row with Privacy Masking */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Phone size={13} color="var(--khaki-primary)" />
            {isPhoneVisible ? (
              <span style={{ color: 'var(--khaki-light, #dfb97e)', fontWeight: 700, letterSpacing: '0.04em' }}>
                {contact.phone}
              </span>
            ) : (
              <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <EyeOff size={12} color="#f59e0b" />
                <span>XXXXXXXX (गोपनीय नंबर)</span>
              </span>
            )}
          </div>

          {isPhoneVisible ? (
            <button 
              onClick={handleCopy}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: copied ? '#10b981' : '#64748b', 
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px'
              }}
              title="नंबर कॉपी करें"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          ) : (
            <div>
              {existingReq ? (
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: existingReq.status === 'approved' ? 'rgba(16,185,129,0.2)' : existingReq.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                  color: existingReq.status === 'approved' ? '#34d399' : existingReq.status === 'rejected' ? '#fca5a5' : '#fcd34d'
                }}>
                  {existingReq.status === 'approved' ? 'स्वीकृत' : existingReq.status === 'rejected' ? 'अस्वीकृत' : '⏳ लंबित'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestAccess}
                  style={{
                    background: 'rgba(196,151,86,0.15)',
                    border: '1px solid var(--khaki-primary, #c49756)',
                    color: 'var(--khaki-light, #dfb97e)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                  title="अधिकारी से मोबाइल नंबर देखने हेतु अनुमति मांगें"
                >
                  <KeyRound size={10} />
                  <span>अनुमति मांगें</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: Native In-App Voice Call, Message Box, and Direct Call (No WhatsApp) */}
      <div className="card-actions" style={{
        display: 'grid',
        gridTemplateColumns: isPhoneVisible ? '1.15fr 1fr 1.15fr' : '1.3fr 1.2fr',
        gap: '0.35rem'
      }}>
        {/* Button 1: Native In-App P2P Voice Call (Max 5 mins, Encrypted, Logged) */}
        <button
          type="button"
          onClick={handleStartInAppCall}
          className="btn btn-call"
          title={`${contact.name} को इन-ऐप सुरक्षित वॉइस कॉल करें (अधिकतम 05 मिनट)`}
          style={{
            padding: '0.45rem 0.35rem',
            fontSize: '0.78rem',
            background: 'linear-gradient(135deg, #15803d, #166534)',
            color: '#fff',
            border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          <PhoneCall size={13} />
          <span>इन-ऐप कॉल</span>
        </button>

        {/* Button 2: Direct Phone Call (If number visible) */}
        {isPhoneVisible && (
          <a 
            href={`tel:${cleanPhone}`} 
            className="btn btn-secondary" 
            title={`${contact.name} के मोबाइल पर डायरेक्ट सिम कॉल करें`}
            style={{
              padding: '0.45rem 0.35rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              borderRadius: '6px',
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#e2e8f0',
              fontWeight: 600
            }}
          >
            <Phone size={13} />
            <span>फोन कॉल</span>
          </a>
        )}

        {/* Button 3: Internal Police Message Box */}
        <button 
          type="button"
          onClick={() => onOpenChatWithContact && onOpenChatWithContact(contact)}
          className="btn btn-primary"
          title={`${contact.name} को आधिकारिक विभागीय संदेश भेजें`}
          style={{
            padding: '0.45rem 0.35rem',
            fontSize: '0.78rem',
            background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)',
            color: '#fff',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          <Mail size={13} />
          <span>संदेश भेजें</span>
        </button>
      </div>

      {/* Admin / Co-Admin Operations Bar */}
      {canManage && (
        <div style={{ 
          marginTop: '0.4rem', 
          paddingTop: '0.45rem', 
          borderTop: '1px solid rgba(196,151,86,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--khaki-primary, #c49756)', fontWeight: 700 }}>
              {isAdmin ? 'ADMIN CONTROLS:' : `CO-ADMIN (${currentUser?.district}):`}
            </span>

            {/* Active / Inactive Toggle */}
            <button
              className={`btn ${isActive ? 'btn-danger' : 'btn-success'}`}
              style={{ padding: '2px 6px', fontSize: '0.68rem' }}
              onClick={() => onToggleActive(contact.id)}
              title={isActive ? "यूजर को निष्क्रिय (Inactive) करें" : "यूजर को सक्रिय (Active) करें"}
            >
              <Power size={10} />
              <span>{isActive ? "निष्क्रिय" : "सक्रिय"}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => onEdit(contact)} 
              style={{ padding: '3px 6px', fontSize: '0.72rem' }}
              title="प्रोफ़ाइल संपादित करें"
            >
              <Edit3 size={11} />
              <span>संपादित</span>
            </button>

            {isAdmin && (
              <button
                className={`btn ${contact.isCoAdmin ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '3px 6px', fontSize: '0.72rem', borderColor: 'var(--khaki-primary)' }}
                onClick={() => {
                  if (contact.isCoAdmin) {
                    if (onRevokeCoAdmin) onRevokeCoAdmin(contact.id);
                  } else {
                    if (onPromoteCoAdmin) onPromoteCoAdmin(contact.id, contact.district);
                  }
                }}
                title={contact.isCoAdmin ? "Co-Admin पद हटाएं" : `${contact.district} का Co-Admin बनाएं`}
              >
                <ShieldCheck size={11} />
                <span>{contact.isCoAdmin ? "हटाएं" : "Co-Admin"}</span>
              </button>
            )}

            <button 
              className={`btn ${contact.status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
              onClick={() => onToggleBlock(contact.id)}
              style={{ padding: '3px 6px', fontSize: '0.72rem' }}
              title={contact.status === 'blocked' ? 'लॉगिन अनब्लॉक करें' : 'लॉगिन ब्लॉक करें'}
            >
              {contact.status === 'blocked' ? <Unlock size={11} /> : <Lock size={11} />}
              <span>{contact.status === 'blocked' ? 'अनब्लॉक' : 'ब्लॉक'}</span>
            </button>

            <button 
              className="btn btn-danger" 
              onClick={() => onDelete(contact.id)} 
              style={{ padding: '3px 6px', fontSize: '0.72rem', marginLeft: 'auto' }}
              title="प्रोफाइल डिलीट करें"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
