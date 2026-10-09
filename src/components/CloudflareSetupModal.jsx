import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, CheckCircle2, AlertCircle, Database, 
  ExternalLink, Key, RefreshCw, Trash2, Check, Copy, Shield, Server
} from 'lucide-react';
import { 
  getStoredCloudflareConfig, 
  saveCloudflareConfig, 
  clearCloudflareConfig, 
  isCloudflareConfigured,
  testCloudflareConnection,
  syncAllContactsToCloudflare
} from '../utils/cloudflareR2';

export default function CloudflareSetupModal({ 
  isOpen, 
  onClose, 
  currentUser,
  currentContacts = [],
  onSyncSuccess 
}) {
  const [workerUrl, setWorkerUrl] = useState('');
  const [adminApiKey, setAdminApiKey] = useState('police_admin_2026');
  const [bucketName, setBucketName] = useState('police-directory-bucket');
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredCloudflareConfig();
      if (cfg) {
        setWorkerUrl(cfg.workerUrl || '');
        setAdminApiKey(cfg.adminApiKey || 'police_admin_2026');
        setBucketName(cfg.bucketName || 'police-directory-bucket');
        setIsLiveConnected(isCloudflareConfigured());
      }
      setStatusMessage({ text: '', type: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!workerUrl.trim()) {
      setStatusMessage({ text: 'कृपया Cloudflare Worker URL दर्ज करें।', type: 'error' });
      return;
    }
    setIsTesting(true);
    setStatusMessage({ text: '🔄 Cloudflare R2 से संपर्क किया जा रहा है...', type: 'info' });
    const res = await testCloudflareConnection(workerUrl.trim(), adminApiKey.trim());
    setIsTesting(false);
    if (res.ok) {
      setStatusMessage({ text: res.message, type: 'success' });
      setIsLiveConnected(true);
    } else {
      setStatusMessage({ text: `❌ ${res.message}`, type: 'error' });
    }
  };

  const handleSaveConfig = async () => {
    if (!workerUrl.trim()) {
      setStatusMessage({ text: 'कृपया Worker URL अवश्य भरें।', type: 'error' });
      return;
    }

    const cfg = {
      workerUrl: workerUrl.trim().replace(/\/+$/, ''),
      adminApiKey: adminApiKey.trim() || 'police_admin_2026',
      bucketName: bucketName.trim() || 'police-directory-bucket'
    };

    const ok = await saveCloudflareConfig(cfg);
    if (ok) {
      setIsLiveConnected(true);
      setStatusMessage({ 
        text: '✅ Cloudflare R2 सेटिंग्स सुरक्षित हो गईं! असीमित यूज़र्स (50,000+) हेतु तैयार।', 
        type: 'success' 
      });
      if (onSyncSuccess) onSyncSuccess();
    } else {
      setStatusMessage({ text: 'सेटिंग्स सेव करने में समस्या आई।', type: 'error' });
    }
  };

  const handleClearConfig = async () => {
    if (window.confirm('क्या आप Cloudflare R2 सेटिंग्स को रीसेट करना चाहते हैं?')) {
      await clearCloudflareConfig();
      setWorkerUrl('');
      setIsLiveConnected(false);
      setStatusMessage({ text: 'Cloudflare R2 सेटिंग्स हटा दी गईं।', type: 'info' });
      if (onSyncSuccess) onSyncSuccess();
    }
  };

  const handleUploadCurrentData = async () => {
    if (!currentContacts || currentContacts.length === 0) {
      setStatusMessage({ text: 'अपलोड करने हेतु कोई संपर्क मौजूद नहीं है।', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setStatusMessage({ text: `Cloudflare R2 पर ${currentContacts.length} संपर्क अपलोड हो रहे हैं...`, type: 'info' });

    try {
      const ok = await syncAllContactsToCloudflare(currentContacts);
      if (ok) {
        setStatusMessage({ 
          text: `✅ कुल ${currentContacts.length} संपर्क Cloudflare R2 पर सफलतापूर्वक अपलोड हो गए!`, 
          type: 'success' 
        });
      } else {
        setStatusMessage({ text: 'डेटा अपलोड विफल रहा। कृपया Worker URL और API Key जांचें।', type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `त्रुटि: ${err.message || 'अपलोड विफल'}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: '#0f172a',
        border: '1.5px solid rgba(245, 158, 11, 0.4)',
        borderRadius: '16px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        color: '#f8fafc',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        padding: '1.5rem'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cloud size={22} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                Cloudflare R2 क्लाउड सेटअप
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                50,000+ यूज़र्स हेतु हाई-स्पीड ज़ीरो-कोटा क्लाउड स्टोरेज
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          background: isLiveConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${isLiveConnected ? '#10b981' : '#ef4444'}`,
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: isLiveConnected ? '#10b981' : '#ef4444',
              boxShadow: isLiveConnected ? '0 0 8px #10b981' : 'none'
            }} />
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: isLiveConnected ? '#34d399' : '#f87171' }}>
              {isLiveConnected ? 'Cloudflare R2 क्लाउड सक्रिय है' : 'Cloudflare R2 कनेक्ट नहीं है'}
            </span>
          </div>
          {isLiveConnected && (
            <button 
              onClick={handleClearConfig}
              className="btn"
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px' }}
            >
              डिस्कनेक्ट करें
            </button>
          )}
        </div>

        {/* Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              🌐 Cloudflare Worker URL (या Custom API Domain):
            </label>
            <input 
              type="text"
              value={workerUrl}
              onChange={(e) => setWorkerUrl(e.target.value)}
              placeholder="https://police-directory-r2-api.workers.dev"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              * Cloudflare Worker डिप्लॉय करने के बाद प्राप्त URL यहाँ दर्ज करें।
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              🔑 Admin API Key (सुरक्षा पासवर्ड):
            </label>
            <input 
              type="text"
              value={adminApiKey}
              onChange={(e) => setAdminApiKey(e.target.value)}
              placeholder="police_admin_2026"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
              * डिफ़ॉल्ट: <code>police_admin_2026</code> (wrangler.toml में सेट की गई की)
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '6px' }}>
              🪣 R2 Bucket का नाम:
            </label>
            <input 
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="police-directory-bucket"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
          </div>
        </div>

        {/* Status Message */}
        {statusMessage.text && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            border: `1px solid ${statusMessage.type === 'success' ? '#10b981' : statusMessage.type === 'error' ? '#ef4444' : '#3b82f6'}`,
            color: statusMessage.type === 'success' ? '#6ee7b7' : statusMessage.type === 'error' ? '#fca5a5' : '#93c5fd'
          }}>
            {statusMessage.text}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
              <span>{isTesting ? 'जांच जारी...' : 'कनेक्शन टेस्ट'}</span>
            </button>

            {isLiveConnected && (
              <button
                onClick={handleUploadCurrentData}
                disabled={isSyncing}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Cloud size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'अपलोड हो रहा है...' : 'डेटा सिंक करें'}</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem' }}
            >
              बंद करें
            </button>
            <button
              onClick={handleSaveConfig}
              className="btn btn-primary"
              style={{
                padding: '0.55rem 1.1rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #f97316, #ea580c)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>सेव एवं कनेक्ट करें</span>
            </button>
          </div>
        </div>

        {/* Quick Instructions Footer */}
        <div style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid #334155',
          fontSize: '0.75rem',
          color: '#94a3b8'
        }}>
          💡 <strong>त्वरित निर्देश:</strong> प्रोजेक्ट के मुख्य फ़ोल्डर में <code>cloudflare-worker/worker.js</code> और <code>wrangler.toml</code> तैयार है। टर्मिनल में <code>npx wrangler deploy</code> चलाकर तुरंत अपना Worker एक्टिवेट कर सकते हैं।
        </div>
      </div>
    </div>
  );
}
