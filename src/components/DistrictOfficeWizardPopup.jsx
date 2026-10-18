import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Building2, Award, ArrowLeft, X, Search, ChevronRight } from 'lucide-react';

export default function DistrictOfficeWizardPopup({
  districts = [],
  offices = [],
  posts = [],
  contacts = [],
  currentUser = null,
  initialDistrict = '',
  onSelectComplete,
  onClose
}) {
  const popupRef = useRef(null);

  // 3-Stage Wizard: 'district' -> 'office' -> 'post'
  const [stage, setStage] = useState('district');
  const [selectedDist, setSelectedDist] = useState(initialDistrict || '');
  const [selectedOff, setSelectedOff] = useState('');
  const [filterText, setFilterText] = useState('');

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        if (onClose) onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Stage 1: Authorized Districts list (Scoped by role)
  const authorizedDistricts = useMemo(() => {
    let list = Array.isArray(districts) ? districts : [];
    list = list.filter(d => d && d !== 'सभी ज़िले (All Districts)' && d !== 'सभी ज़िले');

    if (!currentUser) return list;
    if (currentUser.role === 'admin') return list;
    if ((currentUser.role === 'user' || currentUser.role === 'co_admin') && currentUser.district) {
      return [currentUser.district];
    }
    if (currentUser.allowedDistricts && Array.isArray(currentUser.allowedDistricts) && currentUser.allowedDistricts.length > 0) {
      return currentUser.allowedDistricts;
    }
    return list;
  }, [districts, currentUser]);

  // Filtered districts by user typing
  const displayedDistricts = useMemo(() => {
    if (!filterText.trim()) return authorizedDistricts;
    const q = filterText.toLowerCase().trim();
    return authorizedDistricts.filter(d => d.toLowerCase().includes(q));
  }, [authorizedDistricts, filterText]);

  // Stage 2: Available Offices in selected District
  const availableOffices = useMemo(() => {
    if (!selectedDist) return [];

    const officeSet = new Set();
    // From master offices list
    if (Array.isArray(offices)) {
      offices.forEach(o => {
        const name = typeof o === 'string' ? o : o.name;
        const dist = typeof o === 'object' ? o.district : null;
        if (name && !name.includes('सभी कार्यालय/थाने') && !name.includes('सभी')) {
          if (!dist || dist.trim().toLowerCase() === selectedDist.trim().toLowerCase()) {
            officeSet.add(name.trim());
          }
        }
      });
    }

    // Also collect offices from actual contacts in this district
    if (Array.isArray(contacts)) {
      contacts.forEach(c => {
        if (c.district && c.district.trim().toLowerCase() === selectedDist.trim().toLowerCase() && c.office) {
          const off = c.office.trim();
          if (off && !off.includes('सभी')) {
            officeSet.add(off);
          }
        }
      });
    }

    const sorted = Array.from(officeSet).sort((a, b) => a.localeCompare(b, 'hi'));
    return sorted;
  }, [offices, contacts, selectedDist]);

  const displayedOffices = useMemo(() => {
    if (!filterText.trim()) return availableOffices;
    const q = filterText.toLowerCase().trim();
    return availableOffices.filter(o => o.toLowerCase().includes(q));
  }, [availableOffices, filterText]);

  // Stage 3: Available Designations/Ranks (for selected office)
  const availablePosts = useMemo(() => {
    const list = Array.isArray(posts) ? posts : [];
    const cleanMaster = list.filter(p => p && p !== 'सभी पद (All Posts)' && p !== 'सभी पद');

    // Find designations specifically present in this office
    const officePosts = new Set();
    if (selectedDist && selectedOff && Array.isArray(contacts)) {
      contacts.forEach(c => {
        if (
          (c.district || '').trim().toLowerCase() === selectedDist.trim().toLowerCase() &&
          (c.office || '').trim().toLowerCase() === selectedOff.trim().toLowerCase() &&
          c.post
        ) {
          officePosts.add(c.post.trim());
        }
      });
    }

    // Combine office-specific posts first, then the rest of master posts
    const combined = Array.from(new Set([...officePosts, ...cleanMaster]));
    return ['सभी पद (All Posts)', ...combined];
  }, [posts, contacts, selectedDist, selectedOff]);

  const displayedPosts = useMemo(() => {
    if (!filterText.trim()) return availablePosts;
    const q = filterText.toLowerCase().trim();
    return availablePosts.filter(p => p.toLowerCase().includes(q));
  }, [availablePosts, filterText]);

  // Handle District click -> Advance to Office stage
  const handleSelectDistrict = (dist) => {
    setSelectedDist(dist);
    setFilterText('');
    setStage('office');
  };

  // Handle Office click -> Advance to Post stage
  const handleSelectOffice = (off) => {
    setSelectedOff(off);
    setFilterText('');
    setStage('post');
  };

  // Handle Post click -> Complete Wizard & Close!
  const handleSelectPost = (pst) => {
    const finalPost = pst.includes('सभी पद') ? '' : pst;
    if (onSelectComplete) {
      onSelectComplete({
        district: selectedDist,
        office: selectedOff,
        post: finalPost
      });
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      ref={popupRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        width: 'min(310px, 92vw)',
        maxHeight: '410px',
        background: 'linear-gradient(180deg, #0e1e3b 0%, #071022 100%)',
        border: '1.5px solid var(--khaki-primary, #c49756)',
        borderRadius: '12px',
        boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 10020,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.18s ease-out'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header bar showing stage navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderBottom: '1px solid rgba(196, 151, 86, 0.25)',
        background: 'rgba(196, 151, 86, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {stage === 'office' && (
            <button
              type="button"
              onClick={() => { setStage('district'); setFilterText(''); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'var(--khaki-light, #dfb97e)',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="जनपद बदलें"
              aria-label="पीछे जाएं"
            >
              <ArrowLeft size={14} />
            </button>
          )}
          {stage === 'post' && (
            <button
              type="button"
              onClick={() => { setStage('office'); setFilterText(''); }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                color: 'var(--khaki-light, #dfb97e)',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="थाना बदलें"
              aria-label="पीछे जाएं"
            >
              <ArrowLeft size={14} />
            </button>
          )}

          <div style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#f8fafc',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {stage === 'district' && '1. जनपद चुनें'}
            {stage === 'office' && `2. ${selectedDist} • थाना/कार्यालय`}
            {stage === 'post' && `3. ${selectedOff} • पद/रैंक`}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px'
          }}
          aria-label="बंद करें"
          title="बंद करें"
        >
          <X size={16} />
        </button>
      </div>

      {/* Inline Quick Search input inside popup */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid rgba(196, 151, 86, 0.3)',
          borderRadius: '6px',
          padding: '4px 8px'
        }}>
          <Search size={13} color="var(--khaki-light, #dfb97e)" />
          <input
            type="text"
            placeholder={
              stage === 'district' ? 'जनपद खोजें...' :
              stage === 'office' ? 'थाना / कार्यालय खोजें...' :
              'पद / रैंक खोजें...'
            }
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.78rem'
            }}
            autoFocus
          />
          {filterText && (
            <button
              type="button"
              onClick={() => setFilterText('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Stage Items List */}
      <div style={{
        overflowY: 'auto',
        maxHeight: '290px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px'
      }}>
        {/* STAGE 1: DISTRICTS */}
        {stage === 'district' && (
          displayedDistricts.length > 0 ? (
            displayedDistricts.map((dist, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectDistrict(dist)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: selectedDist === dist ? 'rgba(196, 151, 86, 0.2)' : 'transparent',
                  border: selectedDist === dist ? '1px solid var(--khaki-primary, #c49756)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: selectedDist === dist ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(196, 151, 86, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedDist === dist ? 'rgba(196, 151, 86, 0.2)' : 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={13} color="var(--khaki-primary, #c49756)" />
                  <span>{dist}</span>
                </div>
                <ChevronRight size={13} color="#94a3b8" />
              </button>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
              कोई जनपद नहीं मिला
            </div>
          )
        )}

        {/* STAGE 2: OFFICES / POLICE STATIONS */}
        {stage === 'office' && (
          displayedOffices.length > 0 ? (
            displayedOffices.map((off, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOffice(off)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: selectedOff === off ? 'rgba(196, 151, 86, 0.2)' : 'transparent',
                  border: selectedOff === off ? '1px solid var(--khaki-primary, #c49756)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: selectedOff === off ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(196, 151, 86, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = selectedOff === off ? 'rgba(196, 151, 86, 0.2)' : 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={13} color="var(--khaki-primary, #c49756)" />
                  <span>{off}</span>
                </div>
                <ChevronRight size={13} color="#94a3b8" />
              </button>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
              इस जनपद में कोई थाना/कार्यालय नहीं मिला
            </div>
          )
        )}

        {/* STAGE 3: DESIGNATIONS / RANKS */}
        {stage === 'post' && (
          displayedPosts.length > 0 ? (
            displayedPosts.map((pst, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPost(pst)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(196, 151, 86, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={13} color="var(--khaki-primary, #c49756)" />
                  <span>{pst}</span>
                </div>
                <ChevronRight size={13} color="#94a3b8" />
              </button>
            ))
          ) : (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
              कोई पद नहीं मिला
            </div>
          )
        )}
      </div>
    </div>
  );
}
