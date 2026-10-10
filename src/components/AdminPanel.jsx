import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Lock, Unlock, FileSpreadsheet, Download, Upload, CheckCircle, 
  XCircle, Edit3, Trash2, Clock, Users, Shield, KeyRound, Plus, 
  ShieldCheck, Settings, Power, UserCheck, Award, Building2, MapPin,
  FileText, PhoneCall, HardDrive, Eye, RefreshCw, Globe, Cloud, Database, AlertTriangle, Home
} from 'lucide-react';
import { 
  downloadSampleExcel, importContactsFromExcel, DEFAULT_TERMS,
  getStoredCallLogs, clearCallLogs, getStoredBackups, createBackupSlot,
  restoreBackupSlot, getStored2FAConfig, save2FAConfig,
  getStoredPhonePermissions, respondPhonePermission,
  getStoredAdminMasterPin, saveAdminMasterPin,
  getStoredPolicies, DEFAULT_POLICIES, addCustomPolicy,
  editPolicyItem, deleteCustomPolicyItem
} from '../utils/storage';
import { syncAllContactsToFirestore } from '../utils/firebase';
import { validateFileSize } from '../utils/imageCompressor';

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  contacts = [], 
  currentUser = null,
  coAdmins = [],
  posts = [],
  offices = [],
  districts = [],
  terms = null,
  onSaveTerms,
  policies = [],
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy,
  onSavePolicies,
  onApprove,
  onReject,
  onEditContact,
  onToggleBlock,
  onToggleUserActive,
  onDeleteContact,
  onContactsImported,
  onResetPassword,
  onAddCoAdmin,
  onDeleteCoAdmin,
  onToggleCoAdminActive,
  onPromoteUserToCoAdmin,
  onRevokeCoAdmin,
  onAddPost,
  onEditPost,
  onDeletePost,
  onAddOffice,
  onEditOffice,
  onDeleteOffice,
  onAddDistrict,
  onEditDistrict,
  onDeleteDistrict,
  onLoadAllDistricts,
  onLoadStandardPosts,
  onResetMasterData,
  onForwardDistrictTransfer,
  onApproveDistrictTransfer,
  onRejectDistrictTransfer,
  isFirebaseConnected = false,
  onOpenFirebaseSetup
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const myDistrict = isCoAdmin ? currentUser.district : null;

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'manage' | 'transfers' | 'excel' | 'coadmins' | 'master' | 'coadmin_offices' | 'terms' | 'call_logs' | 'backups' | 'phone_perms' | '2fa_settings'
  const [masterSubTab, setMasterSubTab] = useState('posts'); // 'posts' | 'offices' | 'districts'
  const [adminStatusFilter, setAdminStatusFilter] = useState('active'); // 'active' | 'all' | 'inactive' | 'blocked'
  
  // Master data edit state
  const [editingPost, setEditingPost] = useState(null); // { oldName, newName }
  const [editingDistrict, setEditingDistrict] = useState(null); // { oldName, newName }
  const [editingOffice, setEditingOffice] = useState(null); // { id, oldName, newName, district }

  // Office management inputs
  const [officeFilterDistrict, setOfficeFilterDistrict] = useState('सभी ज़िले');
  const [newOfficeDistrict, setNewOfficeDistrict] = useState((districts && districts[1]) || '');
  const [coAdminNewOfficeName, setCoAdminNewOfficeName] = useState('');

  // Call Logs state
  const [callLogs, setCallLogs] = useState([]);
  const [callLogSearch, setCallLogSearch] = useState('');

  // Backups state
  const [backups, setBackups] = useState([]);
  const [backupNotice, setBackupNotice] = useState('');

  // 2FA state
  const [twoFactorConfig, setTwoFactorConfig] = useState({ enabled: true, secretPin: '998877' });
  const [pinChangeInput, setPinChangeInput] = useState('');
  const [twoFaMsg, setTwoFaMsg] = useState('');

  // Super Admin Master Login PIN state
  const [currentMasterPin, setCurrentMasterPin] = useState('1234');
  const [newMasterPinInput, setNewMasterPinInput] = useState('');
  const [confirmMasterPinInput, setConfirmMasterPinInput] = useState('');
  const [masterPinMsg, setMasterPinMsg] = useState('');

  // Phone Permissions state
  const [phonePermissions, setPhonePermissions] = useState([]);

  // Excel upload states
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [manualSyncMsg, setManualSyncMsg] = useState('');
  const fileInputRef = useRef(null);

  // Search inside admin table
  const [adminSearch, setAdminSearch] = useState('');

  // Password reset prompt state
  const [resetPromptUser, setResetPromptUser] = useState(null);
  const [newPassInput, setNewPassInput] = useState('1234');
  const [resetSuccessNotice, setResetSuccessNotice] = useState('');

  // Add new Co-Admin form (Super Admin only)
  const [newCoAdminForm, setNewCoAdminForm] = useState({
    name: '',
    username: '',
    district: (districts && districts[1]) || '',
    phone: '',
    password: '1234'
  });
  const [showAddCoAdminModal, setShowAddCoAdminModal] = useState(false);

  // Promote existing user to Co-Admin modal state
  const [selectedUserIdToPromote, setSelectedUserIdToPromote] = useState('');
  const [promoteDistrict, setPromoteDistrict] = useState((districts && districts[1]) || '');

  // Master Data Inputs
  const [newPostInput, setNewPostInput] = useState('');
  const [newOfficeInput, setNewOfficeInput] = useState('');
  const [newDistrictInput, setNewDistrictInput] = useState('');

  // Terms & Conditions editing state
  const [editableTerms, setEditableTerms] = useState(terms || DEFAULT_TERMS);
  const [termsSavedMsg, setTermsSavedMsg] = useState('');
  const [newRuleInput, setNewRuleInput] = useState('');

  // Dynamic Policy & Custom Links CMS State
  const [policiesList, setPoliciesList] = useState(policies || getStoredPolicies());
  const [editingPolicyItem, setEditingPolicyItem] = useState(null); // { id, title, hindiTitle, content }
  const [isAddingNewPolicy, setIsAddingNewPolicy] = useState(false);
  const [newPolicyForm, setNewPolicyForm] = useState({ title: '', hindiTitle: '', content: '' });
  const [policyNotice, setPolicyNotice] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCallLogs(getStoredCallLogs());
      setBackups(getStoredBackups());
      const cfg = getStored2FAConfig();
      setTwoFactorConfig(cfg);
      setPinChangeInput(cfg.secretPin || '998877');
      setPhonePermissions(getStoredPhonePermissions());
      setCurrentMasterPin(getStoredAdminMasterPin());
      if (policies && policies.length > 0) {
        setPoliciesList(policies);
      } else {
        setPoliciesList(getStoredPolicies());
      }
    }
  }, [isOpen, policies]);

  const handleAddNewPolicySubmit = (e) => {
    e.preventDefault();
    if (!newPolicyForm.title.trim() || !newPolicyForm.content.trim()) return;

    if (onAddPolicy) {
      onAddPolicy(newPolicyForm);
    } else {
      const updated = addCustomPolicy(newPolicyForm);
      setPoliciesList(updated);
    }
    setNewPolicyForm({ title: '', hindiTitle: '', content: '' });
    setIsAddingNewPolicy(false);
    setPolicyNotice('✅ नया नीति लिंक एवं सामग्री सफलतापूर्वक जोड़ी गई!');
    setTimeout(() => setPolicyNotice(''), 3000);
  };

  const handleSaveEditPolicySubmit = (e) => {
    e.preventDefault();
    if (!editingPolicyItem || !editingPolicyItem.title.trim()) return;

    if (onEditPolicy) {
      onEditPolicy(editingPolicyItem.id, editingPolicyItem);
    } else {
      const updated = editPolicyItem(editingPolicyItem.id, editingPolicyItem);
      setPoliciesList(updated);
    }
    setEditingPolicyItem(null);
    setPolicyNotice('✅ नीति / लिंक सामग्री सफलतापूर्वक अद्यतन हुई!');
    setTimeout(() => setPolicyNotice(''), 3000);
  };

  const handleDeletePolicyClick = (policyId, policyTitle) => {
    if (window.confirm(`क्या आप कस्टम लिंक "${policyTitle}" को हटाना चाहते हैं?`)) {
      if (onDeletePolicy) {
        onDeletePolicy(policyId);
      } else {
        const updated = deleteCustomPolicyItem(policyId);
        setPoliciesList(updated);
      }
      setPolicyNotice('🗑️ कस्टम लिंक हटा दिया गया।');
      setTimeout(() => setPolicyNotice(''), 3000);
    }
  };

  useEffect(() => {
    if (terms) {
      setEditableTerms(terms);
    }
  }, [terms]);

  const handleRuleChange = (index, value) => {
    const updatedRules = [...(editableTerms.rules || [])];
    updatedRules[index] = value;
    setEditableTerms(prev => ({ ...prev, rules: updatedRules }));
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    const trimmed = newRuleInput.trim();
    if (trimmed) {
      setEditableTerms(prev => ({
        ...prev,
        rules: [...(prev.rules || []), trimmed]
      }));
      setNewRuleInput('');
    }
  };

  const handleRemoveRule = (index) => {
    setEditableTerms(prev => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index)
    }));
  };

  const handleSaveTermsSubmit = (e) => {
    e.preventDefault();
    if (onSaveTerms) {
      onSaveTerms(editableTerms);
      setTermsSavedMsg('✅ शासकीय नियम व शर्तें सफलतापूर्वक अद्यतन (Save) की गईं!');
      setTimeout(() => setTermsSavedMsg(''), 4000);
    }
  };

  const handleResetDefaultTerms = () => {
    if (window.confirm('क्या आप डिफ़ॉल्ट शासकीय नियम व शर्तें पुनर्स्थापित करना चाहते हैं?')) {
      setEditableTerms(DEFAULT_TERMS);
      if (onSaveTerms) {
        onSaveTerms(DEFAULT_TERMS);
        setTermsSavedMsg('✅ डिफ़ॉल्ट नियम व शर्तें पुनर्स्थापित की गईं!');
        setTimeout(() => setTermsSavedMsg(''), 4000);
      }
    }
  };

  if (!isOpen) return null;

  // Safe arrays protecting against null/undefined in all datasets
  const safeContacts = Array.isArray(contacts) ? contacts.filter(c => c && typeof c === 'object') : [];
  const safeCoAdmins = Array.isArray(coAdmins) ? coAdmins.filter(ca => ca && typeof ca === 'object') : [];
  const safeDistricts = Array.isArray(districts) ? districts : [];
  const safePosts = Array.isArray(posts) ? posts : [];
  const safeOffices = Array.isArray(offices) ? offices : [];
  const safePolicies = Array.isArray(policiesList) ? policiesList : [];
  const safeBackups = Array.isArray(backups) ? backups : [];
  const safeCallLogs = Array.isArray(callLogs) ? callLogs : [];
  const safePhonePermissions = Array.isArray(phonePermissions) ? phonePermissions : [];

  const scopedContacts = isCoAdmin 
    ? safeContacts.filter(c => c.district === myDistrict)
    : safeContacts;

  const pendingList = scopedContacts.filter(c => c && c.status === 'pending');
  const approvedList = scopedContacts.filter(c => c && (c.status === 'approved' || c.status === 'active'));
  const inactiveList = scopedContacts.filter(c => c && c.status === 'inactive');
  const blockedList = scopedContacts.filter(c => c && c.status === 'blocked');

  // Pending District Transfer requests (Two-tier approval workflow)
  const transferList = isCoAdmin
    ? scopedContacts.filter(c => c && c.districtTransfer && c.districtTransfer.status === 'pending_coadmin')
    : safeContacts.filter(c => c && c.districtTransfer && (c.districtTransfer.status === 'pending_admin' || c.districtTransfer.status === 'pending_coadmin'));

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const check = validateFileSize(file, 'excel');
      if (!check.valid) {
        alert(check.error);
        if (e.target) e.target.value = '';
        return;
      }
      setExcelFile(file);
      setImportStatusMsg(null);
    }
  };

  const handleProcessExcel = async () => {
    if (!excelFile) return;
    setIsUploading(true);
    setImportStatusMsg(null);
    setShowSkippedDetails(false);
    setImportProgress({
      step: 1,
      percent: 10,
      title: 'प्रारंभ हो रहा है...',
      message: 'एक्सेल फ़ाइल लोड की जा रही है...',
      totalRows: 0,
      processedCount: 0,
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0
    });

    try {
      const res = await importContactsFromExcel(
        excelFile, 
        contacts, 
        myDistrict,
        (progressUpdate) => {
          setImportProgress(prev => ({
            ...prev,
            ...progressUpdate
          }));
        }
      );

      if (onContactsImported) {
        await onContactsImported(res.updatedContacts);
      }

      setImportProgress({
        step: 6,
        percent: 100,
        title: res.isCloudSynced ? 'सफलतापूर्वक पूर्ण!' : 'लोकल सुरक्षित (क्लाउड सिंक लंबित)',
        message: `सफलतापूर्वक निष्पादित! कुल ${res.totalProcessed} पंक्तियाँ प्रोसेस हुईं (नए: ${res.addedCount}, अपडेट: ${res.updatedCount})।`,
        isCompleted: true,
        report: res
      });

      if (res.isCloudSynced) {
        setImportStatusMsg({
          type: 'success',
          text: `✅ एक्सेल डेटा (${res.addedCount} नए, ${res.updatedCount} अपडेट) स्थानीय डेटाबेस एवं Cloudflare R2 क्लाउड पर लाइव सिंक हो गया है!`
        });
      } else {
        setImportStatusMsg({
          type: 'warning',
          text: `⚠️ डेटा स्थानीय डेटाबेस में सुरक्षित हो गया है, लेकिन Cloudflare R2 क्लाउड सिंक लंबित है (${res.cloudErrorNotice || 'नेटवर्क / अनुमति'})। नीचे दिए गए "क्लाउड पर तुरंत सिंक करें" बटन से सिंक कर सकते हैं।`
        });
      }
      setExcelFile(null);
    } catch (err) {
      console.error('Excel Import Error:', err);
      setImportProgress(null);
      setImportStatusMsg({
        type: 'error',
        text: err.message || 'एक्सेल फ़ाइल लोड करने में समस्या आई।'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleForceSyncFirebase = async () => {
    setIsManualSyncing(true);
    setManualSyncMsg('🔄 Cloudflare R2 क्लाउड पर डेटा अपलोड हो रहा है...');
    try {
      const syncOk = await syncAllContactsToFirestore(contacts, (chunkInfo) => {
        setManualSyncMsg(`🔄 क्लाउड अपलोड: ${chunkInfo.syncedCount} / ${chunkInfo.totalCount} रिकॉर्ड्स (${chunkInfo.percent}%)...`);
      });
      if (syncOk) {
        setManualSyncMsg(`✅ सफलता! कुल ${contacts.length} संपर्क Cloudflare R2 क्लाउड पर सफलतापूर्वक सिंक हो गए हैं।`);
      } else {
        setManualSyncMsg('⚠️ सिंक पूर्ण नहीं हो सका। कृपया नेटवर्क कनेक्शन चेक करें।');
      }
    } catch (err) {
      setManualSyncMsg(`❌ सिंक त्रुटि: ${err.message || 'Cloudflare R2 से कनेक्ट करने में असमर्थ'}`);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    if (!resetPromptUser) return;
    onResetPassword(resetPromptUser.id, newPassInput.trim() || '1234');
    setResetSuccessNotice(`${resetPromptUser.name} का पासवर्ड सफलतापूर्वक रीसेट (Default: ${newPassInput.trim() || '1234'}) कर दिया गया!`);
    setTimeout(() => {
      setResetPromptUser(null);
      setResetSuccessNotice('');
      setNewPassInput('1234');
    }, 2000);
  };

  const handleCreateCoAdmin = (e) => {
    e.preventDefault();
    if (!newCoAdminForm.name || !newCoAdminForm.username) return;
    onAddCoAdmin(newCoAdminForm);
    setShowAddCoAdminModal(false);
    setNewCoAdminForm({
      name: '',
      username: '',
      district: (districts && districts[1]) || '',
      phone: '',
      password: '1234'
    });
  };

  const handlePromoteExistingUser = (e) => {
    e.preventDefault();
    if (!selectedUserIdToPromote) return;
    onPromoteUserToCoAdmin(selectedUserIdToPromote, promoteDistrict);
    setSelectedUserIdToPromote('');
  };

  // Master Data Add Handlers
  const handleAddNewPost = (e) => {
    e.preventDefault();
    if (!newPostInput.trim()) return;
    onAddPost(newPostInput.trim());
    setNewPostInput('');
  };

  const handleAddNewOffice = (e) => {
    e.preventDefault();
    if (!newOfficeInput.trim()) return;
    onAddOffice(newOfficeInput.trim(), newOfficeDistrict);
    setNewOfficeInput('');
  };

  const handleCoAdminAddOffice = (e) => {
    e.preventDefault();
    if (!coAdminNewOfficeName.trim()) return;
    onAddOffice(coAdminNewOfficeName.trim(), myDistrict);
    setCoAdminNewOfficeName('');
  };

  const handleAddNewDistrict = (e) => {
    e.preventDefault();
    if (!newDistrictInput.trim()) return;
    onAddDistrict(newDistrictInput.trim());
    setNewDistrictInput('');
  };

  const handleSaveEditPost = (e) => {
    e.preventDefault();
    if (!editingPost || !editingPost.newName.trim()) return;
    if (onEditPost) {
      onEditPost(editingPost.oldName, editingPost.newName.trim());
    }
    setEditingPost(null);
  };

  const handleSaveEditDistrict = (e) => {
    e.preventDefault();
    if (!editingDistrict || !editingDistrict.newName.trim()) return;
    if (onEditDistrict) {
      onEditDistrict(editingDistrict.oldName, editingDistrict.newName.trim());
    }
    setEditingDistrict(null);
  };

  const handleSaveEditOffice = (e) => {
    e.preventDefault();
    if (!editingOffice || !editingOffice.newName.trim()) return;
    if (onEditOffice) {
      onEditOffice(editingOffice.id, editingOffice.newName.trim(), editingOffice.district);
    }
    setEditingOffice(null);
  };

  const filteredAdminContacts = scopedContacts.filter(c => {
    if (!c) return false;
    // Status filter segmentation (active, all, inactive, blocked)
    if (adminStatusFilter === 'active') {
      const isActive = c.status === 'approved' || c.status === 'active';
      if (!isActive) return false;
    } else if (adminStatusFilter === 'inactive') {
      if (c.status !== 'inactive') return false;
    } else if (adminStatusFilter === 'blocked') {
      if (c.status !== 'blocked') return false;
    }

    if (!adminSearch) return true;
    const q = adminSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.pno || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.district || '').toLowerCase().includes(q) ||
      (c.office || '').toLowerCase().includes(q) ||
      (c.post || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 100000 }} onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '980px', zIndex: 100001 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="police-badge-icon" style={{ width: '40px', height: '40px' }}>
              <Shield size={22} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>
                {isAdmin ? '👑 Super Admin कंट्रोल पोर्टल' : `🛡️ ज़िला Co-Admin पोर्टल (${myDistrict})`}
              </h2>
              <div style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', fontWeight: 600 }}>
                लॉगिन: {currentUser?.name || 'Admin'} {isCoAdmin && `• अधिकार क्षेत्र: केवल ${myDistrict} ज़िला`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(196,151,86,0.3)',
                color: 'var(--khaki-light, #dfb97e)',
                padding: '5px 10px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="होम स्क्रीन पर वापस जाएं (Home Tab)"
            >
              <Home size={15} color="var(--khaki-primary)" />
              <span>होम (Home)</span>
            </button>
            <button className="close-btn" onClick={onClose} title="बंद करें">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="admin-dashboard">
          {/* Tabs Bar */}
          <div className="admin-tabs">
            <button 
              className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <Clock size={16} />
              लंबित अप्रूवल (Pending)
              {pendingList.length > 0 && (
                <span className="tab-badge">{pendingList.length}</span>
              )}
            </button>

            <button 
              className={`admin-tab ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              <Users size={16} />
              यूज़र्स प्रबंधन ({scopedContacts.length})
            </button>

            <button 
              className={`admin-tab ${activeTab === 'transfers' ? 'active' : ''}`}
              onClick={() => setActiveTab('transfers')}
            >
              <MapPin size={16} />
              जनपद स्थानांतरण
              {transferList.length > 0 && (
                <span className="tab-badge" style={{ background: '#f59e0b', color: '#000', fontWeight: 800 }}>
                  {transferList.length}
                </span>
              )}
            </button>

            <button 
              className={`admin-tab ${activeTab === 'excel' ? 'active' : ''}`}
              onClick={() => setActiveTab('excel')}
            >
              <FileSpreadsheet size={16} />
              एक्सेल बल्क अपडेट {isCoAdmin && `(${myDistrict})`}
            </button>

            {isAdmin && (
              <>
                <button 
                  className={`admin-tab ${activeTab === 'coadmins' ? 'active' : ''}`}
                  onClick={() => setActiveTab('coadmins')}
                >
                  <ShieldCheck size={16} />
                  Co-Admin प्रबंधन ({Array.isArray(coAdmins) ? coAdmins.length : 0})
                </button>

                <button 
                  className={`admin-tab ${activeTab === 'master' ? 'active' : ''}`}
                  onClick={() => setActiveTab('master')}
                >
                  <Settings size={16} />
                  मास्टर सेटिंग्स (पद, ज़िला व थाना)
                </button>
              </>
            )}

            {isCoAdmin && (
              <button 
                className={`admin-tab ${activeTab === 'coadmin_offices' ? 'active' : ''}`}
                onClick={() => setActiveTab('coadmin_offices')}
              >
                <Building2 size={16} />
                थाना / शाखा प्रबंधन ({myDistrict || 'ज़िला'})
              </button>
            )}

            <button 
              className={`admin-tab ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => setActiveTab('terms')}
            >
              <Globe size={16} />
              नीतियां व कस्टम लिंक्स ({Array.isArray(policiesList) ? policiesList.length : 0})
            </button>

            <button 
              className={`admin-tab ${activeTab === 'call_logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('call_logs')}
            >
              <PhoneCall size={16} />
              कॉल लॉग्स ({Array.isArray(callLogs) ? callLogs.length : 0})
            </button>

            <button 
              className={`admin-tab ${activeTab === 'backups' ? 'active' : ''}`}
              onClick={() => setActiveTab('backups')}
            >
              <HardDrive size={16} />
              6-घंटे ऑटो बैकअप ({Array.isArray(backups) ? backups.length : 0}/5)
            </button>

            <button 
              className={`admin-tab ${activeTab === 'phone_perms' ? 'active' : ''}`}
              onClick={() => setActiveTab('phone_perms')}
            >
              <Eye size={16} />
              नंबर अनुमति ({Array.isArray(phonePermissions) ? phonePermissions.filter(p => p && p.status === 'pending').length : 0})
            </button>

            {isAdmin && (
              <>
                <button 
                  className={`admin-tab ${activeTab === '2fa_settings' ? 'active' : ''}`}
                  onClick={() => setActiveTab('2fa_settings')}
                >
                  <KeyRound size={16} />
                  मास्टर सुरक्षा & पिन
                </button>

                <button 
                  className={`admin-tab ${activeTab === 'cloud_chat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cloud_chat')}
                >
                  <Cloud size={16} />
                  क्लाउड लाइव चैट (Firebase)
                  {isFirebaseConnected && (
                    <span className="tab-badge" style={{ background: '#10b981', color: '#fff', fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px' }}>
                      सक्रिय
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* TAB 1: PENDING APPROVALS */}
          {activeTab === 'pending' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: isCoAdmin ? 'rgba(30,58,138,0.25)' : 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.85rem', color: '#fcd34d' }}>
                {isCoAdmin ? (
                  <span>
                    🛡️ <strong>Co-Admin अधिकार:</strong> आप केवल अपने तैनात ज़िले <strong>({myDistrict})</strong> के नए पंजीकरण एवं प्रोफ़ाइल अपडेट को स्वीकृत (Approve) या अस्वीकृत कर सकते हैं।
                  </span>
                ) : (
                  <span>
                    👑 <strong>Super Admin अधिकार:</strong> राज्य के समस्त ज़िलों के नए कर्मचारियों के स्व-पंजीकरण यहाँ समीक्षा एवं अनुमोदन हेतु प्रदर्शित हैं।
                  </span>
                )}
              </div>

              {pendingList.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <CheckCircle size={40} color="var(--success-emerald)" />
                  <p>{isCoAdmin ? `${myDistrict} ज़िले में कोई लंबित अनुमोदन नहीं है।` : 'वर्तमान में कोई लंबित अनुमोदन नहीं है।'}</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {pendingList.map(item => (
                    <div 
                      key={item.id}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <span className="status-tag status-pending">पेंडिंग (Pending)</span>
                          <h4 style={{ fontSize: '1.05rem', color: 'var(--text-bright)', fontWeight: 700, marginTop: '4px' }}>
                            {item.name} <span style={{ fontSize: '0.8rem', color: 'var(--gold-primary)' }}>({item.pno})</span>
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {item.post} • ज़िला: <strong style={{ color: 'var(--gold-light)' }}>{item.district}</strong> • थाना/कार्यालय: <strong>{item.office}</strong>
                          </p>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                            📞 {item.phone}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            आवेदन: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('hi-IN') : 'हाल ही में'}
                          </span>
                        </div>
                      </div>

                      {item.registrationNotes && (
                        <div style={{ fontSize: '0.82rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 0.75rem', borderRadius: '6px', color: 'var(--text-primary)' }}>
                          📝 टिप्पणी: {item.registrationNotes}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.65rem' }}>
                        <button 
                          className="btn btn-danger"
                          onClick={() => onReject(item.id)}
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
                        >
                          <XCircle size={15} />
                          अस्वीकार (Reject)
                        </button>

                        <button 
                          className="btn btn-success"
                          onClick={() => onApprove(item.id)}
                          style={{ padding: '0.4rem 1rem', fontSize: '0.82rem' }}
                        >
                          <CheckCircle size={15} />
                          स्वीकृत करें (Approve)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANAGE USERS, ACTIVE/INACTIVE & PROMOTION */}
          {activeTab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="यूज़र्स में खोजें (नाम, पीएनओ, थाना, फोन)..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  style={{ maxWidth: '360px' }}
                />

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  कुल: <strong style={{ color: 'var(--text-bright)' }}>{scopedContacts.length}</strong> | 
                  सक्रिय: <strong style={{ color: 'var(--success-emerald)' }}>{approvedList.length}</strong> | 
                  निष्क्रिय: <strong style={{ color: 'var(--text-dim)' }}>{inactiveList.length}</strong> | 
                  ब्लॉक: <strong style={{ color: 'var(--danger-red)' }}>{blockedList.length}</strong>
                </div>
              </div>

              {/* Status Segmentation Filters */}
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>स्थिति फ़िल्टर:</span>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter('active')}
                  className={`btn ${adminStatusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '0.74rem' }}
                >
                  🟢 सक्रिय (Active) ({approvedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter('all')}
                  className={`btn ${adminStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '0.74rem' }}
                >
                  📋 सभी (All) ({scopedContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter('inactive')}
                  className={`btn ${adminStatusFilter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '0.74rem' }}
                >
                  ⚪ निष्क्रिय (Inactive) ({inactiveList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminStatusFilter('blocked')}
                  className={`btn ${adminStatusFilter === 'blocked' ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ padding: '3px 9px', fontSize: '0.74rem', borderColor: adminStatusFilter === 'blocked' ? '#ef4444' : undefined }}
                >
                  🔴 ब्लॉक्ड (Blocked) ({blockedList.length})
                </button>
              </div>

              {resetSuccessNotice && (
                <div className="status-tag status-approved" style={{ padding: '0.75rem', width: '100%', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} />
                  {resetSuccessNotice}
                </div>
              )}

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>PNO</th>
                      <th>कर्मचारी का नाम</th>
                      <th>पद (Post)</th>
                      <th>ज़िला & थाना</th>
                      <th>मोबाइल</th>
                      <th>स्थिति (Status)</th>
                      <th>सक्रिय/निष्क्रिय</th>
                      <th>कार्रवाई & रोल</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminContacts.map((c) => {
                      const isActive = c.status === 'approved' || c.status === 'active';
                      const isInactive = c.status === 'inactive';
                      const isUserCoAdmin = Boolean(c.isCoAdmin || coAdmins.some(ca => ca.userId === c.id || ca.phone === c.phone));

                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600, color: 'var(--gold-primary)', fontSize: '0.78rem' }}>
                            {c.pno}
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--text-bright)' }}>
                            {c.name}
                            {isUserCoAdmin && (
                              <span style={{ marginLeft: '4px', fontSize: '0.72rem', background: 'rgba(59,130,246,0.2)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)', padding: '1px 5px', borderRadius: '4px' }}>
                                Co-Admin
                              </span>
                            )}
                          </td>
                          <td>{c.post}</td>
                          <td>
                            <div>{c.district}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.office}</div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{c.phone}</td>
                          <td>
                            {isActive && <span className="status-tag status-approved">सक्रिय (Active)</span>}
                            {isInactive && <span className="status-tag status-blocked" style={{ color: '#94a3b8', borderColor: '#475569', background: 'rgba(255,255,255,0.05)' }}>निष्क्रिय (Inactive)</span>}
                            {c.status === 'pending' && <span className="status-tag status-pending">पेंडिंग</span>}
                            {c.status === 'blocked' && <span className="status-tag status-blocked">ब्लॉक्ड</span>}
                          </td>
                          <td>
                            {/* Active / Inactive Toggle Switch for User (Admin & Co-Admin) */}
                            <button
                              className={`btn ${isActive ? 'btn-danger' : 'btn-success'}`}
                              style={{ padding: '3px 7px', fontSize: '0.72rem' }}
                              onClick={() => onToggleUserActive(c.id)}
                              title={isActive ? "यूजर को निष्क्रिय (Inactive) करें" : "यूजर को सक्रिय (Active) करें"}
                            >
                              <Power size={11} />
                              {isActive ? "निष्क्रिय करें" : "सक्रिय करें"}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                              {/* Promote / Revoke Co-Admin (Super Admin only) */}
                              {isAdmin && (
                                <button
                                  className={`btn ${isUserCoAdmin ? 'btn-danger' : 'btn-secondary'}`}
                                  style={{ padding: '3px 6px', fontSize: '0.72rem', borderColor: isUserCoAdmin ? undefined : 'var(--gold-primary)' }}
                                  onClick={() => {
                                    if (isUserCoAdmin) {
                                      const matchedCa = coAdmins.find(ca => ca.userId === c.id || ca.phone === c.phone);
                                      onRevokeCoAdmin(matchedCa ? matchedCa.id : c.id);
                                    } else {
                                      onPromoteUserToCoAdmin(c.id, c.district);
                                    }
                                  }}
                                  title={isUserCoAdmin ? "Co-Admin पद हटाएं" : `${c.district} का Co-Admin बनाएं`}
                                >
                                  <ShieldCheck size={11} />
                                  {isUserCoAdmin ? "हटाएं" : "Co-Admin बनाएं"}
                                </button>
                              )}

                              {/* Password Reset */}
                              <button 
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '0.72rem' }}
                                onClick={() => setResetPromptUser(c)}
                                title="पासवर्ड रीसेट करें"
                              >
                                <KeyRound size={12} />
                              </button>

                              {/* Edit Profile */}
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '3px 5px' }}
                                onClick={() => onEditContact(c)}
                                title="संपादित करें"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Block / Unblock */}
                              <button 
                                className={`btn ${c.status === 'blocked' ? 'btn-success' : 'btn-danger'}`}
                                style={{ padding: '3px 5px' }}
                                onClick={() => onToggleBlock(c.id)}
                                title={c.status === 'blocked' ? 'लॉगिन अनब्लॉक करें' : 'लॉगिन ब्लॉक करें'}
                              >
                                {c.status === 'blocked' ? <Unlock size={12} /> : <Lock size={12} />}
                              </button>

                              {/* Delete Profile */}
                              <button 
                                className="btn btn-danger" 
                                style={{ padding: '3px 5px' }}
                                onClick={() => onDeleteContact(c.id)}
                                title="डिलीट करें"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: DISTRICT TRANSFERS (STRICT 2-TIER APPROVAL CHAIN) */}
          {activeTab === 'transfers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(30,58,138,0.25)',
                border: '1px solid rgba(196,151,86,0.3)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                fontSize: '0.82rem',
                color: 'var(--khaki-light)',
                lineHeight: 1.5
              }}>
                {isAdmin ? (
                  <>
                    👑 <strong>Super Admin - स्थानांतरण अनुमोदन कक्ष:</strong> समस्त जनपदों के Co-Admins द्वारा अग्रसारित किए गए स्थानांतरण अनुरोध नीचे सूचीबद्ध हैं। 'स्थानांतरण स्वीकृत करें' पर क्लिक करने से कर्मचारी का आधिकारिक जनपद अद्यतन (Update) हो जाएगा।
                  </>
                ) : (
                  <>
                    🛡️ <strong>ज़िला Co-Admin - स्थानांतरण समीक्षा:</strong> आपके जनपद (<strong>{myDistrict}</strong>) के पुलिस कार्मिकों द्वारा सबमिट किए गए स्थानांतरण अनुरोध। सत्यापन के उपरांत इन्हें पुलिस मुख्यालय Super Admin को अग्रसारित (Forward) करें।
                  </>
                )}
              </div>

              {transferList.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                  <MapPin size={40} color="var(--khaki-primary)" />
                  <h4 style={{ color: '#fff', marginTop: '0.5rem' }}>कोई लंबित स्थानांतरण अनुरोध नहीं है</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>वर्तमान में कोई जनपद स्थानांतरण अनुरोध समीक्षाधीन नहीं है।</p>
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>PNO / नाम</th>
                        <th>पद (Post)</th>
                        <th>वर्तमान जनपद</th>
                        <th>नवीन लक्षित जनपद</th>
                        <th>स्थानांतरण कारण / आदेश</th>
                        <th>स्थिति (Status)</th>
                        <th>कार्रवाई (Action)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferList.map((c) => {
                        const trf = c.districtTransfer;
                        const isPendingCoAdmin = trf.status === 'pending_coadmin';
                        const isPendingAdmin = trf.status === 'pending_admin';

                        return (
                          <tr key={c.id}>
                            <td>
                              <div style={{ fontWeight: 700, color: '#fff' }}>{c.name}</div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--khaki-primary)' }}>{c.pno}</div>
                            </td>
                            <td>{c.post}</td>
                            <td>
                              <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{trf.fromDistrict}</span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: 'var(--success-emerald, #10b981)' }}>{trf.toDistrict}</span>
                            </td>
                            <td style={{ maxWidth: '240px', fontSize: '0.78rem' }}>
                              <div style={{ color: '#fff' }}>{trf.reason || 'प्रशासनिक स्थानांतरण'}</div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                                आवेदन: {trf.requestedAt ? new Date(trf.requestedAt).toLocaleDateString('hi-IN') : ''}
                              </div>
                            </td>
                            <td>
                              {isPendingCoAdmin && (
                                <span className="status-tag status-pending" style={{ fontSize: '0.72rem' }}>
                                  ⏳ स्थानीय Co-Admin समीक्षाधीन
                                </span>
                              )}
                              {isPendingAdmin && (
                                <span className="status-tag status-approved" style={{ fontSize: '0.72rem', background: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6', color: '#93c5fd' }}>
                                  📨 मुख्यालय अग्रसारित ({trf.forwardedBy || 'Co-Admin'})
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                {/* Co-Admin Forward Action */}
                                {isCoAdmin && isPendingCoAdmin && (
                                  <button
                                    className="btn btn-primary"
                                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                    onClick={() => onForwardDistrictTransfer && onForwardDistrictTransfer(c.id, currentUser.name)}
                                    title="सत्यापन उपरांत मुख्यालय को फ़ॉरवर्ड करें"
                                  >
                                    मुख्यालय को फ़ॉरवर्ड करें &rarr;
                                  </button>
                                )}

                                {/* Super Admin Approval Action */}
                                {isAdmin && (
                                  <button
                                    className="btn btn-success"
                                    style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                    onClick={() => onApproveDistrictTransfer && onApproveDistrictTransfer(c.id, currentUser.name)}
                                    title="स्थानांतरण स्वीकृत करें"
                                  >
                                    <CheckCircle size={12} />
                                    स्वीकृत करें
                                  </button>
                                )}

                                {/* Reject Button for both Co-Admin & Super Admin */}
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                  onClick={() => {
                                    if (window.confirm('क्या आप इस स्थानांतरण अनुरोध को निरस्त करना चाहते हैं?')) {
                                      if (onRejectDistrictTransfer) onRejectDistrictTransfer(c.id);
                                    }
                                  }}
                                  title="स्थानांतरण निरस्त करें"
                                >
                                  <XCircle size={12} />
                                  निरस्त
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXCEL BULK UPDATE */}
          {activeTab === 'excel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px', fontSize: '0.88rem' }}>
                <h4 style={{ color: 'var(--gold-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileSpreadsheet size={18} />
                  एक्सेल शीट द्वारा संपर्क अपडेट {isCoAdmin && `(लक्षित ज़िला: ${myDistrict})`}
                </h4>
                <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Excel (.xlsx / .csv) फ़ाइल अपलोड करके एक ही बार में पूरे ज़िले के संपर्क इम्पोर्ट/अपडेट करें। 
                  {isCoAdmin && <span> Co-Admin द्वारा अपलोड किए जाने वाले सभी संपर्कों पर स्वचालित रूप से <strong>{myDistrict}</strong> ज़िला लागू होगा।</span>}
                </p>
              </div>

              {/* Cloud Sync Status & Force Sync Control Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 58, 138, 0.3))',
                border: '1.5px solid rgba(196, 151, 86, 0.4)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: isFirebaseConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${isFirebaseConnected ? '#10b981' : '#ef4444'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Cloud size={22} color={isFirebaseConnected ? '#34d399' : '#f87171'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.94rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Cloudflare R2 क्लाउड स्थिति</span>
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: isFirebaseConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: isFirebaseConnected ? '#34d399' : '#fca5a5',
                        border: `1px solid ${isFirebaseConnected ? '#10b981' : '#ef4444'}`
                      }}>
                        {isFirebaseConnected ? '🟢 Cloudflare R2 कनेक्टेड (50,000+ यूज़र्स)' : '⚪ ऑफ़लाइन / लोकल'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                      स्थानीय संपर्क संख्या: <strong style={{ color: '#fef08a' }}>{contacts.length}</strong> • यदि एक्सेल डेटा क्लाउड में न दिख रहा हो तो तुरंत सिंक करें
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={isManualSyncing}
                    onClick={handleForceSyncFirebase}
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #ea580c)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isManualSyncing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <RefreshCw size={15} style={isManualSyncing ? { animation: 'spin 1s linear infinite' } : {}} />
                    <span>{isManualSyncing ? 'क्लाउड सिंक जारी...' : '🔄 सभी संपर्क Cloudflare R2 पर सिंक करें'}</span>
                  </button>
                </div>

                {manualSyncMsg && (
                  <div style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    background: manualSyncMsg.includes('✅') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                    border: `1px solid ${manualSyncMsg.includes('✅') ? '#10b981' : '#eab308'}`,
                    color: manualSyncMsg.includes('✅') ? '#6ee7b7' : '#fef08a'
                  }}>
                    {manualSyncMsg}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(15,23,42,0.6)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(196,151,86,0.3)' }}>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-bright)', display: 'block' }}>
                    📥 आधिकारिक एक्सेल पंजीकरण टेम्पलेट (Official Registration Template)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--khaki-light)' }}>
                    पंजीकरण फ़ॉर्म के समस्त फील्ड्स (PNO, Name, Post, District, Office, Phone, WhatsApp, Email, Password, Status, Hide_Phone, Remarks + उ.प्र. के 75 जनपद व मानक पद सूची संदर्भ)
                  </span>
                </div>
                <button className="btn btn-secondary" onClick={downloadSampleExcel} style={{ border: '1px solid var(--gold-primary)', fontWeight: 600 }}>
                  <Download size={16} color="var(--gold-primary)" />
                  आधिकारिक Excel टेम्पलेट डाउनलोड करें (.xlsx)
                </button>
              </div>

              {/* Dropzone */}
              <div 
                className="dropzone"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <Upload size={40} color="var(--gold-primary)" />
                <div>
                  <h4 style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 700 }}>
                    {excelFile ? excelFile.name : "Excel फ़ाइल यहाँ ड्रॉप करें या क्लिक करके चुनें"}
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    समर्थित प्रारूप: .xlsx, .xls, .csv (हिंदी अथवा अंग्रेज़ी कॉलम शीर्षक स्वचालित रूप से मान्य हैं)
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>

              {/* File Action Bar */}
              {excelFile && !isUploading && !importProgress?.isCompleted && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    चयनित फ़ाइल: <strong style={{ color: '#f8fafc' }}>{excelFile.name}</strong> ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => { setExcelFile(null); setImportProgress(null); setImportStatusMsg(null); }}>
                      फ़ाइल हटाएँ
                    </button>
                    <button className="btn btn-primary" onClick={handleProcessExcel}>
                      <Upload size={16} />
                      एक्सेल डेटा इम्पोर्ट एवं लाइव सिंक करें
                    </button>
                  </div>
                </div>
              )}

              {/* LIVE REAL-TIME PROGRESS BAR & TRACKER */}
              {isUploading && importProgress && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 58, 138, 0.35))',
                  border: '1.5px solid var(--khaki-primary, #c49756)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  {/* Progress Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCw size={20} color="var(--khaki-light)" style={{ animation: 'spin 1.5s linear infinite' }} />
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {importProgress.title || 'एक्सेल डेटा प्रोसेसिंग जारी...'}
                      </span>
                    </div>
                    <span style={{
                      background: 'rgba(234, 179, 8, 0.2)',
                      border: '1px solid #eab308',
                      color: '#facc15',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      {importProgress.percent || 15}%
                    </span>
                  </div>

                  {/* Animated Glowing Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '14px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${importProgress.percent || 15}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #3b82f6, #10b981, #eab308)',
                      borderRadius: '8px',
                      transition: 'width 0.35s ease',
                      boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
                    }} />
                  </div>

                  {/* Current Status Message */}
                  <div style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                    {importProgress.message}
                  </div>

                  {/* Step Checklist Badges */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '0.76rem', color: importProgress.step >= 2 ? '#34d399' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {importProgress.step >= 2 ? '✅' : '⏳'} 1. फ़ाइल व शीट लोड
                    </div>
                    <div style={{ fontSize: '0.76rem', color: importProgress.step >= 3 ? '#34d399' : importProgress.step === 2 ? '#facc15' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {importProgress.step >= 3 ? '✅' : importProgress.step === 2 ? '🔄' : '⏳'} 2. पंक्ति सत्यापन
                    </div>
                    <div style={{ fontSize: '0.76rem', color: importProgress.step >= 5 ? '#34d399' : importProgress.step === 4 ? '#facc15' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {importProgress.step >= 5 ? '✅' : importProgress.step === 4 ? '🔄' : '⏳'} 3. लोकल डेटाबेस
                    </div>
                    <div style={{ fontSize: '0.76rem', color: importProgress.step >= 6 ? '#34d399' : importProgress.step === 5 ? '#facc15' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {importProgress.step >= 6 ? '✅' : importProgress.step === 5 ? '🔄' : '⏳'} 4. Firebase सिंक
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS DASHBOARD SUMMARY CARD */}
              {importProgress?.isCompleted && importProgress?.report && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.4), rgba(15, 23, 42, 0.95))',
                  border: '1.5px solid #10b981',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={22} color="#34d399" />
                      <div>
                        <h4 style={{ margin: 0, color: '#34d399', fontSize: '1.05rem', fontWeight: 800 }}>
                          एक्सेल डेटा सफलतापूर्वक अपलोड एवं लाइव सिंक हो गया!
                        </h4>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                          शीट: <strong>{importProgress.report.sheetName}</strong> • {new Date().toLocaleTimeString('hi-IN')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      onClick={() => { setImportProgress(null); setImportStatusMsg(null); }}
                    >
                      अन्य फ़ाइल अपलोड करें
                    </button>
                  </div>

                  {/* 4 Stat Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>कुल पंक्तियाँ</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>{importProgress.report.totalProcessed}</div>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', color: '#6ee7b7' }}>नए कार्मिक (Added)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>+{importProgress.report.addedCount}</div>
                    </div>
                    <div style={{ background: 'rgba(59,130,246,0.15)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', color: '#93c5fd' }}>अपडेट किए गए</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>{importProgress.report.updatedCount}</div>
                    </div>
                    <div style={{ background: importProgress.report.skippedCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: importProgress.report.skippedCount > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', color: importProgress.report.skippedCount > 0 ? '#fca5a5' : '#94a3b8' }}>छूटे रिकॉर्ड्स (Skipped)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: importProgress.report.skippedCount > 0 ? '#ef4444' : '#94a3b8' }}>{importProgress.report.skippedCount}</div>
                    </div>
                  </div>

                  {/* Metadata & Cloud Badges */}
                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.78rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.25)', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                    <span>🏢 नए थाने/शाखाएं दर्ज: <strong style={{ color: '#facc15' }}>{importProgress.report.newOfficesCount}</strong></span>
                    <span>•</span>
                    <span>📍 नए जनपद: <strong style={{ color: '#facc15' }}>{importProgress.report.newDistrictsCount}</strong></span>
                    <span>•</span>
                    <span>👮 नए पद: <strong style={{ color: '#facc15' }}>{importProgress.report.newPostsCount}</strong></span>
                    <span>•</span>
                    <span>☁️ क्लाउड स्थिति: <strong style={{ color: importProgress.report.isCloudSynced ? '#34d399' : '#94a3b8' }}>{importProgress.report.isCloudSynced ? '🟢 Firebase Firestore पर लाइव सिंक (सक्रिय)' : '⚪ स्थानीय रूप से सुरक्षित'}</strong></span>
                  </div>

                  {/* Expandable Skipped Rows Reason */}
                  {importProgress.report.skippedCount > 0 && (
                    <div style={{ borderTop: '1px dashed rgba(239,68,68,0.3)', paddingTop: '0.65rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <AlertTriangle size={14} />
                          {importProgress.report.skippedCount} पंक्तियाँ मान्य नाम/10-अंकों का मोबाइल नंबर न होने के कारण नहीं जोड़ी गईं।
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                        >
                          {showSkippedDetails ? 'विवरण छुपाएं' : 'छूटी पंक्तियाँ देखें'}
                        </button>
                      </div>

                      {showSkippedDetails && (
                        <div style={{ marginTop: '0.5rem', maxHeight: '160px', overflowY: 'auto', background: 'rgba(0,0,0,0.4)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.74rem' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                                <th style={{ padding: '4px' }}>पंक्ति</th>
                                <th style={{ padding: '4px' }}>नाम</th>
                                <th style={{ padding: '4px' }}>मोबाइल</th>
                                <th style={{ padding: '4px' }}>कारण</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importProgress.report.skippedReasons.map((sk, sIdx) => (
                                <tr key={sIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '4px', color: '#facc15' }}>#{sk.rowNum}</td>
                                  <td style={{ padding: '4px' }}>{sk.name}</td>
                                  <td style={{ padding: '4px' }}>{sk.phone}</td>
                                  <td style={{ padding: '4px', color: '#fca5a5' }}>{sk.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {importStatusMsg && importStatusMsg.type === 'error' && (
                <div className="status-tag status-blocked" style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', width: '100%', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <XCircle size={18} />
                  <div>
                    <strong>त्रुटि: </strong>{importStatusMsg.text}
                    <div style={{ fontSize: '0.76rem', color: '#fca5a5', marginTop: '3px' }}>
                      सुझाव: कृपया ऊपर दिए गए बटन से 'आधिकारिक Excel टेम्पलेट (.xlsx)' डाउनलोड करें और उसी फ़ॉर्मेट में डेटा भरकर अपलोड करें।
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CO-ADMIN MANAGEMENT & PROMOTION (SUPER ADMIN ONLY) */}
          {activeTab === 'coadmins' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Quick Promote From Existing Users */}
              <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--gold-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={18} />
                  किसी भी मौजूदा कर्मचारी को ज़िला Co-Admin बनाएं (Promote Any User)
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '0.75rem' }}>
                  आप किसी भी ज़िले में जिसे चाहें, उस कर्मचारी को सीधे उस ज़िले का Co-Admin नियुक्त कर सकते हैं:
                </p>

                <form onSubmit={handlePromoteExistingUser} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ flex: '1 1 240px' }}
                    value={selectedUserIdToPromote}
                    onChange={e => {
                      setSelectedUserIdToPromote(e.target.value);
                      const u = safeContacts.find(c => c && c.id === e.target.value);
                      if (u) setPromoteDistrict(u.district);
                    }}
                    required
                  >
                    <option value="">-- पुलिस कर्मचारी चुनें --</option>
                    {safeContacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.post}, {c.district}) - {c.pno}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-select"
                    style={{ width: '180px' }}
                    value={promoteDistrict}
                    onChange={e => setPromoteDistrict(e.target.value)}
                  >
                    {safeDistricts.filter((_, i) => i > 0).length === 0 ? (
                      <option value="">-- कोई ज़िला नहीं --</option>
                    ) : (
                      safeDistricts.filter((_, i) => i > 0).map((d, i) => (
                        <option key={i} value={d}>{d} ज़िला</option>
                      ))
                    )}
                  </select>

                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    <ShieldCheck size={16} />
                    Co-Admin नियुक्त करें
                  </button>
                </form>
              </div>

              {/* Co-Admins Table */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 700 }}>
                  वर्तमान ज़िला Co-Admin सूची ({safeCoAdmins.length})
                </h4>
                <button className="btn btn-secondary" onClick={() => setShowAddCoAdminModal(true)}>
                  <Plus size={16} />
                  + नया Co-Admin क्रेडेंशियल जोड़ें
                </button>
              </div>

              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ज़िला (District)</th>
                      <th>नोडल अधिकारी का नाम</th>
                      <th>यूजरनेम</th>
                      <th>मोबाइल</th>
                      <th>स्थिति (Status)</th>
                      <th>सक्रिय/निष्क्रिय</th>
                      <th>हटाएं</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeCoAdmins.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', background: 'rgba(0,0,0,0.1)' }}>
                          🛡️ कोई ज़िला Co-Admin नियुक्त नहीं है। ऊपर दिए गए '+ नया Co-Admin क्रेडेंशियल जोड़ें' बटन से नया Co-Admin नियुक्त करें।
                        </td>
                      </tr>
                    ) : (
                      safeCoAdmins.map(ca => {
                      const isCoActive = ca.status !== 'inactive';
                      return (
                        <tr key={ca.id}>
                          <td style={{ fontWeight: 700, color: 'var(--gold-primary)' }}>
                            {ca.district}
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                            {ca.name}
                          </td>
                          <td>{ca.username}</td>
                          <td>{ca.phone}</td>
                          <td>
                            {isCoActive ? (
                              <span className="status-tag status-approved">सक्रिय (Active)</span>
                            ) : (
                              <span className="status-tag status-blocked" style={{ color: '#94a3b8', borderColor: '#475569', background: 'rgba(255,255,255,0.05)' }}>
                                निष्क्रिय (Inactive)
                              </span>
                            )}
                          </td>
                          <td>
                            {/* Super Admin can toggle Co-Admin Active / Inactive */}
                            <button
                              className={`btn ${isCoActive ? 'btn-danger' : 'btn-success'}`}
                              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                              onClick={() => onToggleCoAdminActive(ca.id)}
                              title={isCoActive ? "Co-Admin को निष्क्रिय करें" : "Co-Admin को सक्रिय करें"}
                            >
                              <Power size={12} />
                              {isCoActive ? "निष्क्रिय करें" : "सक्रिय करें"}
                            </button>
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger" 
                              style={{ padding: '3px 6px' }}
                              onClick={() => onDeleteCoAdmin(ca.id)}
                              title="Co-Admin हटाएं"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MASTER DATA MANAGEMENT (SUPER ADMIN ONLY) */}
          {activeTab === 'master' && isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(229,184,66,0.12)', border: '1px solid rgba(229,184,66,0.3)', padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-light)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings size={18} />
                  डायनेमिक मास्टर सेटिंग्स (Master Dropdowns Configuration)
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  यहाँ से आप बिना डेटाबेस या बैकएंड कोड में गए सीधे ऐप से ही नए <strong>पद (Designations)</strong>, <strong>कार्यालय/थाना (Offices/Thanas)</strong> एवं <strong>ज़िले</strong> जोड़ या हटा सकते हैं। ये बदलाव तुरंत सभी फ़िल्टर एवं फ़ॉर्म में लाइव हो जाएंगे।
                </p>
              </div>

              {/* Master sub tabs */}
              <div className="admin-tabs" style={{ marginBottom: 0 }}>
                <button
                  className={`admin-tab ${masterSubTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setMasterSubTab('posts')}
                >
                  <Award size={15} />
                  पद / पदनाम प्रबंधन ({Math.max(0, posts.length - 1)})
                </button>

                <button
                  className={`admin-tab ${masterSubTab === 'offices' ? 'active' : ''}`}
                  onClick={() => setMasterSubTab('offices')}
                >
                  <Building2 size={15} />
                  कार्यालय / थाना प्रबंधन ({offices.length})
                </button>

                <button
                  className={`admin-tab ${masterSubTab === 'districts' ? 'active' : ''}`}
                  onClick={() => setMasterSubTab('districts')}
                >
                  <MapPin size={15} />
                  ज़िला प्रबंधन ({Math.max(0, districts.length - 1)})
                </button>
              </div>

              {/* SUB TAB: POSTS (SUPER ADMIN ONLY) */}
              {masterSubTab === 'posts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <form onSubmit={handleAddNewPost} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. अपर पुलिस महानिदेशक (ADG) / विशेष अन्वेषक"
                      value={newPostInput}
                      onChange={e => setNewPostInput(e.target.value)}
                      style={{ flex: '1 1 260px' }}
                      required
                    />
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                      नया पद जोड़ें
                    </button>
                    {onLoadStandardPosts && (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onLoadStandardPosts}
                        title="उ.प्र. पुलिस के सभी मानक पदनाम (DGP से आरक्षी तक) लोड करें"
                      >
                        👮 मानक पद लोड करें
                      </button>
                    )}
                  </form>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                    {safePosts.filter((_, idx) => idx > 0).length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        कोई पद उपलब्ध नहीं है। ऊपर दिए गए फ़ॉर्म से नया पद जोड़ें या 'मानक पद लोड करें' बटन दबाएं।
                      </div>
                    ) : (
                      safePosts.filter((_, idx) => idx > 0).map((post, idx) => {
                      const isEditing = editingPost?.oldName === post;
                      return (
                        <div 
                          key={idx} 
                          style={{
                            background: 'rgba(15, 23, 42, 0.75)',
                            border: '1px solid rgba(229,184,66,0.3)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}
                        >
                          {isEditing ? (
                            <form onSubmit={handleSaveEditPost} style={{ display: 'flex', gap: '4px', width: '100%' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={editingPost.newName}
                                onChange={e => setEditingPost({ ...editingPost, newName: e.target.value })}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', flex: 1 }}
                                autoFocus
                                required
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="सुरक्षित करें">
                                <CheckCircle size={14} />
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={() => setEditingPost(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="रद्द करें">
                                <X size={14} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-bright)' }}>{post}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="action-btn"
                                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 6px' }}
                                  onClick={() => setEditingPost({ oldName: post, newName: post })}
                                  title="पद संशोधित करें"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 6px' }}
                                  onClick={() => {
                                    if (window.confirm(`क्या आप पद "${post}" को हटाना चाहते हैं?`)) {
                                      onDeletePost(post);
                                    }
                                  }}
                                  title="यह पद हटाएं"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              )}

              {/* SUB TAB: OFFICES (SUPER ADMIN VIEW) */}
              {masterSubTab === 'offices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* District Filter Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(15,23,42,0.5)', padding: '0.75rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={16} color="var(--gold-primary)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>ज़िले अनुसार देखें:</span>
                      <select
                        className="form-select"
                        style={{ width: '180px', padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                        value={officeFilterDistrict}
                        onChange={e => setOfficeFilterDistrict(e.target.value)}
                      >
                        <option value="सभी ज़िले">सभी ज़िले (All Districts)</option>
                        {safeDistricts.filter((_, idx) => idx > 0).map((d, i) => (
                          <option key={i} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      कुल थाने/शाखाएं: {safeOffices.length}
                    </span>
                  </div>

                  {/* Add Office Form with District Selector */}
                  <form onSubmit={handleAddNewOffice} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. थाना सुशांत गोल्फ सिटी / महिला हेल्पडेस्क / साइबर सेल"
                      value={newOfficeInput}
                      onChange={e => setNewOfficeInput(e.target.value)}
                      style={{ flex: '1 1 240px' }}
                      required
                    />
                    <select
                      className="form-select"
                      style={{ width: '170px' }}
                      value={newOfficeDistrict}
                      onChange={e => setNewOfficeDistrict(e.target.value)}
                      required
                    >
                      {safeDistricts.filter((_, idx) => idx > 0).map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                      कार्यालय/थाना जोड़ें
                    </button>
                  </form>

                  {/* Offices Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                    {safeOffices.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        कोई कार्यालय/थाना दर्ज नहीं है। ऊपर दिए गए फ़ॉर्म से नया कार्यालय जोड़ें या एक्सेल फ़ाइल से कार्मिक सूची अपलोड करें।
                      </div>
                    ) : (
                      safeOffices
                        .filter(o => {
                          if (officeFilterDistrict === 'सभी ज़िले') return true;
                          return typeof o === 'object' && o.district === officeFilterDistrict;
                        })
                        .map((officeItem, idx) => {
                        const oName = typeof officeItem === 'string' ? officeItem : officeItem.name;
                        const oDist = typeof officeItem === 'object' ? officeItem.district : 'लखनऊ';
                        const oId = typeof officeItem === 'object' ? officeItem.id : oName;
                        const isEditing = editingOffice?.id === oId;

                        return (
                          <div 
                            key={idx} 
                            style={{
                              background: 'rgba(15, 23, 42, 0.75)',
                              border: '1px solid rgba(229,184,66,0.25)',
                              borderRadius: '8px',
                              padding: '0.65rem 0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem'
                            }}
                          >
                            {isEditing ? (
                              <form onSubmit={handleSaveEditOffice} style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editingOffice.newName}
                                  onChange={e => setEditingOffice({ ...editingOffice, newName: e.target.value })}
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                                  autoFocus
                                  required
                                />
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <select
                                    className="form-select"
                                    value={editingOffice.district}
                                    onChange={e => setEditingOffice({ ...editingOffice, district: e.target.value })}
                                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                                  >
                                    {safeDistricts.filter((_, i) => i > 0).map((d, i) => (
                                      <option key={i} value={d}>{d}</option>
                                    ))}
                                  </select>
                                  <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="सुरक्षित करें">
                                    <CheckCircle size={14} />
                                  </button>
                                  <button type="button" className="btn btn-secondary" onClick={() => setEditingOffice(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="रद्द करें">
                                    <X size={14} />
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-bright)' }}>{oName}</div>
                                  <div style={{ fontSize: '0.72rem', color: 'var(--gold-primary)', marginTop: '2px' }}>📍 जनपद: {oDist}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    className="action-btn"
                                    style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 6px' }}
                                    onClick={() => setEditingOffice({ id: oId, oldName: oName, newName: oName, district: oDist })}
                                    title="थाना/शाखा संशोधित करें"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn"
                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 6px' }}
                                    onClick={() => {
                                      if (window.confirm(`क्या आप "${oName}" (${oDist}) को हटाना चाहते हैं?`)) {
                                        onDeleteOffice(oId);
                                      }
                                    }}
                                    title="यह कार्यालय/थाना हटाएं"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      }))}
                  </div>
                </div>
              )}

              {/* SUB TAB: DISTRICTS (SUPER ADMIN ONLY) */}
              {masterSubTab === 'districts' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <form onSubmit={handleAddNewDistrict} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. गाजियाबाद / गौतम बुद्ध नगर (नोएडा) / अयोध्या"
                      value={newDistrictInput}
                      onChange={e => setNewDistrictInput(e.target.value)}
                      style={{ flex: '1 1 260px' }}
                      required
                    />
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                      नया ज़िला जोड़ें
                    </button>
                    {onLoadAllDistricts && (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={onLoadAllDistricts}
                        title="उत्तर प्रदेश के सभी 75 जनपद स्वतः लोड करें"
                      >
                        🏛️ सभी 75 जनपद लोड करें
                      </button>
                    )}
                  </form>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                    {safeDistricts.filter((_, idx) => idx > 0).length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                        कोई ज़िला दर्ज नहीं है। ऊपर दिए गए फ़ॉर्म से नया ज़िला जोड़ें या 'सभी 75 जनपद लोड करें' बटन दबाएं।
                      </div>
                    ) : (
                      safeDistricts.filter((_, idx) => idx > 0).map((dist, idx) => {
                      const isEditing = editingDistrict?.oldName === dist;
                      return (
                        <div 
                          key={idx} 
                          style={{
                            background: 'rgba(15, 23, 42, 0.75)',
                            border: '1px solid rgba(229,184,66,0.3)',
                            borderRadius: '8px',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}
                        >
                          {isEditing ? (
                            <form onSubmit={handleSaveEditDistrict} style={{ display: 'flex', gap: '4px', width: '100%' }}>
                              <input
                                type="text"
                                className="form-input"
                                value={editingDistrict.newName}
                                onChange={e => setEditingDistrict({ ...editingDistrict, newName: e.target.value })}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', flex: 1 }}
                                autoFocus
                                required
                              />
                              <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="सुरक्षित करें">
                                <CheckCircle size={14} />
                              </button>
                              <button type="button" className="btn btn-secondary" onClick={() => setEditingDistrict(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="रद्द करें">
                                <X size={14} />
                              </button>
                            </form>
                          ) : (
                            <>
                              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-bright)' }}>{dist}</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="action-btn"
                                  style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 6px' }}
                                  onClick={() => setEditingDistrict({ oldName: dist, newName: dist })}
                                  title="ज़िला संशोधित करें"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 6px' }}
                                  onClick={() => {
                                    if (window.confirm(`क्या आप ज़िला "${dist}" को हटाना चाहते हैं?`)) {
                                      onDeleteDistrict(dist);
                                    }
                                  }}
                                  title="यह ज़िला हटाएं"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CO-ADMIN OFFICE MANAGEMENT (CO-ADMIN ONLY) */}
          {activeTab === 'coadmin_offices' && isCoAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(30,58,138,0.25)', border: '1px solid rgba(229,184,66,0.3)', padding: '1rem', borderRadius: '12px' }}>
                <h4 style={{ color: 'var(--gold-light)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={18} />
                  थाना / शाखा / इकाई प्रबंधन • जनपद: {myDistrict}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                  🛡️ <strong>Co-Admin अधिकार:</strong> आपको अपने तैनात जनपद <strong>({myDistrict})</strong> के अंतर्गत थाने, पुलिस चौकियां, अपराध शाखाएं एवं अन्य इकाइयां जोड़ने, संशोधित (Edit) करने तथा घटाने/हटाने का पूर्ण अधिकार है। (पद व ज़िला प्रबंधन केवल Super Admin द्वारा ही संशोधित हो सकता है।)
                </p>
              </div>

              {/* Add New Thana for myDistrict */}
              <form onSubmit={handleCoAdminAddOffice} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(15,23,42,0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`उदा. नया थाना / महिला हेल्पडेस्क (${myDistrict})`}
                  value={coAdminNewOfficeName}
                  onChange={e => setCoAdminNewOfficeName(e.target.value)}
                  style={{ flex: '1 1 260px' }}
                  required
                />
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.85rem', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--gold-light)', fontWeight: 600 }}>
                  📍 ज़िला: {myDistrict}
                </div>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  नया थाना जोड़ें
                </button>
              </form>

              {/* List of Thanas in myDistrict */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
                {safeOffices
                  .filter(o => typeof o === 'object' && o.district === myDistrict)
                  .map((officeItem, idx) => {
                    const isEditing = editingOffice?.id === officeItem.id;
                    return (
                      <div 
                        key={idx} 
                        style={{
                          background: 'rgba(15, 23, 42, 0.75)',
                          border: '1px solid rgba(229,184,66,0.25)',
                          borderRadius: '8px',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}
                      >
                        {isEditing ? (
                          <form onSubmit={handleSaveEditOffice} style={{ display: 'flex', gap: '4px', width: '100%' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={editingOffice.newName}
                              onChange={e => setEditingOffice({ ...editingOffice, newName: e.target.value })}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', flex: 1 }}
                              autoFocus
                              required
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="सुरक्षित करें">
                              <CheckCircle size={14} />
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setEditingOffice(null)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="रद्द करें">
                              <X size={14} />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-bright)' }}>{officeItem.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--gold-primary)', marginTop: '2px' }}>📍 जनपद: {officeItem.district}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="action-btn"
                                style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', padding: '4px 6px' }}
                                onClick={() => setEditingOffice({ id: officeItem.id, oldName: officeItem.name, newName: officeItem.name, district: myDistrict })}
                                title="थाना संशोधित करें"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', padding: '4px 6px' }}
                                onClick={() => {
                                  if (window.confirm(`क्या आप थाना "${officeItem.name}" को हटाना चाहते हैं?`)) {
                                    onDeleteOffice(officeItem.id);
                                  }
                                }}
                                title="यह थाना हटाएं"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 6: POLICIES & CUSTOM LINKS CMS */}
          {activeTab === 'terms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                background: 'rgba(30,58,138,0.25)',
                border: '1px solid rgba(196,151,86,0.35)',
                padding: '0.85rem 1.15rem',
                borderRadius: '10px',
                fontSize: '0.84rem',
                color: 'var(--khaki-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={22} color="var(--khaki-primary)" style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#fff' }}>
                      शासकीय नीतियां, नियम एवं कस्टम लिंक्स प्रबंधन (CMS):
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                      यहाँ से आप सभी डिफ़ॉल्ट नीतियों की सामग्री बदल सकते हैं तथा <strong>नये कस्टम लिंक्स व पेज़ सामग्री</strong> जोड़ सकते हैं। नए लिंक्स बिना कोड बदले स्वतः फूटर एवं पॉपअप में प्रदर्शित होंगे।
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      setIsAddingNewPolicy(!isAddingNewPolicy);
                      setEditingPolicyItem(null);
                    }}
                  >
                    <Plus size={15} />
                    {isAddingNewPolicy ? 'फ़ॉर्म बंद करें' : '➕ नया लिंक / नीति जोड़ें'}
                  </button>
                )}
              </div>

              {policyNotice && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid #10b981',
                  color: '#6ee7b7',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={16} />
                  <span>{policyNotice}</span>
                </div>
              )}

              {/* FORM 1: ADD NEW CUSTOM POLICY / LINK */}
              {isAddingNewPolicy && (
                <form onSubmit={handleAddNewPolicySubmit} style={{
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 26, 0.98))',
                  border: '1.5px solid var(--khaki-primary, #c49756)',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: 'var(--khaki-light)', fontSize: '0.98rem', fontWeight: 800 }}>
                      ➕ नया लिंक व सामग्री जोड़ें (Add New Dynamic Policy/Link)
                    </h4>
                    <button type="button" className="close-btn" onClick={() => setIsAddingNewPolicy(false)}><X size={16} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">लिंक / नीति का शीर्षक (Link / Policy Title in English/Hindi) *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="उदा. Cyber Security Policy / आरटीआई नियमावली"
                        value={newPolicyForm.title}
                        onChange={e => setNewPolicyForm({ ...newPolicyForm, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">हिंदी शीर्षक / उपशीर्षक (Hindi Title / Subtitle)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="उदा. साइबर सुरक्षा नीति"
                        value={newPolicyForm.hindiTitle}
                        onChange={e => setNewPolicyForm({ ...newPolicyForm, hindiTitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">विस्तृत नियम, शर्तें व पेज़ सामग्री (Content / Detailed Matters) *</label>
                    <textarea
                      className="form-textarea"
                      rows={6}
                      placeholder="इस लिंक पर क्लिक करने पर दिखने वाली विस्तृत नियमावली, निर्देश अथवा पैराग्राफ यहाँ लिखें..."
                      value={newPolicyForm.content}
                      onChange={e => setNewPolicyForm({ ...newPolicyForm, content: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsAddingNewPolicy(false)}>
                      रद्द करें
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                      <CheckCircle size={15} />
                      लिंक व कंटेंट प्रकाशित करें
                    </button>
                  </div>
                </form>
              )}

              {/* FORM 2: EDIT EXISTING POLICY MODAL / INLINE */}
              {editingPolicyItem && (
                <form onSubmit={handleSaveEditPolicySubmit} style={{
                  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 26, 0.98))',
                  border: '1.5px solid #3b82f6',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, color: '#93c5fd', fontSize: '0.98rem', fontWeight: 800 }}>
                      ✏️ नीति संपादित करें: {editingPolicyItem.title}
                    </h4>
                    <button type="button" className="close-btn" onClick={() => setEditingPolicyItem(null)}><X size={16} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">नीति का शीर्षक (Title)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingPolicyItem.title}
                        onChange={e => setEditingPolicyItem({ ...editingPolicyItem, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">हिंदी शीर्षक / उपशीर्षक (Hindi Title)</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingPolicyItem.hindiTitle || ''}
                        onChange={e => setEditingPolicyItem({ ...editingPolicyItem, hindiTitle: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">विस्तृत सामग्री (Detailed Matters / Content)</label>
                    <textarea
                      className="form-textarea"
                      rows={8}
                      value={editingPolicyItem.content}
                      onChange={e => setEditingPolicyItem({ ...editingPolicyItem, content: e.target.value })}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setEditingPolicyItem(null)}>
                      रद्द करें
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
                      <CheckCircle size={15} />
                      संशोधन सुरक्षित करें
                    </button>
                  </div>
                </form>
              )}

              {/* LIST OF ALL ACTIVE POLICIES & LINKS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-bright)', fontWeight: 700 }}>
                    📋 सक्रिय नीतियां व फूटर लिंक्स ({policiesList.length})
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    ये सभी लिंक्स पोर्टल के फूटर एवं डायलॉग में स्वतः दिखाई देते हैं
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
                  {policiesList.map((p, idx) => (
                    <div key={p.id || idx} style={{
                      background: 'rgba(15, 23, 42, 0.75)',
                      border: p.isBuiltIn ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(196,151,86,0.4)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '0.65rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: p.isBuiltIn ? 'rgba(59,130,246,0.18)' : 'rgba(16,185,129,0.18)',
                            color: p.isBuiltIn ? '#93c5fd' : '#6ee7b7',
                            border: p.isBuiltIn ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(16,185,129,0.3)'
                          }}>
                            {p.isBuiltIn ? 'बिल्ट-इन नीति' : '➕ कस्टम लिंक'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            अंतिम संपादन: {p.lastUpdated || '2026-10-05'}
                          </span>
                        </div>

                        <h4 style={{ margin: '4px 0 2px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                          {p.title}
                        </h4>
                        {p.hindiTitle && p.hindiTitle !== p.title && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--khaki-light)', marginBottom: '4px' }}>
                            {p.hindiTitle}
                          </div>
                        )}

                        <p style={{
                          fontSize: '0.78rem',
                          color: '#94a3b8',
                          margin: '4px 0 0 0',
                          lineHeight: 1.45,
                          maxHeight: '4.2em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {p.content}
                        </p>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '6px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        paddingTop: '0.5rem',
                        marginTop: '0.25rem'
                      }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '3px 9px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            setEditingPolicyItem(p);
                            setIsAddingNewPolicy(false);
                          }}
                          title="सामग्री संशोधित करें"
                        >
                          <Edit3 size={12} />
                          <span>संशोधित करें</span>
                        </button>

                        {!p.isBuiltIn && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleDeletePolicyClick(p.id, p.title)}
                            title="यह कस्टम लिंक हटाएं"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: CALL LOGS */}
          {activeTab === 'call_logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(30, 58, 138, 0.25)',
                border: '1px solid rgba(196, 151, 86, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '0.95rem' }}>
                    📞 इन-ऐप वॉइस कॉल निगरानी एवं सुरक्षा लॉग्स
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    सभी पीयर-टू-पीयर कॉल्स की विस्तृत ऑडिट ट्रेल (अधिकतम 05 मिनट प्रति कॉल सीमा लागू)
                  </p>
                </div>
                {isAdmin && callLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('क्या आप सुनिश्चित हैं कि समस्त कॉल लॉग्स साफ़ करना चाहते हैं?')) {
                        clearCallLogs();
                        setCallLogs([]);
                      }
                    }}
                    style={{
                      background: 'rgba(239,68,68,0.2)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    🗑️ सभी लॉग्स साफ़ करें
                  </button>
                )}
              </div>

              {/* Search in call logs */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="कॉलर, रिसीवर या PNO द्वारा खोजें..."
                  value={callLogSearch}
                  onChange={e => setCallLogSearch(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>

              {/* Call Logs Table */}
              <div style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <table className="admin-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                  <thead>
                    <tr>
                      <th>समय (Timestamp)</th>
                      <th>कॉलर (Caller)</th>
                      <th>रिसीवर (Receiver)</th>
                      <th>अवधि (Duration)</th>
                      <th>स्थिति (Status)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callLogs.filter(log => {
                      if (isCoAdmin) {
                        const inMyDist = log.callerDistrict === myDistrict || log.receiverDistrict === myDistrict;
                        if (!inMyDist) return false;
                      }
                      if (!callLogSearch.trim()) return true;
                      const q = callLogSearch.toLowerCase();
                      return (log.callerName || '').toLowerCase().includes(q) ||
                        (log.receiverName || '').toLowerCase().includes(q) ||
                        (log.callerPno || '').toLowerCase().includes(q) ||
                        (log.receiverPno || '').toLowerCase().includes(q);
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                          कोई कॉल लॉग दर्ज नहीं है।
                        </td>
                      </tr>
                    ) : (
                      callLogs.filter(log => {
                        if (isCoAdmin) {
                          const inMyDist = log.callerDistrict === myDistrict || log.receiverDistrict === myDistrict;
                          if (!inMyDist) return false;
                        }
                        if (!callLogSearch.trim()) return true;
                        const q = callLogSearch.toLowerCase();
                        return (log.callerName || '').toLowerCase().includes(q) ||
                          (log.receiverName || '').toLowerCase().includes(q) ||
                          (log.callerPno || '').toLowerCase().includes(q) ||
                          (log.receiverPno || '').toLowerCase().includes(q);
                      }).map((log, idx) => {
                        const formatDur = (secs) => {
                          if (!secs) return '00:00';
                          const m = Math.floor(secs / 60);
                          const s = secs % 60;
                          return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        };
                        return (
                          <tr key={log.id || idx}>
                            <td style={{ color: '#cbd5e1', fontSize: '0.76rem' }}>
                              {new Date(log.timestamp).toLocaleString('hi-IN')}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{log.callerName || 'अज्ञात'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--khaki-light)' }}>{log.callerPost || ''} • {log.callerDistrict || ''}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#f8fafc' }}>{log.receiverName || 'अज्ञात'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--khaki-light)' }}>{log.receiverPost || ''} • {log.receiverDistrict || ''}</div>
                            </td>
                            <td style={{ fontWeight: 800, color: log.durationSeconds >= 300 ? '#f59e0b' : '#34d399', fontFamily: 'monospace' }}>
                              {formatDur(log.durationSeconds)}
                              {log.durationSeconds >= 300 && <span style={{ fontSize: '0.68rem', display: 'block', color: '#f59e0b' }}>(5m कटऑफ)</span>}
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: log.status === 'completed' ? 'rgba(16,185,129,0.2)' : log.status === 'missed' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                                color: log.status === 'completed' ? '#34d399' : log.status === 'missed' ? '#fca5a5' : '#fcd34d'
                              }}>
                                {log.status === 'completed' ? 'सम्पन्न (Completed)' : log.status === 'missed' ? 'मिस्ड (Missed)' : log.status === 'declined' ? 'अस्वीकृत' : log.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: BACKUPS (6-Hour Rolling, Max 5 Slots) */}
          {activeTab === 'backups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(14, 30, 60, 0.6)',
                border: '1px solid var(--khaki-primary, #c49756)',
                padding: '1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={18} color="var(--khaki-primary)" />
                    <span>स्वचालित 6-घंटे का आवधिक बैकअप (Rolling Backup System)</span>
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                    प्रत्येक 6 घंटे में संपूर्ण डेटाबेस का पूर्ण स्नैपशॉट स्वतः सुरक्षित किया जाता है। अधिकतम <strong>05 बैकअप स्लॉट</strong> सुरक्षित रहते हैं; 05 से अधिक होने पर सबसे पुराना बैकअप स्वतः रीसायकल (ओवरराइट) होता है।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = createBackupSlot('मैन्युअल प्रशासक बैकअप (Manual Admin Backup)');
                    setBackups(updated);
                    setBackupNotice('✅ नया बैकअप स्लॉट सफलतापूर्वक तैयार कर लिया गया है!');
                    setTimeout(() => setBackupNotice(''), 3500);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #c49756, #8e6833)',
                    color: '#0a1020',
                    border: 'none',
                    fontWeight: 800,
                    padding: '0.55rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} />
                  <span>अभी तुरंत बैकअप लें</span>
                </button>
              </div>

              {backupNotice && (
                <div style={{
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid #10b981',
                  color: '#34d399',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem'
                }}>
                  {backupNotice}
                </div>
              )}

              {/* Backup Slots List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h5 style={{ margin: 0, color: '#f8fafc', fontSize: '0.88rem' }}>
                  सक्रिय बैकअप स्लॉट्स ({backups.length} / 5 अधिकतम)
                </h5>

                {backups.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', color: '#94a3b8' }}>
                    वर्तमान में कोई बैकअप स्लॉट उपलब्ध नहीं है। कृपया "अभी तुरंत बैकअप लें" पर क्लिक करें।
                  </div>
                ) : (
                  backups.map((slot, index) => (
                    <div key={slot.id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(196,151,86,0.3)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: 'rgba(196,151,86,0.2)',
                            color: 'var(--khaki-light)',
                            border: '1px solid var(--khaki-primary)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontWeight: 800,
                            fontSize: '0.72rem'
                          }}>
                            स्लॉट #{index + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.88rem' }}>
                            {slot.label || 'आवधिक 6-घंटे बैकअप'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '4px' }}>
                          समय: <strong>{new Date(slot.timestamp).toLocaleString('hi-IN')}</strong> • कार्मिक रिकॉर्ड: {slot.counts?.contacts || 0} • चैट संवाद: {slot.counts?.chats || 0} • कॉल लॉग्स: {slot.counts?.callLogs || 0}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`चेतावनी: क्या आप बैकअप स्लॉट #${index + 1} (${new Date(slot.timestamp).toLocaleString('hi-IN')}) से संपूर्ण डेटाबेस पुनर्स्थापित (Restore) करना चाहते हैं?`)) {
                            try {
                              restoreBackupSlot(slot.id);
                              alert('✅ डेटाबेस सफलतापूर्वक पुनर्स्थापित (Restored) हो गया है! पृष्ठ पुनः लोड हो रहा है...');
                              window.location.reload();
                            } catch (e) {
                              alert('पुनर्स्थापन त्रुटि: ' + e.message);
                            }
                          }
                        }}
                        style={{
                          background: 'rgba(16,185,129,0.15)',
                          border: '1px solid #10b981',
                          color: '#34d399',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        पुनर्स्थापित करें (Restore)
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: PHONE NUMBER PERMISSION REQUESTS */}
          {activeTab === 'phone_perms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{
                background: 'rgba(30, 58, 138, 0.25)',
                border: '1px solid rgba(196, 151, 86, 0.3)',
                padding: '0.85rem 1rem',
                borderRadius: '10px'
              }}>
                <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '0.95rem' }}>
                  👁️ गोपनीय फोन नंबर देखने हेतु अनुमति अनुरोध
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  {isCoAdmin ? `जनपद ${myDistrict} के अंतर्गत कार्मिकों द्वारा भेजे गए नंबर एक्सेस अनुरोध` : 'राज्य भर के समस्त कार्मिकों द्वारा भेजे गए नंबर एक्सेस अनुरोध'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {phonePermissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', color: '#94a3b8' }}>
                    वर्तमान में कोई अनुमति अनुरोध लंबित नहीं है।
                  </div>
                ) : (
                  phonePermissions.map((req) => (
                    <div key={req.id} style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 700 }}>
                          {req.requesterName} ({req.requesterPost}) • {req.requesterDistrict}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--khaki-light)', marginTop: '2px' }}>
                          अनुरोधित अधिकारी: <strong>{req.targetName}</strong> • समय: {new Date(req.requestedAt).toLocaleString('hi-IN')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          background: req.status === 'approved' ? 'rgba(16,185,129,0.2)' : req.status === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                          color: req.status === 'approved' ? '#34d399' : req.status === 'rejected' ? '#fca5a5' : '#fcd34d'
                        }}>
                          {req.status === 'approved' ? 'स्वीकृत' : req.status === 'rejected' ? 'अस्वीकृत' : 'लंबित (Pending)'}
                        </span>

                        {req.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = respondPhonePermission(req.id, 'approved');
                                setPhonePermissions(updated);
                              }}
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              स्वीकृत करें
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = respondPhonePermission(req.id, 'rejected');
                                setPhonePermissions(updated);
                              }}
                              style={{
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              अस्वीकृत करें
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: 2FA & MASTER SECURITY SETTINGS (Super Admin Only) */}
          {isAdmin && activeTab === '2fa_settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '640px' }}>
              {/* SECTION 1: SUPER ADMIN MASTER LOGIN PIN CHANGE */}
              <div style={{
                background: 'rgba(153, 27, 27, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="#f87171" />
                  <h4 style={{ margin: 0, color: '#fca5a5', fontSize: '1rem', fontWeight: 700 }}>
                    Super Admin मास्टर लॉगिन पिन (Master Login PIN) बदलें
                  </h4>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                  यह पिन मुख्यालय पुलिस महानिदेशक (Super Admin) पोर्टल में लॉगिन करने हेतु उपयोग किया जाता है। (डिफ़ॉल्ट पिन: <code>1234</code>)
                </p>

                {masterPinMsg && (
                  <div style={{
                    background: masterPinMsg.startsWith('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                    border: masterPinMsg.startsWith('✅') ? '1px solid #10b981' : '1px solid #ef4444',
                    color: masterPinMsg.startsWith('✅') ? '#34d399' : '#fca5a5',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    {masterPinMsg}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>
                      नया मास्टर लॉगिन पिन:
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="नया पिन (कम से कम 4 अंक)"
                      value={newMasterPinInput}
                      onChange={(e) => setNewMasterPinInput(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.76rem' }}>
                      नए पिन की पुष्टि करें:
                    </label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="पुनः नया पिन दर्ज करें"
                      value={confirmMasterPinInput}
                      onChange={(e) => setConfirmMasterPinInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    वर्तमान सक्रिय पिन: <code>{currentMasterPin ? '••••' : '1234'}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newMasterPinInput.trim() || newMasterPinInput.trim().length < 4) {
                        setMasterPinMsg('⚠️ कृपया कम से कम 4 अक्षरों या अंकों का नया पिन दर्ज करें।');
                        return;
                      }
                      if (newMasterPinInput.trim() !== confirmMasterPinInput.trim()) {
                        setMasterPinMsg('⚠️ नया पिन और पुष्टि पिन आपस में मेल नहीं खाते हैं।');
                        return;
                      }
                      saveAdminMasterPin(newMasterPinInput.trim());
                      setCurrentMasterPin(newMasterPinInput.trim());
                      setNewMasterPinInput('');
                      setConfirmMasterPinInput('');
                      setMasterPinMsg('✅ Super Admin का मास्टर लॉगिन पिन सफलतापूर्वक बदल दिया गया है!');
                      setTimeout(() => setMasterPinMsg(''), 4000);
                    }}
                    className="btn btn-danger"
                    style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }}
                  >
                    <KeyRound size={13} />
                    <span>मास्टर पिन अपडेट करें</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: 2FA SETTINGS */}
              <div style={{
                background: 'rgba(30, 58, 138, 0.25)',
                border: '1px solid var(--khaki-primary, #c49756)',
                padding: '1rem',
                borderRadius: '10px'
              }}>
                <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '0.98rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} color="var(--khaki-primary)" />
                  <span>प्रशासक Two-Factor Authentication (2FA) सेटिंग्स</span>
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                  एडमिन एवं को-एडमिन पोर्टल सुरक्षा हेतु द्वि-चरणीय सत्यापन पिन निर्धारित करें।
                </p>
              </div>

              {twoFaMsg && (
                <div style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#34d399', padding: '0.65rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                  {twoFaMsg}
                </div>
              )}

              <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.86rem', color: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={twoFactorConfig.enabled}
                    onChange={(e) => setTwoFactorConfig({ ...twoFactorConfig, enabled: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--khaki-primary)' }}
                  />
                  <span>एडमिन पैनल खोलने हेतु 2FA सुरक्षा अनिवार्य रखें (Enforce 2FA on Entry)</span>
                </label>

                <div>
                  <label className="form-label">मास्टर 2FA सुरक्षा पिन (6-अंक):</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    value={pinChangeInput}
                    onChange={(e) => setPinChangeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="उदा. 998877"
                    style={{ fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: '1.1rem' }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
                    वर्तमान पिन: <code>{twoFactorConfig.secretPin || '998877'}</code>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (pinChangeInput.length < 4) {
                      alert('कृपया कम से कम 4 से 6 अंकों का पिन दर्ज करें।');
                      return;
                    }
                    const updated = { enabled: twoFactorConfig.enabled, secretPin: pinChangeInput };
                    save2FAConfig(updated);
                    setTwoFactorConfig(updated);
                    setTwoFaMsg('✅ 2FA सुरक्षा सेटिंग्स सफलतापूर्वक अपडेट की गईं!');
                    setTimeout(() => setTwoFaMsg(''), 3500);
                  }}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start', padding: '0.55rem 1.25rem' }}
                >
                  सुरक्षा पिन सहेजें (Save PIN)
                </button>
              </div>
            </div>
          )}

          {/* TAB: CLOUD LIVE CHAT (Super Admin Only) */}
          {isAdmin && activeTab === 'cloud_chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '720px' }}>
              {/* Header Info Banner */}
              <div style={{
                background: 'rgba(30, 58, 138, 0.25)',
                border: '1px solid var(--khaki-primary, #c49756)',
                padding: '1rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--khaki-light, #dfb97e)', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Cloud size={20} color={isFirebaseConnected ? '#34d399' : 'var(--khaki-primary)'} />
                    <span>Cloudflare R2 क्लाउड लाइव चैट एवं डायरेक्टरी नियंत्रण</span>
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
                    विभागीय चैट, समूह संदेश एवं डेटा सिंक प्रबंधन (Cloudflare Edge API, 50,000+ कार्मिक)।
                  </p>
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  background: isFirebaseConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: isFirebaseConnected ? '1px solid #10b981' : '1px solid #ef4444',
                  color: isFirebaseConnected ? '#34d399' : '#fca5a5',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isFirebaseConnected ? '#10b981' : '#ef4444'
                  }} />
                  <span>{isFirebaseConnected ? 'Cloudflare R2 लाइव सिंक सक्रिय (Connected)' : 'क्लाउड सिंक निष्क्रिय (Offline)'}</span>
                </div>
              </div>

              {/* Action Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {/* Setup Modal Trigger */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--khaki-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={16} />
                    <span>Cloudflare R2 वर्कर व कुंजियां</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    Cloudflare Worker API URL एवं Admin API Key कॉन्फ़िगर करें अथवा बदलें।
                  </p>
                  <button
                    type="button"
                    onClick={onOpenFirebaseSetup}
                    style={{
                      background: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: 'auto'
                    }}
                  >
                    <Cloud size={15} />
                    <span>Cloudflare R2 क्लाउड सेटअप खोलें</span>
                  </button>
                </div>

                {/* Sync Directory to Cloud */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--khaki-light)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} />
                    <span>समस्त डायरेक्टरी डेटाबेस सिंक</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    समस्त विभागीय पुलिस संपर्कों को सीधे Cloudflare R2 क्लाउड पर सिंक करें ताकि सभी अधिकृत यूज़र्स तक डेटा पहुंचे।
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!isFirebaseConnected) {
                        alert('कृपया पहले Cloudflare R2 सेटअप पूरा करें!');
                        return;
                      }
                      try {
                        await syncAllContactsToFirestore(contacts);
                        alert('🎉 समस्त पुलिस संपर्क Cloudflare R2 क्लाउड पर सफलतापूर्वक सिंक हो गए!');
                      } catch (err) {
                        alert('सिंक विफल: ' + err.message);
                      }
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #15803d, #166534)',
                      border: 'none',
                      color: '#fff',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      marginTop: 'auto'
                    }}
                  >
                    <RefreshCw size={15} />
                    <span>क्लाउड पर तुरंत सिंक करें</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Password Reset Prompt */}
        {resetPromptUser && (
          <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setResetPromptUser(null)}>
            <div className="modal-content" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={18} color="var(--gold-primary)" />
                पासवर्ड रीसेट ({resetPromptUser.name})
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                कर्मचारी का नया पासवर्ड दर्ज करें (डिफ़ॉल्ट: 1234):
              </p>

              <form onSubmit={handlePasswordResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  value={newPassInput}
                  onChange={e => setNewPassInput(e.target.value)}
                  placeholder="नया पासवर्ड"
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setResetPromptUser(null)}>
                    रद्द करें
                  </button>
                  <button type="submit" className="btn btn-primary">
                    रीसेट सुरक्षित करें
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Co-Admin */}
        {showAddCoAdminModal && (
          <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowAddCoAdminModal(false)}>
            <div className="modal-content" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={18} color="var(--gold-primary)" />
                नया ज़िला Co-Admin जोड़ें
              </h3>

              <form onSubmit={handleCreateCoAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">अधिकारी का नाम व पद</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. आलोक श्रीवास्तव (DSP/नोडल)"
                    value={newCoAdminForm.name}
                    onChange={e => setNewCoAdminForm({ ...newCoAdminForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ज़िला चुनें</label>
                  <select
                    className="form-select"
                    value={newCoAdminForm.district}
                    onChange={e => setNewCoAdminForm({ ...newCoAdminForm, district: e.target.value })}
                  >
                    {safeDistricts.filter((_, i) => i > 0).map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">लॉगिन यूजरनेम</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="उदा. coadmin_varanasi"
                    value={newCoAdminForm.username}
                    onChange={e => setNewCoAdminForm({ ...newCoAdminForm, username: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="मोबाइल नंबर"
                    value={newCoAdminForm.phone}
                    onChange={e => setNewCoAdminForm({ ...newCoAdminForm, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">प्रारंभिक पासवर्ड</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="1234"
                    value={newCoAdminForm.password}
                    onChange={e => setNewCoAdminForm({ ...newCoAdminForm, password: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddCoAdminModal(false)}>
                    रद्द करें
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Co-Admin बनाएं
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
