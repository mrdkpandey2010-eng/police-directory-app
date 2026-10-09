import React from 'react';
import { Users, MessageSquare, Bell, ShieldCheck, User, Menu } from 'lucide-react';

export default function MobileBottomNav({
  currentUser,
  unreadMessagesCount = 0,
  notifCount = 0,
  pendingCount = 0,
  onOpenChat,
  onOpenNotifications,
  onOpenAdmin,
  onOpenProfile,
  onOpenMenu,
  onNavigateHome,
  isChatModalOpen = false,
  isNotifsModalOpen = false,
  isAdminModalOpen = false,
  isProfileModalOpen = false,
  isMenuDrawerOpen = false
}) {
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'co_admin';
  const isHomeActive = !isChatModalOpen && !isNotifsModalOpen && !isAdminModalOpen && !isProfileModalOpen && !isMenuDrawerOpen;

  const navItemStyle = (isActive) => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    padding: '6px 2px 5px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    color: isActive ? 'var(--khaki-primary, #c49756)' : '#94a3b8',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation'
  });

  const iconContainerStyle = (isActive) => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '28px',
    borderRadius: '12px',
    background: isActive ? 'rgba(196, 151, 86, 0.16)' : 'transparent',
    boxShadow: isActive ? '0 0 10px rgba(196, 151, 86, 0.25)' : 'none',
    transition: 'all 0.2s ease'
  });

  const labelStyle = (isActive) => ({
    fontSize: '0.66rem',
    fontWeight: isActive ? 700 : 500,
    letterSpacing: '0.02em',
    lineHeight: 1.1,
    color: isActive ? '#fef08a' : '#94a3b8'
  });

  const badgeStyle = {
    position: 'absolute',
    top: '-3px',
    right: '-5px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#ffffff',
    fontSize: '0.62rem',
    fontWeight: 800,
    padding: '1px 4.5px',
    borderRadius: '10px',
    minWidth: '15px',
    height: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
    border: '1.5px solid #070e1c'
  };

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10050,
        background: 'rgba(7, 14, 28, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(196, 151, 86, 0.32)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingLeft: '4px',
        paddingRight: '4px',
        paddingBottom: 'max(6px, env(safe-area-inset-bottom, 6px))',
        pointerEvents: 'auto'
      }}
    >
      {/* 1. DIRECTORY / HOME TAB */}
      <button
        type="button"
        onClick={onNavigateHome}
        style={navItemStyle(isHomeActive)}
        title="पुलिस निर्देशिका (Home Directory)"
      >
        <div style={iconContainerStyle(isHomeActive)}>
          <Users size={19} color={isHomeActive ? '#fef08a' : '#94a3b8'} strokeWidth={isHomeActive ? 2.4 : 2} />
        </div>
        <span style={labelStyle(isHomeActive)}>निर्देशिका</span>
      </button>

      {/* 2. CHATS / MESSAGES TAB */}
      <button
        type="button"
        onClick={onOpenChat}
        style={navItemStyle(isChatModalOpen)}
        title="संदेश कक्ष (Police Messages & Groups)"
      >
        <div style={iconContainerStyle(isChatModalOpen)}>
          <MessageSquare size={19} color={isChatModalOpen ? '#fef08a' : '#94a3b8'} strokeWidth={isChatModalOpen ? 2.4 : 2} />
          {unreadMessagesCount > 0 && (
            <span style={badgeStyle}>
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </span>
          )}
        </div>
        <span style={labelStyle(isChatModalOpen)}>संदेश</span>
      </button>

      {/* 3. NOTICES / ALERTS TAB */}
      <button
        type="button"
        onClick={onOpenNotifications}
        style={navItemStyle(isNotifsModalOpen)}
        title="शासकीय सूचनाएं व अलर्ट्स (Official Notices)"
      >
        <div style={iconContainerStyle(isNotifsModalOpen)}>
          <Bell size={19} color={isNotifsModalOpen ? '#fef08a' : '#94a3b8'} strokeWidth={isNotifsModalOpen ? 2.4 : 2} />
          {notifCount > 0 && (
            <span style={badgeStyle}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </div>
        <span style={labelStyle(isNotifsModalOpen)}>सूचनाएं</span>
      </button>

      {/* 4. ADMIN CONTROL OR USER PROFILE TAB */}
      {(isAdmin || isCoAdmin) ? (
        <button
          type="button"
          onClick={onOpenAdmin}
          style={navItemStyle(isAdminModalOpen)}
          title="प्रशासनिक नियंत्रण कक्ष (Admin / Co-Admin Control)"
        >
          <div style={iconContainerStyle(isAdminModalOpen)}>
            <ShieldCheck size={19} color={isAdminModalOpen ? '#fef08a' : '#94a3b8'} strokeWidth={isAdminModalOpen ? 2.4 : 2} />
            {pendingCount > 0 && (
              <span style={{ ...badgeStyle, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                {pendingCount}
              </span>
            )}
          </div>
          <span style={labelStyle(isAdminModalOpen)}>कंट्रोल</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenProfile}
          style={navItemStyle(isProfileModalOpen)}
          title="मेरी कार्मिक प्रोफाइल (My Profile)"
        >
          <div style={iconContainerStyle(isProfileModalOpen)}>
            <User size={19} color={isProfileModalOpen ? '#fef08a' : '#94a3b8'} strokeWidth={isProfileModalOpen ? 2.4 : 2} />
          </div>
          <span style={labelStyle(isProfileModalOpen)}>प्रोफ़ाइल</span>
        </button>
      )}

      {/* 5. TOGGLE MENU DRAWER TAB */}
      <button
        type="button"
        onClick={onOpenMenu}
        style={navItemStyle(isMenuDrawerOpen)}
        title="टॉगल मेनू एवं सेटिंग्स (Main Menu)"
      >
        <div style={iconContainerStyle(isMenuDrawerOpen)}>
          <Menu size={19} color={isMenuDrawerOpen ? '#fef08a' : '#94a3b8'} strokeWidth={isMenuDrawerOpen ? 2.4 : 2} />
        </div>
        <span style={labelStyle(isMenuDrawerOpen)}>मेनू</span>
      </button>
    </nav>
  );
}
