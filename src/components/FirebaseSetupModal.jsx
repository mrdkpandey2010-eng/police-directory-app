import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, CheckCircle2, AlertCircle, Database, 
  ExternalLink, Key, RefreshCw, Trash2, Check, Copy, Shield
} from 'lucide-react';
import { 
  getStoredFirebaseConfig, 
  saveFirebaseConfig, 
  clearFirebaseConfig, 
  isFirebaseConfigured,
  syncAllChatsToFirestore 
} from '../utils/firebase';

export default function FirebaseSetupModal({ 
  isOpen, 
  onClose, 
  currentUser,
  currentChats = [],
  onSyncSuccess 
}) {
  const [apiKey, setApiKey] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [rawJson, setRawJson] = useState('');
  const [inputMode, setInputMode] = useState('json'); // 'json' | 'manual'
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredFirebaseConfig();
      if (cfg) {
        setApiKey(cfg.apiKey || '');
        setProjectId(cfg.projectId || '');
        setAuthDomain(cfg.authDomain || '');
        setStorageBucket(cfg.storageBucket || '');
        setMessagingSenderId(cfg.messagingSenderId || '');
        setAppId(cfg.appId || '');
        setIsLiveConnected(true);
      } else {
        setIsLiveConnected(false);
      }
      setStatusMessage({ text: '', type: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto-parse JSON or JS object pasted by user
  const handleParseJson = (text) => {
    setRawJson(text);
    if (!text.trim()) return;

    try {
      // Regex extraction to support standard JS object strings or pure JSON
      const extractField = (key) => {
        const re = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
        const match = text.match(re);
        return match ? match[1] : '';
      };

      const extractedApiKey = extractField('apiKey');
      const extractedProjectId = extractField('projectId');
      const extractedAuthDomain = extractField('authDomain');
      const extractedStorageBucket = extractField('storageBucket');
      const extractedMessagingSenderId = extractField('messagingSenderId');
      const extractedAppId = extractField('appId');

      if (extractedApiKey) setApiKey(extractedApiKey);
      if (extractedProjectId) setProjectId(extractedProjectId);
      if (extractedAuthDomain) setAuthDomain(extractedAuthDomain);
      if (extractedStorageBucket) setStorageBucket(extractedStorageBucket);
      if (extractedMessagingSenderId) setMessagingSenderId(extractedMessagingSenderId);
      if (extractedAppId) setAppId(extractedAppId);

      if (extractedApiKey && extractedProjectId) {
        setStatusMessage({ text: '✅ Firebase कीज़ सफलतापूर्वक पहचान ली गईं! अब "सेव करें" दबाएं।', type: 'success' });
      }
    } catch (e) {
      // Fallback
    }
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim() || !projectId.trim()) {
      setStatusMessage({ text: 'कृपया कम से कम API Key और Project ID अवश्य भरें।', type: 'error' });
      return;
    }

    const config = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim()
    };

    const ok = await saveFirebaseConfig(config);
    if (ok) {
      setIsLiveConnected(true);
      setStatusMessage({ 
        text: '🎉 Google Firebase सफलतापूर्वक कनेक्ट हो गया! अब सभी फोन पर लाइव मैसेजिंग सक्रिय है।', 
        type: 'success' 
      });
      if (onSyncSuccess) onSyncSuccess();
    } else {
      setStatusMessage({ text: 'Firebase इनिशियलाइज़ेशन में समस्या आई। कृपया कीज़ की जांच करें।', type: 'error' });
    }
  };

  const handleClear = async () => {
    if (window.confirm('क्या आप Firebase डिस्कनेक्ट करके ऑफ़लाइन लोकल स्टोरेज मोड में वापस जाना चाहते हैं?')) {
      await clearFirebaseConfig();
      setApiKey('');
      setProjectId('');
      setAuthDomain('');
      setStorageBucket('');
      setMessagingSenderId('');
      setAppId('');
      setRawJson('');
      setIsLiveConnected(false);
      setStatusMessage({ text: 'Firebase डिस्कनेक्ट कर दिया गया। ऐप अब लोकल मोड में है।', type: 'info' });
      if (onSyncSuccess) onSyncSuccess();
    }
  };

  const handleUploadCurrentData = async () => {
    if (!isLiveConnected) {
      setStatusMessage({ text: 'पहले Firebase को कनेक्ट और सेव करें।', type: 'error' });
      return;
    }
    setIsSyncing(true);
    setStatusMessage({ text: 'डेटा क्लाउड पर अपलोड हो रहा है...', type: 'info' });

    try {
      const ok = await syncAllChatsToFirestore(currentChats);
      if (ok) {
        setStatusMessage({ text: '✅ सभी चैट्स और संदेश Google Firebase क्लाउड पर सिंक हो गए!', type: 'success' });
      } else {
        setStatusMessage({ text: 'डेटा सिंक में समस्या आई। कृपया Firestore रूल्स चेक करें।', type: 'error' });
      }
    } catch (err) {
      setStatusMessage({ text: `त्रुटि: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(229,184,66,0.3)', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: 'rgba(234,179,8,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--gold-primary)' }}>
              <Cloud size={22} color="var(--gold-primary)" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--gold-primary)' }}>
                Google Firebase क्लाउड लाइव चैट सेटअप
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                विभिन्न मोबाइलों और कंप्यूटरों के बीच रियल-टाइम संदेश सिंक हेतु
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Status Badge */}
          <div style={{ 
            background: isLiveConnected ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)', 
            border: isLiveConnected ? '1px solid #10b981' : '1px solid #eab308', 
            borderRadius: '8px', 
            padding: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isLiveConnected ? (
                <CheckCircle2 size={24} color="#10b981" />
              ) : (
                <AlertCircle size={24} color="#eab308" />
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isLiveConnected ? '#34d399' : '#fde047' }}>
                  {isLiveConnected ? '🟢 Firebase रियल-टाइम क्लाउड सक्रिय (Connected & Live)' : '🟠 ऑफ़लाइन / लोकल मोड (Local Storage Only)'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#cbd5e1' }}>
                  {isLiveConnected 
                    ? `प्रोजेक्ट: "${projectId}" — अब किसी भी फोन से भेजा गया संदेश तुरंत सभी को मिलेगा।`
                    : 'Firebase कॉन्फ़िग नहीं है। संदेश केवल इसी ब्राउज़र तक सीमित हैं। नीचे कीज़ जोड़ें।'}
                </div>
              </div>
            </div>

            {isLiveConnected && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid #ef4444',
                  color: '#fca5a5',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="डिस्कनेक्ट करें"
              >
                <Trash2 size={12} />
                <span>डिस्कनेक्ट</span>
              </button>
            )}
          </div>

          {/* Status Alert Banner */}
          {statusMessage.text && (
            <div style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              background: statusMessage.type === 'success' ? 'rgba(16,185,129,0.2)' : statusMessage.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
              border: statusMessage.type === 'success' ? '1px solid #10b981' : statusMessage.type === 'error' ? '1px solid #ef4444' : '1px solid #3b82f6',
              color: statusMessage.type === 'success' ? '#6ee7b7' : statusMessage.type === 'error' ? '#fca5a5' : '#93c5fd'
            }}>
              {statusMessage.text}
            </div>
          )}

          {/* Quick Step Guide */}
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📋 2 मिनट में मुफ्त Firebase प्रोजेक्ट कैसे बनाएं:</span>
              <a 
                href="https://console.firebase.google.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}
              >
                <span>Firebase Console खोलें</span>
                <ExternalLink size={11} />
              </a>
            </div>
            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              <li><strong>console.firebase.google.com</strong> पर जाकर <strong>"Create a project"</strong> (उदा. <code>police-directory</code>) बनाएं।</li>
              <li>बाईं तरफ <strong>Build &gt; Firestore Database</strong> पर क्लिक करके <strong>"Create database"</strong> (Start in test mode) चुनें।</li>
              <li>प्रोजेक्ट सेटिंग्स (⚙️) &gt; <strong>Web App (&lt;/&gt;)</strong> जोड़ें और नीचे दिया गया <strong>firebaseConfig</strong> कॉपी करके यहाँ पेस्ट करें।</li>
            </ol>
            <div style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '6px', padding: '0.45rem 0.65rem', marginTop: '8px', fontSize: '0.73rem', color: '#fef08a' }}>
              💡 <strong>Firestore Rules टिप:</strong> Firebase Console &gt; Firestore Database &gt; Rules में <code>allow read, write: if true;</code> सेट करें ताकि सभी पुलिस कार्मिक डिवाइसों के बीच संदेश बिना किसी रुकावट के लाइव सिंक हो सकें।
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
            <button
              type="button"
              onClick={() => setInputMode('json')}
              style={{
                background: inputMode === 'json' ? 'var(--gold-primary)' : 'transparent',
                color: inputMode === 'json' ? '#0f172a' : 'var(--text-dim)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              1-क्लिक पेस्ट (Quick Paste JSON/JS)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              style={{
                background: inputMode === 'manual' ? 'var(--gold-primary)' : 'transparent',
                color: inputMode === 'manual' ? '#0f172a' : 'var(--text-dim)',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              मैन्युअल फ़ील्ड्स (Individual Fields)
            </button>
          </div>

          {/* Input Mode 1: Quick Paste */}
          {inputMode === 'json' ? (
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>
                Firebase SDK कोड यहाँ पेस्ट करें:
              </label>
              <textarea
                value={rawJson}
                onChange={(e) => handleParseJson(e.target.value)}
                placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "my-police.firebaseapp.com",\n  projectId: "my-police-123",\n  storageBucket: "my-police-123.appspot.com",\n  messagingSenderId: "123456789",\n  appId: "1:1234:web:abcd"\n};`}
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(15,23,42,0.8)',
                  color: '#38bdf8',
                  fontSize: '0.76rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                * ऊपर कोड पेस्ट करते ही फ़ील्ड्स अपने-आप भर जाएंगी।
              </span>
            </div>
          ) : (
            /* Input Mode 2: Manual fields */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>API Key *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: '#1e293b', color: '#fff', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>Project ID *</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="police-directory-123"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: '#1e293b', color: '#fff', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>Auth Domain</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="project.firebaseapp.com"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: '#1e293b', color: '#fff', fontSize: '0.78rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'block', marginBottom: '2px' }}>App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:123456:web:abcd"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: '#1e293b', color: '#fff', fontSize: '0.78rem' }}
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="modal-footer" style={{ 
          borderTop: '1px solid rgba(255,255,255,0.1)', 
          padding: '0.85rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px'
        }}>
          {isLiveConnected ? (
            <button
              onClick={handleUploadCurrentData}
              disabled={isSyncing}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="स्थानीय डेटा को Firebase Cloud पर अपलोड करें"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'सिंक हो रहा है...' : 'क्लाउड पर डेटा अपलोड करें'}</span>
            </button>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
              * कीज़ सुरक्षित रूप से ब्राउज़र में सेव होती हैं।
            </div>
          )}

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
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle2 size={15} />
              <span>सेव एवं कनेक्ट करें</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
