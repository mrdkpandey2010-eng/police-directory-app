import React, { useState } from 'react';
import { 
  ShieldAlert, Camera, Upload, CheckCircle2, AlertTriangle, 
  User, Shield, LogOut 
} from 'lucide-react';
import { validateFileSize, compressImage } from '../utils/imageCompressor';

export default function UniformPhotoGate({ 
  currentUser, 
  onSavePhoto, 
  onLogout,
  onDismiss
}) {
  const [photoPreview, setPhotoPreview] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // File change handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('कृपया केवल इमेज (JPG / PNG) फ़ाइल ही चुनें।');
      return;
    }

    const sizeCheck = validateFileSize(file, 'photo');
    if (!sizeCheck.valid) {
      setErrorMsg(sizeCheck.error);
      return;
    }

    setErrorMsg('');
    try {
      const compressedUrl = await compressImage(file, 480, 480, 0.75);
      setPhotoPreview(compressedUrl);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit and verify photo
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!photoPreview) {
      setErrorMsg('कृपया अपनी वर्दी वाली स्पष्ट फोटो चुनें या अपलोड करें।');
      return;
    }

    setIsUploading(true);
    setTimeout(() => {
      onSavePhoto(photoPreview);
      setIsUploading(false);
    }, 600);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 10, 24, 0.96)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        background: 'var(--card-bg, #0f1d38)',
        border: '2px solid rgba(245, 158, 11, 0.5)',
        borderRadius: '16px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.2)',
        overflow: 'hidden',
        color: '#fff'
      }}>
        {/* Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #78350f, #b45309)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '10px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <ShieldAlert size={28} color="#fef08a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fef08a' }}>
                वर्दी (यूनिफॉर्म) फोटो सत्यापन अनिवार्य
              </h2>
              <span style={{ fontSize: '0.78rem', color: '#fef3c7', opacity: 0.9 }}>
                Police Department Identity & Uniform Verification
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="होम स्क्रीन पर जाएं"
              >
                बाद में करें (होम स्क्रीन)
              </button>
            )}
            <button 
              onClick={onLogout}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fef3c7',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="लॉगआउट करें"
            >
              <LogOut size={13} />
              लॉगआउट
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Officer Info Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--gold-light, #fbbf24)' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                {currentUser?.post} • {currentUser?.office} ({currentUser?.district})
              </div>
            </div>
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}>
              फोटो प्रतीक्षारत
            </div>
          </div>

          {/* Mandatory Policy Alert */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '10px',
            padding: '0.85rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: '#fde68a',
            display: 'flex',
            gap: '0.6rem'
          }}>
            <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>विभागीय सुरक्षा निर्देश:</strong> रजिस्ट्रेशन के उपरांत ऐप का संचालन करने के लिए प्रोफाइल में <strong>यूनिफॉर्म वाली स्पष्ट फोटो</strong> अपलोड होना अनिवार्य है। जब तक आप वर्दी वाली फोटो अपलोड कर सत्यापित नहीं करेंगे, ऐप का संचालन अवरुद्ध रहेगा।
            </div>
          </div>

          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Photo Preview & Upload Box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.25rem',
            border: '2px dashed rgba(229, 184, 66, 0.4)',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.25)',
            marginBottom: '1.5rem'
          }}>
            {/* Avatar Frame */}
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              border: photoPreview ? '3px solid var(--gold-primary, #e5b842)' : '3px dashed rgba(255,255,255,0.3)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: photoPreview ? '#000' : 'rgba(255,255,255,0.05)',
              boxShadow: photoPreview ? '0 0 20px rgba(229,184,66,0.4)' : 'none',
              position: 'relative'
            }}>
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Uniform Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <Camera size={36} />
                  <div style={{ fontSize: '0.68rem', marginTop: '4px' }}>वर्दी फोटो</div>
                </div>
              )}
            </div>

            {/* Selection Options */}
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {/* Live Camera Capture */}
              <label style={{
                background: 'linear-gradient(135deg, #991b1b, #7f1d1d)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Camera size={15} />
                <span>कैमरा से लाइव फ़ोटो खींचें</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="user"
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>

              {/* Gallery / File Upload */}
              <label style={{
                background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Upload size={15} />
                <span>गैलरी / फ़ाइल से चुनें</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
              समर्थित प्रारूप: JPG, PNG, WEBP (अधिकतम 3 MB)
            </div>
          </div>

          {/* Verification CTA */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!photoPreview || isUploading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: photoPreview 
                ? 'linear-gradient(135deg, #059669, #10b981)' 
                : 'rgba(255,255,255,0.1)',
              color: photoPreview ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: photoPreview ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: photoPreview ? '0 4px 15px rgba(16,185,129,0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={18} />
            <span>{isUploading ? 'सत्यापित किया जा रहा है...' : 'फोटो सत्यापित करें एवं ऐप का संचालन शुरू करें'}</span>
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.06)',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer'
              }}
            >
              बाद में अपलोड करें (सीधे होम स्क्रीन निर्देशिका देखें)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
