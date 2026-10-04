import React from 'react';
import { 
  Shield, UserPlus, Lock, RefreshCw, Bell, MessageSquare, 
  User, LogOut, CheckCircle, Clock, ShieldCheck, KeyRound, MessageCircle, Mail, Cloud 
} from 'lucide-react';

export default function Header({ 
  currentUser,
  totalApprovedCount, 
  pendingCount, 
  notifCount,
  chatsCount = 0,
  isFirebaseConnected = false,
  onOpenFirebaseSetup,
  onOpenLogin,
  onOpenRegister, 
  onOpenAdmin, 
  onOpenProfile,
  onOpenNotifications,
  onOpenFeedback,
  onOpenChat,
  onLogout,
  onQuickRoleSwitch,
  onResetData 
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  return (
    <header className="header-card">
      {/* Quick Role Switcher Toolbar for Evaluator / Testing */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        padding: '6px 10px',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontSize: '0.8rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--gold-primary)', fontWeight: 700 }}>⚡ क्विक रोल स्विचर:</span>
          <span style={{ color: 'var(--text-secondary)' }}>
            (वर्तमान: <strong style={{ color: 'var(--text-bright)' }}>
              {isAdmin ? '👑 Super Admin' : isCoAdmin ? `🛡️ Co-Admin (${currentUser.district})` : isUser ? `👮 User (${currentUser.name})` : '🌐 Guest (Visitor)'}
            </strong>)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button 
            className={`btn ${isAdmin ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
            onClick={() => onQuickRoleSwitch('admin')}
            title="Super Admin - पूर्ण अधिकार"
          >
            👑 Super Admin
          </button>

          <button 
            className={`btn ${isCoAdmin && currentUser?.district === 'लखनऊ' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
            onClick={() => onQuickRoleSwitch('co_admin_lk')}
            title="Co-Admin - केवल लखनऊ ज़िला"
          >
            🛡️ Co-Admin (लखनऊ)
          </button>

          <button 
            className={`btn ${isCoAdmin && currentUser?.district === 'कानपुर नगर' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
            onClick={() => onQuickRoleSwitch('co_admin_kn')}
            title="Co-Admin - केवल कानपुर नगर ज़िला"
          >
            🛡️ Co-Admin (कानपुर)
          </button>

          <button 
            className={`btn ${isUser && currentUser?.id === 'pol-103' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.74rem' }}
            onClick={() => onQuickRoleSwitch('user')}
            title="Employee User - प्रिया वर्मा"
          >
            👮 User (प्रिया वर्मा)
          </button>

          <button 
            className={`btn ${currentUser?.id === 'pol-115' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '2px 8px', fontSize: '0.74rem', borderColor: 'rgba(245,158,11,0.5)', color: '#fde047' }}
            onClick={() => onQuickRoleSwitch('user_no_photo')}
            title="परीक्षण खाता: बिना वर्दी फोटो वाला यूजर (अनिवार्य फोटो सत्यापन गेट सक्रिय होगा)"
          >
            ⚠️ विकास (फोटो गेट टेस्ट)
          </button>

          {isLoggedIn && (
            <button 
              className="btn btn-secondary"
              style={{ padding: '2px 8px', fontSize: '0.74rem', borderColor: 'var(--danger-red)', color: '#fca5a5' }}
              onClick={onLogout}
              title="लॉगआउट करें"
            >
              <LogOut size={11} /> लॉगआउट
            </button>
          )}
        </div>
      </div>

      {/* Main Brand Section */}
      <div className="header-top">
        <div className="brand-section">
          <div className="police-badge-icon">
            <Shield size={28} />
          </div>
          <div className="brand-titles">
            <h1>
              पुलिस विभाग निर्देशिका एवं कॉलर ऐप
              <span className="dept-tag">आधिकारिक निर्देशिका</span>
            </h1>
            <p className="brand-subtitle">
              Role-Based Directory • Direct Calling • WhatsApp • Peer-to-Peer Message Box & Groups
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="header-actions">
          {/* Peer-to-Peer Message Box Button */}
          {isLoggedIn && (
            <button 
              className="btn btn-primary"
              onClick={onOpenChat}
              title="पीयर-टू-पीयर मैसेज बॉक्स एवं समूह चैट (Direct P2P & Group Messages)"
              style={{ 
                position: 'relative', 
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', 
                color: '#fff', 
                border: '1px solid rgba(59,130,246,0.5)' 
              }}
            >
              <Mail size={16} />
              <span>मैसेज बॉक्स</span>
              {chatsCount > 0 && (
                <span className="tab-badge" style={{ position: 'relative', top: 'auto', right: 'auto', background: '#ef4444', color: '#fff' }}>
                  {chatsCount}
                </span>
              )}
            </button>
          )}

          {/* Cloud Sync Status / Setup Button */}
          {isLoggedIn && onOpenFirebaseSetup && (
            <button
              className="btn btn-secondary"
              onClick={onOpenFirebaseSetup}
              title={isFirebaseConnected ? "Google Firebase लाइव क्लाउड सक्रिय है (सभी डिवाइस पर लाइव)" : "Google Firebase लाइव क्लाउड सेटअप करें"}
              style={{
                borderColor: isFirebaseConnected ? 'rgba(16,185,129,0.5)' : 'rgba(234,179,8,0.4)',
                color: isFirebaseConnected ? '#34d399' : '#fde047',
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Cloud size={15} />
              <span>{isFirebaseConnected ? 'लाइव क्लाउड' : 'क्लाउड सेटअप'}</span>
            </button>
          )}

          {/* Notifications Button */}
          <button 
            className="btn btn-secondary"
            onClick={onOpenNotifications}
            title="विभागीय सूचनाएं एवं परिपत्र"
            style={{ position: 'relative' }}
          >
            <Bell size={16} color="var(--gold-primary)" />
            <span>सूचनाएं</span>
            {notifCount > 0 && (
              <span className="tab-badge" style={{ position: 'relative', top: 'auto', right: 'auto' }}>
                {notifCount}
              </span>
            )}
          </button>

          {/* Feedback Button */}
          <button 
            className="btn btn-secondary"
            onClick={onOpenFeedback}
            title="फीडबैक एवं सुझाव"
          >
            <MessageSquare size={16} />
            <span>फीडबैक</span>
          </button>

          {/* User Specific or Admin Specific Controls */}
          {isUser && (
            <button 
              className="btn btn-secondary"
              onClick={onOpenProfile}
              title="अपनी प्रोफ़ाइल देखें एवं अपडेट अनुरोध करें"
            >
              <User size={16} />
              <span>मेरी प्रोफ़ाइल</span>
            </button>
          )}

          {(isAdmin || isCoAdmin) && (
            <button 
              className="btn btn-admin"
              onClick={onOpenAdmin}
              title={isAdmin ? "Super Admin Portal" : `Co-Admin Portal (${currentUser.district})`}
            >
              <Lock size={16} />
              <span>{isAdmin ? 'Admin पोर्टल' : `Co-Admin (${currentUser.district})`}</span>
              {pendingCount > 0 && (
                <span className="tab-badge">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {!isLoggedIn && (
            <>
              <button 
                className="btn btn-primary"
                onClick={onOpenRegister}
                title="नया कर्मचारी स्व-पंजीकरण"
              >
                <UserPlus size={16} />
                <span>स्व-पंजीकरण</span>
              </button>

              <button 
                className="btn btn-admin"
                onClick={onOpenLogin}
                title="पोर्टल लॉगिन करें"
              >
                <KeyRound size={16} />
                <span>लॉगिन</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={15} color="var(--success-emerald)" />
          <span>सक्रिय संपर्क: <strong style={{ color: 'var(--text-bright)' }}>{totalApprovedCount}</strong></span>
        </div>

        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={15} color="var(--warning-amber)" />
            <span>लंबित अप्रूवल: <strong style={{ color: 'var(--warning-amber)' }}>{pendingCount}</strong></span>
          </div>
        )}

        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(229,184,66,0.12)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(229,184,66,0.25)' }}>
            <User size={13} color="var(--gold-primary)" />
            <span>लॉगिन: <strong style={{ color: 'var(--gold-light)' }}>{currentUser.name}</strong></span>
            {currentUser.district && <span style={{ opacity: 0.8 }}>({currentUser.district})</span>}
          </div>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button 
            onClick={onResetData}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="डिफ़ॉल्ट डेटा रीसेट करें"
          >
            <RefreshCw size={12} />
            <span>डेमो डेटा रीसेट</span>
          </button>
        </div>
      </div>
    </header>
  );
}
