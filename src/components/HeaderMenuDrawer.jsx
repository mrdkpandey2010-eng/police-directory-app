import React from 'react';
import { 
  X, Shield, ShieldCheck, User, Users, Lock, Phone, MessageSquare, 
  Mail, Bell, Database, Cloud, FileText, Settings, LogOut, CheckCircle2,
  HardDrive, ShieldAlert, KeyRound, Eye, ChevronRight
} from 'lucide-react';

export default function HeaderMenuDrawer({
  isOpen,
  onClose,
  currentUser,
  pendingCount = 0,
  notifCount = 0,
  chatsCount = 0,
  isFirebaseConnected = false,
  onOpenProfile,
  onOpenAdmin,
  onOpenChat,
  onOpenNotifications,
  onOpenFeedback,
  onOpenFirebaseSetup,
  onOpenPolicy,
  onLogout,
  onOpenLogin,
  onOpenRegister,
  onTriggerBackup
}) {
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  const handleAction = (cb) => {
    onClose();
    if (cb) cb();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 23, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 9990,
      display: 'flex',
      justifyContent: 'flex-end',
      transition: 'opacity 0.25s ease'
    }} onClick={onClose}>
      <div 
        style={{
          width: '100%',
          maxWidth: '380px',
          height: '100%',
          background: 'linear-gradient(180deg, #0e1e3b 0%, #071022 100%)',
          borderLeft: '2px solid var(--khaki-primary, #c49756)',
          boxShadow: '-10px 0 35px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          color: '#f8fafc'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem 1.25rem',
          borderBottom: '1px solid rgba(196,151,86,0.3)',
          background: 'rgba(196,151,86,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'rgba(196,151,86,0.2)',
              border: '1px solid var(--khaki-primary, #c49756)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex'
            }}>
              <Shield size={20} color="var(--khaki-primary, #c49756)" />
            </div>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--khaki-light, #dfb97e)', letterSpacing: '0.02em' }}>
                कंट्रोल एवं नेविगेशन मेनु
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {isAdmin ? '👑 Super Admin Control' : isCoAdmin ? `🛡️ Co-Admin (${currentUser.district})` : isUser ? '👮 कार्मिक मुख्य मेनु' : 'उत्तर प्रदेश पुलिस पोर्टल'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Officer Status Ribbon */}
        {isLoggedIn && (
          <div style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(0,0,0,0.25)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: '2px solid var(--khaki-primary, #c49756)',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: 'var(--khaki-light, #dfb97e)',
              flexShrink: 0
            }}>
              {currentUser.uniformPhoto ? (
                <img src={currentUser.uniformPhoto} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={20} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--khaki-light, #dfb97e)' }}>
                {currentUser.post || (isAdmin ? 'मुख्यालय पुलिस महानिदेशक' : 'सह-व्यवस्थापक')}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                {currentUser.district || 'उत्तर प्रदेश'} • PNO: {currentUser.pno || 'ADMN-01'}
              </div>
            </div>
          </div>
        )}

        {/* Menu Body - Scrollable */}
        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Section: Communication & Realtime Tools */}
          {isLoggedIn && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--khaki-primary, #c49756)', letterSpacing: '0.08em', marginBottom: '0.45rem', paddingLeft: '4px' }}>
                सुरक्षित संचार व संदेश
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleAction(onOpenChat)}
                  style={menuItemStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Mail size={16} color="var(--khaki-light)" />
                    <span>मैसेज बॉक्स एवं ग्रुप चैट</span>
                  </div>
                  {chatsCount > 0 ? (
                    <span style={badgeStyle}>{chatsCount}</span>
                  ) : (
                    <ChevronRight size={14} color="#64748b" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(onOpenNotifications)}
                  style={menuItemStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={16} color="var(--khaki-light)" />
                    <span>विभागीय सूचनाएं व परिपत्र</span>
                  </div>
                  {notifCount > 0 ? (
                    <span style={badgeStyle}>{notifCount}</span>
                  ) : (
                    <ChevronRight size={14} color="#64748b" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(onOpenFeedback)}
                  style={menuItemStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageSquare size={16} color="var(--khaki-light)" />
                    <span>सुझाव व फीडबैक</span>
                  </div>
                  <ChevronRight size={14} color="#64748b" />
                </button>
              </div>
            </div>
          )}

          {/* Section: Admin / Co-Admin Controls */}
          {(isAdmin || isCoAdmin) && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--khaki-primary, #c49756)', letterSpacing: '0.08em', marginBottom: '0.45rem', paddingLeft: '4px' }}>
                प्रशासकीय नियंत्रण कक्ष (2FA Protected)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleAction(onOpenAdmin)}
                  style={{ ...menuItemStyle, background: 'rgba(196,151,86,0.12)', border: '1px solid rgba(196,151,86,0.3)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={16} color="var(--khaki-primary)" />
                    <span>{isAdmin ? 'Super Admin कंट्रोल पोर्टल' : `ज़िला Co-Admin पोर्टल (${currentUser.district})`}</span>
                  </div>
                  {pendingCount > 0 ? (
                    <span style={{ ...badgeStyle, background: '#f59e0b', color: '#000' }}>{pendingCount} लंबित</span>
                  ) : (
                    <ChevronRight size={14} color="#64748b" />
                  )}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onTriggerBackup) {
                        onTriggerBackup();
                        alert('✅ 6-घंटे का सुरक्षित डेटाबेस बैकअप स्लॉट तैयार हो गया है!');
                      }
                      onClose();
                    }}
                    style={menuItemStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <HardDrive size={16} color="var(--khaki-light)" />
                      <span>तुरंत 6-घंटे बैकअप तैयार करें</span>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </button>
                )}

                {onOpenFirebaseSetup && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenFirebaseSetup)}
                    style={menuItemStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Cloud size={16} color={isFirebaseConnected ? '#34d399' : 'var(--khaki-light)'} />
                      <span>{isFirebaseConnected ? 'Firebase लाइव क्लाउड (सक्रिय)' : 'Firebase सेटअप'}</span>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section: User Profile & Security */}
          {isUser && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--khaki-primary, #c49756)', letterSpacing: '0.08em', marginBottom: '0.45rem', paddingLeft: '4px' }}>
                कार्मिक खाता एवं सुरक्षा
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleAction(onOpenProfile)}
                  style={menuItemStyle}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={16} color="var(--khaki-light)" />
                    <span>मेरी प्रोफ़ाइल एवं वर्दी फोटो</span>
                  </div>
                  <ChevronRight size={14} color="#64748b" />
                </button>
              </div>
            </div>
          )}

          {/* Section: Guest / Non-logged in */}
          {!isLoggedIn && (
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--khaki-primary, #c49756)', letterSpacing: '0.08em', marginBottom: '0.45rem', paddingLeft: '4px' }}>
                प्रवेश एवं पंजीकरण
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenLogin)}
                    style={menuItemStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Lock size={16} color="var(--khaki-light)" />
                      <span>अधिकृत कार्मिक लॉगिन</span>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </button>
                )}

                {onOpenRegister && (
                  <button
                    type="button"
                    onClick={() => handleAction(onOpenRegister)}
                    style={menuItemStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={16} color="var(--khaki-light)" />
                      <span>नया कार्मिक स्व-पंजीकरण</span>
                    </div>
                    <ChevronRight size={14} color="#64748b" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section: Policies & Rules */}
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--khaki-primary, #c49756)', letterSpacing: '0.08em', marginBottom: '0.45rem', paddingLeft: '4px' }}>
              शासकीय नीतियां एवं निर्देश
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleAction(() => onOpenPolicy && onOpenPolicy('disclaimer'))}
                style={menuItemStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert size={16} color="var(--khaki-light)" />
                  <span>अस्वीकरण (Disclaimer)</span>
                </div>
                <ChevronRight size={14} color="#64748b" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onOpenPolicy && onOpenPolicy('terms'))}
                style={menuItemStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color="var(--khaki-light)" />
                  <span>नियम एवं शर्तें (Terms & Conditions)</span>
                </div>
                <ChevronRight size={14} color="#64748b" />
              </button>

              <button
                type="button"
                onClick={() => handleAction(() => onOpenPolicy && onOpenPolicy('privacy'))}
                style={menuItemStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={16} color="var(--khaki-light)" />
                  <span>गोपनीयता नीति (Privacy Policy)</span>
                </div>
                <ChevronRight size={14} color="#64748b" />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Footer with Logout / Session exit */}
        {isLoggedIn && (
          <div style={{
            padding: '1rem',
            borderTop: '1px solid rgba(196,151,86,0.25)',
            background: 'rgba(0,0,0,0.4)'
          }}>
            <button
              type="button"
              onClick={() => handleAction(onLogout)}
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#fca5a5',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} />
              <span>सुरक्षित पोर्टल लॉगआउट (Logout)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const menuItemStyle = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0.7rem 0.85rem',
  background: 'rgba(255, 255, 255, 0.04)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s ease'
};

const badgeStyle = {
  background: '#ef4444',
  color: '#fff',
  fontSize: '0.7rem',
  fontWeight: 800,
  padding: '1px 6px',
  borderRadius: '10px'
};
