import React, { useState } from 'react';
import { X, Lock, Shield, User, KeyRound, Building, ArrowRight, AlertTriangle } from 'lucide-react';
import { captureFullDeviceTelemetry, checkDeviceChange } from '../utils/deviceTelemetry';
import { getStoredAdminDeviceLockConfig } from '../utils/storage';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess, 
  contacts, 
  coAdmins,
  onSuperBlockUser
}) {
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'co_admin' | 'admin'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCoAdminId, setSelectedCoAdminId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const idClean = identifier.trim().toLowerCase();
    const pwdClean = password.trim();

    if (!idClean || !pwdClean) {
      setErrorMsg('कृपया PNO/मोबाइल नंबर एवं पासवर्ड दर्ज करें।');
      return;
    }

    const matchedUser = contacts.find(c => 
      (c.pno && c.pno.toLowerCase() === idClean) ||
      (c.phone && c.phone.replace(/\D/g, '') === idClean.replace(/\D/g, '')) ||
      (c.email && c.email.toLowerCase() === idClean)
    );

    if (!matchedUser) {
      setErrorMsg('यह PNO/मोबाइल नंबर पंजीकृत नहीं है। कृपया सही विवरण भरें या पंजीकरण करें।');
      return;
    }

    // Strict Super Block check (Requirement 3 & 4)
    if (matchedUser.isSuperBlocked || matchedUser.status === 'super_blocked') {
      setErrorMsg('⛔ आपका खाता सुपर ब्लॉक (Super Blocked) है!\n\nअति कठोर सुरक्षा नियम: पंजीकृत डिवाइस/ब्राउज़र के अतिरिक्त अन्य डिवाइस पर लॉगिन प्रयास के कारण यह खाता ब्लॉक किया गया है।\n\nनिवारण: अपने जनपद के Co-Admin अथवा Super Admin से संपर्क कर अपनी पुरानी आईडी डिलीट करवाएं। पुराना डेटा सुरक्षित रूप से "रीसायकल बिन" में जाने के उपरांत ही आप नए डिवाइस पर नया पंजीकरण कर सकेंगे।');
      return;
    }

    if (matchedUser.status === 'blocked') {
      setErrorMsg('आपकी प्रोफ़ाइल/लॉगिन एडमिन द्वारा ब्लॉक कर दी गई है। कृपया नोडल अधिकारी से संपर्क करें।');
      return;
    }

    if (matchedUser.status === 'inactive') {
      setErrorMsg('यह कर्मचारी खाता वर्तमान में निष्क्रिय (Inactive) है। इसे सक्रिय करवाने हेतु कृपया एडमिन या ज़िला Co-Admin से संपर्क करें।');
      return;
    }

    if ((matchedUser.password || '1234') !== pwdClean) {
      setErrorMsg('गलत पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      return;
    }

    // Strict Device Verification (Requirement 3)
    let currentTelemetry = null;
    try {
      currentTelemetry = await captureFullDeviceTelemetry();
    } catch (e) {
      console.warn('Telemetry capture failed:', e);
    }

    if (matchedUser.registeredDevice && currentTelemetry) {
      const devChange = checkDeviceChange(matchedUser.registeredDevice, currentTelemetry);
      if (devChange.isChanged) {
        // Automatic Super Block on different device!
        const reasonsList = devChange.reasons && devChange.reasons.length > 0 ? devChange.reasons.join(', ') : 'अनाधिकृत डिवाइस/ब्राउज़र';
        const reasonDesc = `अनाधिकृत डिवाइस परिवर्तन: पंजीकृत (${matchedUser.registeredDevice.deviceName || 'मूल डिवाइस'}) से भिन्न (${currentTelemetry.deviceName || 'नया डिवाइस'}) पाया गया। ${reasonsList}`;
        
        const updatedUser = {
          ...matchedUser,
          isSuperBlocked: true,
          status: 'super_blocked',
          superBlockedAt: new Date().toISOString(),
          superBlockReason: reasonDesc,
          lastAttemptedDevice: currentTelemetry
        };

        if (typeof onSuperBlockUser === 'function') {
          onSuperBlockUser(matchedUser.id, updatedUser);
        }

        setErrorMsg(`⛔ अति कठोर सुरक्षा नियम (Super Blocked):\n\nरजिस्ट्रेशन करने वाले मोबाइल/ब्राउज़र के अतिरिक्त अन्य डिवाइस (${currentTelemetry.deviceName}) से लॉगिन का प्रयास किया गया है।\n\nकारण: ${reasonsList}\n\nयह खाता स्वतः SUPER BLOCKED कर दिया गया है!\n\nनिवारण:\nयूज़र को अपनी आईडी ज़िला Co-Admin अथवा Super Admin द्वारा डिलीट करवानी होगी। आपका पुराना डेटा सुरक्षित रूप से 'रीसायकल बिन' में चला जाएगा, जिसके उपरांत ही इस नए डिवाइस से आपका नया रजिस्ट्रेशन संभव हो सकेगा।`);
        return;
      }
    } else if (!matchedUser.registeredDevice && currentTelemetry) {
      // First time device binding if user registered before telemetry was introduced
      matchedUser.registeredDevice = currentTelemetry;
      matchedUser.currentDevice = currentTelemetry;
      if (typeof onSuperBlockUser === 'function') {
        onSuperBlockUser(matchedUser.id, matchedUser);
      }
    }

    // Auto-detect Co-Admin role if user is an authorized district Co-Admin
    const activeCoAdminList = Array.isArray(coAdmins) && coAdmins.length > 0 ? coAdmins : [];
    const matchedCoAdmin = activeCoAdminList.find(ca => 
      (ca.userId && ca.userId === matchedUser.id) ||
      (ca.phone && matchedUser.phone && ca.phone.replace(/\D/g, '') === matchedUser.phone.replace(/\D/g, '')) ||
      (ca.username && matchedUser.pno && (ca.username.toLowerCase() === matchedUser.pno.toLowerCase() || ca.username.toLowerCase() === `co_${matchedUser.pno.toLowerCase()}`)) ||
      (ca.name && matchedUser.name && ca.name.toLowerCase().includes(matchedUser.name.toLowerCase().trim()))
    );

    const isAssignedCoAdmin = Boolean(
      matchedUser.isCoAdmin || 
      matchedUser.role === 'co_admin' || 
      (matchedCoAdmin && matchedCoAdmin.status !== 'inactive' && matchedCoAdmin.status !== 'blocked')
    );

    if (isAssignedCoAdmin) {
      onLoginSuccess({
        ...matchedUser,
        role: 'co_admin',
        district: matchedCoAdmin?.district || matchedUser.district,
        isCoAdmin: true
      });
      onClose();
      return;
    }

    onLoginSuccess({
      ...matchedUser,
      role: 'user'
    });
    onClose();
  };

  const handleCoAdminLogin = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const targetCoAdmin = coAdmins.find(c => c.id === selectedCoAdminId || c.username === identifier.trim().toLowerCase());

    if (!targetCoAdmin) {
      setErrorMsg('कृपया सूची में से अपना ज़िला / Co-Admin चुनें।');
      return;
    }

    if (targetCoAdmin.status === 'inactive') {
      setErrorMsg('यह Co-Admin खाता Super Admin द्वारा निष्क्रिय (Inactive) कर दिया गया है। सक्रियता हेतु मुख्यालय से संपर्क करें।');
      return;
    }

    // Check if linked user is super-blocked
    const matchedOfficer = contacts.find(c => 
      c.id === targetCoAdmin.userId ||
      (c.phone && targetCoAdmin.phone && c.phone.replace(/\D/g, '') === targetCoAdmin.phone.replace(/\D/g, ''))
    );
    if (matchedOfficer && (matchedOfficer.isSuperBlocked || matchedOfficer.status === 'super_blocked')) {
      setErrorMsg('⛔ यह Co-Admin खाता सुपर ब्लॉक (Super Blocked) है! डिवाइस परिवर्तन सुरक्षा उल्लंघन के कारण लॉगिन प्रतिबंधित है। Super Admin से संपर्क करें।');
      return;
    }

    if ((targetCoAdmin.password || '1234') !== password.trim()) {
      setErrorMsg('गलत Co-Admin पासवर्ड! कृपया सही पासवर्ड दर्ज करें।');
      return;
    }

    onLoginSuccess({
      role: 'co_admin',
      ...targetCoAdmin
    });
    onClose();
  };

  const handleSuperAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.trim() === '1234' || password.trim() === 'admin') {
      // Check Super Admin Device Security Lock (Requirement 6)
      try {
        const lockConfig = getStoredAdminDeviceLockConfig();
        if (lockConfig && lockConfig.lockEnabled) {
          const currentTelemetry = await captureFullDeviceTelemetry();
          const curSig = (currentTelemetry?.signature || '').toLowerCase();
          const authSigs = Array.isArray(lockConfig.authorizedSignatures) 
            ? lockConfig.authorizedSignatures.map(s => (s || '').toLowerCase()) 
            : [];
          
          if (!authSigs.includes(curSig)) {
            setErrorMsg('🔒 सुपर एडमिन डिवाइस सुरक्षा लॉक सक्रिय है!\n\nयह मोबाइल/ब्राउज़र Super Admin लॉगिन हेतु अधिकृत नहीं है (अनाधिकृत डिवाइस)।\n\nकेवल पूर्व-अधिकृत डिवाइस से ही Super Admin कंट्रोल मेनू खोला जा सकता है। अधिकृत डिवाइस के कंट्रोल मेनू में जाकर इस नए डिवाइस को अधिकृत करें अथवा डिवाइस लॉक हटाएं।');
            return;
          }
        }
      } catch (err) {
        console.warn('Super admin device check note:', err);
      }

      onLoginSuccess({
        role: 'admin',
        name: 'मुख्यालय पुलिस महानिदेशक (Super Admin)',
        district: 'सभी ज़िले (All Districts)',
        id: 'super-admin'
      });
      onClose();
    } else {
      setErrorMsg('गलत Admin PIN! कृपया सही PIN दर्ज करें।');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '480px', padding: '1.25rem' }}
      >
        <div className="modal-header" style={{ paddingBottom: '0.65rem' }}>
          <div className="modal-title" style={{ fontSize: '1.1rem' }}>
            <Lock size={18} color="var(--khaki-primary, #c49756)" />
            <span>उत्तर प्रदेश पुलिस पोर्टल लॉगिन</span>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tab Selection */}
        <div className="admin-tabs" style={{ justifyContent: 'center', gap: '0.35rem' }}>
          <button 
            className={`admin-tab ${activeTab === 'user' ? 'active' : ''}`}
            onClick={() => { setActiveTab('user'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <User size={14} />
            कर्मचारी लॉगिन
          </button>

          <button 
            className={`admin-tab ${activeTab === 'co_admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('co_admin'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Building size={14} />
            ज़िला Co-Admin
          </button>

          <button 
            className={`admin-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.82rem' }}
          >
            <Shield size={14} />
            Super Admin
          </button>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid var(--danger-red, #ef4444)', color: '#fca5a5', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem' }}>
            {errorMsg}
          </div>
        )}

        {/* TAB 1: EMPLOYEE LOGIN */}
        {activeTab === 'user' && (
          <form onSubmit={handleUserLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">PNO नंबर या मोबाइल नंबर</label>
              <input
                type="text"
                className="form-input"
                placeholder="PNO नंबर या मोबाइल नंबर दर्ज करें"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">पासवर्ड</label>
              <input
                type="password"
                className="form-input"
                placeholder="पासवर्ड दर्ज करें"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <ArrowRight size={15} />
              कर्मचारी लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 2: CO-ADMIN LOGIN */}
        {activeTab === 'co_admin' && (
          <form onSubmit={handleCoAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="form-group">
              <label className="form-label">ज़िला नोडल अधिकारी चुनें</label>
              <select
                className="form-select"
                value={selectedCoAdminId}
                onChange={e => setSelectedCoAdminId(e.target.value)}
                required
              >
                <option value="">-- अपना ज़िला Co-Admin चुनें --</option>
                {coAdmins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.district} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Co-Admin पासवर्ड</label>
              <input
                type="password"
                className="form-input"
                placeholder="पासवर्ड दर्ज करें"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <Shield size={15} />
              ज़िला Co-Admin लॉगिन करें
            </button>
          </form>
        )}

        {/* TAB 3: SUPER ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSuperAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '0.65rem', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--khaki-light)' }}>
              👑 <strong>Super Admin Access:</strong> पूरे राज्य के सभी ज़िलों, कार्मिकों, Co-Admins एवं सेटिंग्स का पूर्ण प्रशासनिक नियंत्रण।
            </div>

            <div className="form-group">
              <label className="form-label">Master Admin PIN</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.2rem' }}>
              <KeyRound size={15} />
              Super Admin लॉगिन
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
