import React from 'react';
import { 
  Shield, UserPlus, Lock, RefreshCw, Bell, MessageSquare, 
  User, LogOut, CheckCircle, Clock, KeyRound, Cloud, Menu
} from 'lucide-react';

export default function Header({ 
  currentUser, 
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
  onOpenMenu
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const isUser = currentUser?.role === 'user';
  const isLoggedIn = Boolean(currentUser);

  const totalBadges = (chatsCount || 0) + (notifCount || 0) + (pendingCount || 0);

  return (
    <header className="header-card" style={{ padding: '0.75rem 1rem' }}>
      {/* Main Brand Section */}
      <div className="header-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="police-badge-icon" style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
            border: '2px solid var(--khaki-primary, #c49756)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            flexShrink: 0
          }}>
            <Shield size={24} color="var(--khaki-primary, #c49756)" />
          </div>
          <div className="brand-titles">
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              उत्तर प्रदेश पुलिस निर्देशिका
              <span className="dept-tag" style={{
                fontSize: '0.68rem',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(196,151,86,0.2)',
                color: 'var(--khaki-light, #dfb97e)',
                border: '1px solid var(--khaki-primary, #c49756)',
                fontWeight: 700
              }}>
                आधिकारिक पोर्टल
              </span>
            </h1>
            <p className="brand-subtitle" style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
              उत्तर प्रदेश शासन • अधिकृत विभागीय सुरक्षित दूरभाष निर्देशिका
            </p>
          </div>
        </div>

        {/* Header Right Action Area */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
          
          {/* User Status / Role Pill */}
          {isLoggedIn ? (
            <div 
              onClick={onOpenMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--khaki-border, rgba(196,151,86,0.3))',
                padding: '4px 10px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              title="मेनु खोलने हेतु क्लिक करें"
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

          {/* Direct Admin Control Button for Admin & Co-Admin */}
          {(isAdmin || isCoAdmin) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenAdmin}
              title="प्रशासकीय नियंत्रण कक्ष (Admin Control Portal)"
              style={{
                background: 'linear-gradient(135deg, #c49756, #8e6833)',
                color: '#081022',
                fontWeight: 800,
                border: 'none',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px'
              }}
            >
              <Shield size={14} />
              <span>कंट्रोल</span>
              {pendingCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '1px 6px',
                  fontSize: '0.65rem',
                  fontWeight: 900
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          {/* MAIN MODAL MENU TOGGLE BUTTON (☰ मेनु) */}
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onOpenMenu}
            title="मुख्य नियंत्रण एवं नेविगेशन मेनु खोलें"
            style={{ 
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(30, 58, 138, 0.4), rgba(15, 23, 42, 0.6))',
              border: '1px solid var(--khaki-primary, #c49756)',
              color: 'var(--khaki-light, #dfb97e)',
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '8px'
            }}
          >
            <Menu size={16} color="var(--khaki-primary, #c49756)" />
            <span>मेनु (Menu)</span>
            {totalBadges > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 900,
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
              }}>
                {totalBadges}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
