import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, MessageSquare, User, LogOut, ChevronDown, Search, Trash2, Shield 
} from 'lucide-react';

export default function Header({ 
  currentUser, 
  userDistrictScope = 'my_district',
  onSelectMyDistrict,
  onOpenFilterSidebar,
  totalApprovedCount, 
  pendingCount = 0, 
  notifCount = 0, 
  chatsCount = 0, 
  onOpenLogin, 
  onOpenRegister, 
  onOpenAdmin, 
  onOpenProfile, 
  onOpenNotifications, 
  onOpenFeedback, 
  onOpenChat, 
  onLogout, 
  onResetData,
  onOpenMenu,
  onNavigateHome
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const searchMenuRef = useRef(null);

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
      if (searchMenuRef.current && !searchMenuRef.current.contains(event.target)) {
        setIsSearchMenuOpen(false);
      }
    };
    if (isProfileMenuOpen || isSearchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileMenuOpen, isSearchMenuOpen]);

  return (
    <header className="header-card" style={{ padding: '0.6rem 1rem', position: 'relative', zIndex: 100 }}>
      <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>

        {/* Compact Popup Selection Tab: "कर्मचारी खोजें" (Requirement 1) */}
        <div style={{ position: 'relative' }} ref={searchMenuRef}>
          <button
            type="button"
            onClick={() => setIsSearchMenuOpen(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(196, 151, 86, 0.12)',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              padding: '5px 11px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease'
            }}
            title="कर्मचारी खोजें (जनपद / अधिकारी फ़िल्टर)"
          >
            <Search size={14} color="var(--khaki-light, #dfb97e)" />
            <span>कर्मचारी खोजें</span>
            <ChevronDown size={13} color="var(--khaki-primary, #c49756)" style={{ transition: 'transform 0.2s', transform: isSearchMenuOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {/* Popup Selection Menu */}
          {isSearchMenuOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '270px',
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1.5px solid var(--khaki-border, rgba(196, 151, 86, 0.4))',
              borderRadius: '10px',
              boxShadow: '0 12px 30px rgba(0,0,0,0.65)',
              backdropFilter: 'blur(16px)',
              zIndex: 1000,
              overflow: 'hidden',
              padding: '6px'
            }}>
              {/* Option 1: केवल मेरा जनपद */}
              {currentUser?.district ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchMenuOpen(false);
                    if (onSelectMyDistrict) onSelectMyDistrict();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    background: userDistrictScope === 'my_district' ? 'rgba(196,151,86,0.2)' : 'transparent',
                    border: userDistrictScope === 'my_district' ? '1px solid var(--khaki-primary, #c49756)' : 'none',
                    borderRadius: '6px',
                    color: '#f8fafc',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = userDistrictScope === 'my_district' ? 'rgba(196,151,86,0.2)' : 'transparent'}
                >
                  <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>📌</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                      केवल मेरा जनपद ({currentUser.district})
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      गृह जनपद के कार्मिक देखें
                    </div>
                  </div>
                </button>
              ) : null}

              {/* Option 2: विशिष्ट अधिकारी / अन्य जनपद खोजें */}
              <button
                type="button"
                onClick={() => {
                  setIsSearchMenuOpen(false);
                  if (onOpenFilterSidebar) onOpenFilterSidebar();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Search size={16} color="var(--khaki-primary, #c49756)" />
                <div>
                  <div style={{ fontWeight: 700, color: '#f8fafc' }}>
                    विशिष्ट अधिकारी / अन्य जनपद खोजें
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    बाएं साइडबार फ़िल्टर खोलें
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Header Right Action Area: ONLY Profile (Point 1 & 2) */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', position: 'relative' }}>
          
          {/* User Profile Pill with Logout and Feedback options on click */}
          {isLoggedIn ? (
            <div style={{ position: 'relative' }} ref={profileMenuRef}>
              <button 
                type="button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--khaki-border, rgba(196,151,86,0.35))',
                  padding: '5px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'inherit',
                  transition: 'all 0.2s ease'
                }}
                title="प्रोफ़ाइल, फीडबैक एवं लॉगआउट मेनू"
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(196,151,86,0.2)',
                  border: '1px solid var(--khaki-primary, #c49756)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--khaki-light, #dfb97e)',
                  flexShrink: 0
                }}>
                  {currentUser.uniformPhoto ? (
                    <img src={currentUser.uniformPhoto} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={14} />
                  )}
                </div>
                <div style={{ textAlign: 'left' }} className="hide-on-mobile">
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--khaki-light, #dfb97e)' }}>
                    {isAdmin ? 'Super Admin' : isCoAdmin ? `Co-Admin (${currentUser.district})` : currentUser.post}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--khaki-primary, #c49756)" style={{ transition: 'transform 0.2s', transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {/* Profile Dropdown Menu with Logout and Feedback (Point 2) */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '230px',
                  background: 'rgba(15, 23, 42, 0.98)',
                  border: '1.5px solid var(--khaki-border, rgba(196, 151, 86, 0.4))',
                  borderRadius: '10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(16px)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  {/* User Info Header */}
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(196,151,86,0.08)'
                  }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--khaki-light, #dfb97e)', marginTop: '2px' }}>
                      {isAdmin ? '👑 Super Admin' : isCoAdmin ? `🛡️ Co-Admin (${currentUser.district})` : (currentUser.post || 'पुलिस कार्मिक')}
                    </div>
                    {currentUser.district && (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '1px' }}>
                        जनपद: {currentUser.district}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ padding: '4px' }}>
                    {/* 1. View Profile */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenProfile) onOpenProfile();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <User size={15} color="var(--khaki-primary, #c49756)" />
                      <span>मेरी प्रोफ़ाइल (My Profile)</span>
                    </button>

                    {/* 2. Suggestions & Feedback (Point 2) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenFeedback) onOpenFeedback();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#e2e8f0',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <MessageSquare size={15} color="var(--khaki-light, #dfb97e)" />
                      <span>सुझाव व फीडबैक</span>
                    </button>

                    {/* Admin Specific Quick Links */}
                    {isAdmin && (
                      <>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (onOpenAdmin) onOpenAdmin('recycle_bin');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '6px',
                            color: '#fcd34d',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'left',
                            margin: '3px 0'
                          }}
                        >
                          <Trash2 size={15} color="#f59e0b" />
                          <span>🗑️ रीसायकल बिन लॉग्स</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (onOpenAdmin) onOpenAdmin('device_lock');
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '6px',
                            color: '#fca5a5',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'left',
                            margin: '3px 0'
                          }}
                        >
                          <Lock size={15} color="#ef4444" />
                          <span>🔒 प्रतिबंधित डिवाइस सुरक्षा लॉक</span>
                        </button>
                      </>
                    )}

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

                    {/* 3. Secure Logout (Point 2) */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (window.confirm('क्या आप निश्चित रूप से उत्तर प्रदेश पुलिस पोर्टल से सुरक्षित लॉगआउट (Logout) करना चाहते हैं?')) {
                          if (onLogout) onLogout();
                        }
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <LogOut size={15} />
                      <span>सुरक्षित लॉगआउट (Logout)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={onOpenLogin}
              style={{
                background: 'linear-gradient(135deg, #c49756, #8e6833)',
                color: '#081022',
                fontWeight: 800,
                border: 'none',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={14} />
              <span>लॉगिन</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
