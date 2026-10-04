import React from 'react';
import { 
  Shield, UserPlus, Lock, RefreshCw, Bell, MessageSquare, 
  User, LogOut, CheckCircle, Clock, KeyRound, Mail, Cloud 
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
  onResetData 
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  return (
    <header className="header-card">
      {/* Main Brand Section */}
      <div className="header-top">
        <div className="brand-section">
          <div className="police-badge-icon">
            <Shield size={26} color="var(--khaki-light, #dfb97e)" />
          </div>
          <div className="brand-titles">
            <h1>
              उत्तर प्रदेश पुलिस निर्देशिका
              <span className="dept-tag">आधिकारिक पोर्टल</span>
            </h1>
            <p className="brand-subtitle">
              उत्तर प्रदेश शासन • अधिकृत विभागीय दूरभाष निर्देशिका एवं त्वरित संपर्क प्रणाली
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
                background: 'linear-gradient(135deg, #162c5b, #1e40af)', 
                color: '#fff', 
                border: '1px solid rgba(196,151,86,0.5)' 
              }}
            >
              <Mail size={15} />
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
              title={isFirebaseConnected ? "Google Firebase लाइव क्लाउड सक्रिय है" : "Google Firebase लाइव क्लाउड सेटअप"}
              style={{
                borderColor: isFirebaseConnected ? 'rgba(16,185,129,0.5)' : 'rgba(196,151,86,0.4)',
                color: isFirebaseConnected ? '#34d399' : 'var(--khaki-light, #dfb97e)',
                padding: '0.4rem 0.65rem',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Cloud size={14} />
              <span>{isFirebaseConnected ? 'लाइव चैट' : 'क्लाउड सिंक'}</span>
            </button>
          )}

          {/* Notifications Button */}
          <button 
            className="btn btn-secondary"
            onClick={onOpenNotifications}
            title="विभागीय सूचनाएं एवं परिपत्र"
            style={{ position: 'relative' }}
          >
            <Bell size={15} color="var(--khaki-primary, #c49756)" />
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
            <MessageSquare size={15} />
            <span>फीडबैक</span>
          </button>

          {/* User Specific or Admin Specific Controls */}
          {isUser && (
            <button 
              className="btn btn-secondary"
              onClick={onOpenProfile}
              title="अपनी प्रोफ़ाइल देखें एवं अपडेट अनुरोध करें"
            >
              <User size={15} />
              <span>मेरी प्रोफ़ाइल</span>
            </button>
          )}

          {(isAdmin || isCoAdmin) && (
            <button 
              className="btn btn-admin"
              onClick={onOpenAdmin}
              title={isAdmin ? "Super Admin Portal" : `Co-Admin Portal (${currentUser.district})`}
            >
              <Lock size={15} />
              <span>{isAdmin ? 'Admin नियंत्रण' : `Co-Admin (${currentUser.district})`}</span>
              {pendingCount > 0 && (
                <span className="tab-badge">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {isLoggedIn ? (
            <button 
              className="btn btn-secondary"
              onClick={onLogout}
              title="पोर्टल से लॉगआउट करें"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#fca5a5'
              }}
            >
              <LogOut size={15} />
              <span>लॉगआउट</span>
            </button>
          ) : (
            <>
              <button 
                className="btn btn-primary"
                onClick={onOpenRegister}
                title="नया कर्मचारी स्व-पंजीकरण"
              >
                <UserPlus size={15} />
                <span>स्व-पंजीकरण</span>
              </button>

              <button 
                className="btn btn-admin"
                onClick={onOpenLogin}
                title="पोर्टल लॉगिन करें"
              >
                <KeyRound size={15} />
                <span>लॉगिन</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '0.85rem', 
        marginTop: '0.75rem', 
        paddingTop: '0.65rem', 
        borderTop: '1px solid rgba(255,255,255,0.08)', 
        flexWrap: 'wrap', 
        alignItems: 'center', 
        fontSize: '0.8rem', 
        color: 'var(--text-secondary)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle size={14} color="var(--success-emerald, #10b981)" />
          <span>सक्रिय कार्मिक: <strong style={{ color: 'var(--text-bright)' }}>{totalApprovedCount}</strong></span>
        </div>

        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} color="var(--warning-amber, #f59e0b)" />
            <span>लंबित सत्यापन: <strong style={{ color: 'var(--warning-amber)' }}>{pendingCount}</strong></span>
          </div>
        )}

        {currentUser && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px', 
            background: 'rgba(196,151,86,0.12)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            border: '1px solid rgba(196,151,86,0.3)' 
          }}>
            <User size={12} color="var(--khaki-primary, #c49756)" />
            <span>लॉगिन: <strong style={{ color: 'var(--khaki-light, #dfb97e)' }}>{currentUser.name}</strong></span>
            {currentUser.district && <span style={{ opacity: 0.85 }}>({currentUser.district})</span>}
          </div>
        )}

        {isAdmin && onResetData && (
          <div style={{ marginLeft: 'auto' }}>
            <button 
              onClick={onResetData}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="डिफ़ॉल्ट डेटा रीसेट करें"
            >
              <RefreshCw size={11} />
              <span>डेटा रीसेट</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
