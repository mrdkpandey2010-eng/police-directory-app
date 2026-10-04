import React, { useState, useRef } from 'react';
import { 
  X, Lock, Unlock, FileSpreadsheet, Download, Upload, CheckCircle, 
  XCircle, Edit3, Trash2, Clock, Users, Shield, KeyRound, Plus, 
  ShieldCheck, Settings, Power, UserCheck, UserX, Award, Building2, MapPin
} from 'lucide-react';
import { downloadSampleExcel, importContactsFromExcel } from '../utils/storage';

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  contacts, 
  currentUser,
  coAdmins,
  posts,
  offices,
  districts,
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
  onDeletePost,
  onAddOffice,
  onDeleteOffice,
  onAddDistrict,
  onDeleteDistrict
}) {
  const isAdmin = currentUser?.role === 'admin';
  const isCoAdmin = currentUser?.role === 'co_admin';
  const myDistrict = isCoAdmin ? currentUser.district : null;

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'manage' | 'excel' | 'coadmins' | 'master'
  const [masterSubTab, setMasterSubTab] = useState('posts'); // 'posts' | 'offices' | 'districts'
  
  // Excel upload states
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importStatusMsg, setImportStatusMsg] = useState(null);
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
    district: districts[1] || 'लखनऊ',
    phone: '',
    password: '1234'
  });
  const [showAddCoAdminModal, setShowAddCoAdminModal] = useState(false);

  // Promote existing user to Co-Admin modal state
  const [selectedUserIdToPromote, setSelectedUserIdToPromote] = useState('');
  const [promoteDistrict, setPromoteDistrict] = useState(districts[1] || 'लखनऊ');

  // Master Data Inputs
  const [newPostInput, setNewPostInput] = useState('');
  const [newOfficeInput, setNewOfficeInput] = useState('');
  const [newDistrictInput, setNewDistrictInput] = useState('');

  if (!isOpen) return null;

  // Filter contacts by Co-Admin district scope if Co-Admin
  const scopedContacts = isCoAdmin 
    ? contacts.filter(c => c.district === myDistrict)
    : contacts;

  const pendingList = scopedContacts.filter(c => c.status === 'pending');
  const approvedList = scopedContacts.filter(c => c.status === 'approved' || c.status === 'active');
  const inactiveList = scopedContacts.filter(c => c.status === 'inactive');
  const blockedList = scopedContacts.filter(c => c.status === 'blocked');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setExcelFile(file);
      setImportStatusMsg(null);
    }
  };

  const handleProcessExcel = async () => {
    if (!excelFile) return;
    setIsUploading(true);
    setImportStatusMsg(null);

    try {
      const res = await importContactsFromExcel(excelFile, contacts, myDistrict);
      onContactsImported(res.updatedContacts);
      setImportStatusMsg({
        type: 'success',
        text: `सफलतापूर्वक निष्पादित! नए जोड़े गए: ${res.addedCount}, अपडेट किए गए: ${res.updatedCount}।`
      });
      setExcelFile(null);
    } catch (err) {
      setImportStatusMsg({
        type: 'error',
        text: err.message || 'एक्सेल फ़ाइल लोड करने में समस्या आई।'
      });
    } finally {
      setIsUploading(false);
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
      district: districts[1] || 'लखनऊ',
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
    onAddOffice(newOfficeInput.trim());
    setNewOfficeInput('');
  };

  const handleAddNewDistrict = (e) => {
    e.preventDefault();
    if (!newDistrictInput.trim()) return;
    onAddDistrict(newDistrictInput.trim());
    setNewDistrictInput('');
  };

  const filteredAdminContacts = scopedContacts.filter(c => {
    if (!adminSearch) return true;
    const q = adminSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.pno.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.office.toLowerCase().includes(q) ||
      c.post.toLowerCase().includes(q)
    );
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '980px' }} onClick={e => e.stopPropagation()}>
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
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
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
                  Co-Admin प्रबंधन ({coAdmins.length})
                </button>

                <button 
                  className={`admin-tab ${activeTab === 'master' ? 'active' : ''}`}
                  onClick={() => setActiveTab('master')}
                >
                  <Settings size={16} />
                  मास्टर सेटिंग्स (पद व कार्यालय)
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
                            आवेदन: {new Date(item.createdAt).toLocaleDateString('hi-IN')}
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
                                      if (matchedCa) onRevokeCoAdmin(matchedCa.id);
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>
                  सैंपल एक्सेल फ़ॉर्मेट डाउनलोड करें
                </span>
                <button className="btn btn-secondary" onClick={downloadSampleExcel}>
                  <Download size={16} color="var(--gold-primary)" />
                  सैंपल Excel टेंपलेट डाउनलोड करें (.xlsx)
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
                    समर्थित प्रारूप: .xlsx, .xls, .csv (कॉलम: PNO, Name, Post, District, Office, Phone, WhatsApp, Email, Password)
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

              {excelFile && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button className="btn btn-secondary" onClick={() => setExcelFile(null)}>
                    फ़ाइल हटाएँ
                  </button>
                  <button className="btn btn-primary" onClick={handleProcessExcel} disabled={isUploading}>
                    <Upload size={16} />
                    {isUploading ? "प्रोसेस हो रहा है..." : "एक्सेल डेटा इम्पोर्ट एवं अपडेट करें"}
                  </button>
                </div>
              )}

              {importStatusMsg && (
                <div className={`status-tag ${importStatusMsg.type === 'success' ? 'status-approved' : 'status-blocked'}`} style={{ padding: '0.85rem 1rem', fontSize: '0.9rem', width: '100%', borderRadius: '8px' }}>
                  {importStatusMsg.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  {importStatusMsg.text}
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
                      const u = contacts.find(c => c.id === e.target.value);
                      if (u) setPromoteDistrict(u.district);
                    }}
                    required
                  >
                    <option value="">-- पुलिस कर्मचारी चुनें --</option>
                    {contacts.map(c => (
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
                    {districts.filter((_, i) => i > 0).map((d, i) => (
                      <option key={i} value={d}>{d} ज़िला</option>
                    ))}
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
                  वर्तमान ज़िला Co-Admin सूची ({coAdmins.length})
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
                    {coAdmins.map(ca => {
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
                    })}
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
                  पद / पदनाम प्रबंधन ({posts.length - 1})
                </button>

                <button
                  className={`admin-tab ${masterSubTab === 'offices' ? 'active' : ''}`}
                  onClick={() => setMasterSubTab('offices')}
                >
                  <Building2 size={15} />
                  कार्यालय / थाना प्रबंधन ({offices.length - 1})
                </button>

                <button
                  className={`admin-tab ${masterSubTab === 'districts' ? 'active' : ''}`}
                  onClick={() => setMasterSubTab('districts')}
                >
                  <MapPin size={15} />
                  ज़िला प्रबंधन ({districts.length - 1})
                </button>
              </div>

              {/* SUB TAB: POSTS */}
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
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {posts.filter((_, idx) => idx > 0).map((post, idx) => (
                      <span key={idx} className="pill" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        {post}
                        <X size={14} className="pill-remove" onClick={() => onDeletePost(post)} title="यह पद हटाएं" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB TAB: OFFICES */}
              {masterSubTab === 'offices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <form onSubmit={handleAddNewOffice} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="उदा. थाना सुशांत गोल्फ सिटी / महिला हेल्पडेस्क / एटीएस"
                      value={newOfficeInput}
                      onChange={e => setNewOfficeInput(e.target.value)}
                      style={{ flex: '1 1 260px' }}
                      required
                    />
                    <button type="submit" className="btn btn-primary">
                      <Plus size={16} />
                      नया कार्यालय/थाना जोड़ें
                    </button>
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {offices.filter((_, idx) => idx > 0).map((office, idx) => (
                      <span key={idx} className="pill" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        {office}
                        <X size={14} className="pill-remove" onClick={() => onDeleteOffice(office)} title="यह कार्यालय हटाएं" />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB TAB: DISTRICTS */}
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
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {districts.filter((_, idx) => idx > 0).map((dist, idx) => (
                      <span key={idx} className="pill" style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
                        {dist}
                        <X size={14} className="pill-remove" onClick={() => onDeleteDistrict(dist)} title="यह ज़िला हटाएं" />
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
                    {districts.filter((_, i) => i > 0).map((d, i) => (
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
