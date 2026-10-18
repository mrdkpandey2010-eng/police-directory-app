import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, MessageSquare, User, LogOut, ChevronDown, Search, Trash2, Shield, MapPin, Globe 
} from 'lucide-react';
import DistrictOfficeWizardPopup from './DistrictOfficeWizardPopup';
import InlineSearchPopup from './InlineSearchPopup';
import { resolveBilingualField } from '../utils/bilingual';

export default function Header({ 
  currentUser, 
  userDistrictScope = 'my_district',
  selectedDistrict = '',
  selectedOffice = '',
  selectedPost = '',
  searchQuery = '',
  districts = [],
  offices = [],
  posts = [],
  contacts = [],
  onSelectWizardFilters,
  onSearchSubmit,
  onResetToDefaultOffice,
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
  onNavigateHome,
  displayLanguage = 'hi',
  onLanguageChange
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Popups state: District/Office/Post wizard & minimal search
  const [isDistrictPopupOpen, setIsDistrictPopupOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close dropdowns on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  // Sync header popup open state for hardware/mobile back button
  const anyHeaderPopupOpen = Boolean(isDistrictPopupOpen || isSearchOpen || isProfileMenuOpen);
  useEffect(() => {
    window.__police_header_popup_open = anyHeaderPopupOpen;
  }, [anyHeaderPopupOpen]);

  useEffect(() => {
    const handleClosePopups = () => {
      setIsDistrictPopupOpen(false);
      setIsSearchOpen(false);
      setIsProfileMenuOpen(false);
    };
    window.addEventListener('police_app_close_popups', handleClosePopups);
    return () => window.removeEventListener('police_app_close_popups', handleClosePopups);
  }, []);

  return (
    <header className="header-card" style={{ padding: '0.6rem 0.85rem', position: 'relative', zIndex: 100 }}>
      <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px', flexWrap: 'nowrap' }}>

        {/* District Selector & Search Icon Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', minWidth: 0, flexShrink: 1 }}>
          {/* 1. Compact District Selection Button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setIsDistrictPopupOpen(prev => !prev);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: isDistrictPopupOpen ? 'rgba(196, 151, 86, 0.25)' : 'rgba(196, 151, 86, 0.12)',
              border: '1.5px solid var(--khaki-primary, #c49756)',
              padding: '5px 8px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              maxWidth: 'clamp(100px, 32vw, 190px)',
              minWidth: 0,
              flexShrink: 1
            }}
            title="जनपद, थाना एवं पद फ़िल्टर"
            aria-label="जनपद चुनें"
          >
            <MapPin size={13} color="var(--khaki-light, #dfb97e)" style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
              {selectedDistrict 
                ? (selectedOffice 
                    ? `${resolveBilingualField('district', selectedDistrict, displayLanguage)} • ${resolveBilingualField('office', selectedOffice, displayLanguage)}` 
                    : resolveBilingualField('district', selectedDistrict, displayLanguage))
                : (currentUser?.district 
                    ? resolveBilingualField('district', currentUser.district, displayLanguage) 
                    : (displayLanguage === 'en' ? 'Select District' : 'जनपद चुनें'))}
            </span>
            <ChevronDown size={12} color="var(--khaki-primary, #c49756)" style={{ flexShrink: 0, transform: isDistrictPopupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* 2. Compact Search Icon Beside District Selector */}
          <button
            type="button"
            onClick={() => {
              setIsDistrictPopupOpen(false);
              setIsSearchOpen(prev => !prev);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: isSearchOpen ? 'rgba(196, 151, 86, 0.25)' : 'rgba(255, 255, 255, 0.06)',
              border: '1.5px solid var(--khaki-border, rgba(196, 151, 86, 0.35))',
              color: 'var(--khaki-light, #dfb97e)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            title={displayLanguage === 'en' ? 'Search Personnel' : 'कर्मचारी खोजें'}
            aria-label={displayLanguage === 'en' ? 'Search' : 'सर्च करें'}
          >
            <Search size={15} />
          </button>

          {/* 3. Anchored 3-Stage Wizard Popup (District -> Office -> Designation) */}
          {isDistrictPopupOpen && (
            <DistrictOfficeWizardPopup
              districts={districts}
              offices={offices}
              posts={posts}
              contacts={contacts}
              currentUser={currentUser}
              initialDistrict={selectedDistrict || currentUser?.district || ''}
              displayLanguage={displayLanguage}
              onSelectComplete={(data) => {
                if (onSelectWizardFilters) onSelectWizardFilters(data);
                setIsDistrictPopupOpen(false);
              }}
              onClose={() => setIsDistrictPopupOpen(false)}
            />
          )}

          {/* 4. Anchored Minimal Single-Input Search Popup */}
          {isSearchOpen && (
            <InlineSearchPopup
              initialQuery={searchQuery}
              onSearchSubmit={async (q) => {
                if (onSearchSubmit) await onSearchSubmit(q);
                setIsSearchOpen(false);
              }}
              onClose={() => setIsSearchOpen(false)}
            />
          )}
        </div>

        {/* Header Right Action Area: Language Icon Button + Profile (Never wrap, strictly single line) */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap', flexShrink: 0, position: 'relative' }}>
          
          {/* Bilingual Language Icon Toggle Button (Requirement 1: Saves maximum horizontal space) */}
          <button
            type="button"
            onClick={() => onLanguageChange && onLanguageChange(displayLanguage === 'hi' ? 'en' : 'hi')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              height: '32px',
              padding: '0 8px',
              background: 'rgba(196, 151, 86, 0.15)',
              border: '1.5px solid var(--khaki-border, rgba(196, 151, 86, 0.4))',
              borderRadius: '8px',
              color: 'var(--khaki-light, #dfb97e)',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '0.74rem',
              fontWeight: 800,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
            }}
            title={displayLanguage === 'hi' ? 'अंग्रेजी में बदलें (Switch to English)' : 'हिंदी में बदलें (Switch to Hindi)'}
            aria-label="भाषा बदलें / Toggle Language"
          >
            <Globe size={15} color="var(--khaki-light, #dfb97e)" />
            <span>{displayLanguage === 'hi' ? 'EN' : 'हिं'}</span>
          </button>

          {/* User Profile Pill with Logout and Feedback options on click */}
          {isLoggedIn ? (
            <div style={{ position: 'relative', flexShrink: 0 }} ref={profileMenuRef}>
              <button 
                type="button"
                onClick={() => setIsProfileMenuOpen(prev => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--khaki-border, rgba(196,151,86,0.35))',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'inherit',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}
                title="प्रोफ़ाइल, फीडबैक एवं लॉगआउट मेनू"
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(196,151,86,0.2)',
                  border: '1px solid var(--khaki-primary, #c49756)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--khaki-light, #dfb97e)',
                  flexShrink: 0
                }}>
                  {currentUser.uniformPhoto ? (
                    <img src={currentUser.uniformPhoto} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={13} />
                  )}
                </div>
                <div style={{ textAlign: 'left' }} className="hide-on-mobile">
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>
                    {resolveBilingualField('name', currentUser, displayLanguage)}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--khaki-light, #dfb97e)' }}>
                    {isAdmin 
                      ? 'Super Admin' 
                      : isCoAdmin 
                        ? `Co-Admin (${resolveBilingualField('district', currentUser?.district, displayLanguage)})` 
                        : resolveBilingualField('post', currentUser?.post, displayLanguage)}
                  </div>
                </div>
                <ChevronDown size={13} color="var(--khaki-primary, #c49756)" style={{ transition: 'transform 0.2s', transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none' }} />
              </button>

              {/* Profile Dropdown Menu with Logout and Feedback (Requirement 3: Viewport Safe & Right-Side) */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 'min(240px, 86vw)',
                  maxWidth: 'calc(100vw - 16px)',
                  background: '#0c1527',
                  border: '1.5px solid var(--khaki-border, rgba(196, 151, 86, 0.4))',
                  borderRadius: '10px',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.85)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  zIndex: 10050,
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
