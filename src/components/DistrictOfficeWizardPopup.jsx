import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Building2, Award, ArrowLeft, X, Search, ChevronRight, Check } from 'lucide-react';
import WheelPicker from './WheelPicker';
import { ALL_UP_DISTRICTS } from '../data/mockContacts';

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

  // 3-Stage Flow: 'district' -> 'office' -> 'post' (Preserving designation flow per Section 2 & 4)
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

  // Stage 1: Authorized Districts list (Scoped legitimately, Section 3)
  const authorizedDistricts = useMemo(() => {
    let list = Array.isArray(districts) && districts.length > 0 ? districts : ALL_UP_DISTRICTS;
    list = list.filter(d => {
      const name = typeof d === 'object' ? d.name : d;
      return name && name !== 'सभी ज़िले (All Districts)' && name !== 'सभी ज़िले';
    });

    // Auto-heal if list is too small
    if (list.length < 50) {
      const fallbackList = ALL_UP_DISTRICTS.filter(d => d && !d.includes('सभी ज़िले'));
      const set = new Set(fallbackList);
      list.forEach(d => {
        const name = typeof d === 'object' ? d.name : d;
        if (name) set.add(name);
      });
      list = Array.from(set);
    }

    if (!currentUser) return list;

    // Headquarter Master Admin has access to all districts
    if (currentUser.role === 'admin') return list;

    // If an officer is explicitly restricted by admin
    if (currentUser.isRestricted && currentUser.district) {
      return [currentUser.district];
    }
    if (currentUser.allowedDistricts && Array.isArray(currentUser.allowedDistricts) && currentUser.allowedDistricts.length > 0) {
      return currentUser.allowedDistricts;
    }

    // By default, departmental officers can browse all authorized districts across UP
    return list;
  }, [districts, currentUser]);

  // Safe diagnostic log (Section 3)
  useEffect(() => {
    console.log(`[District Wheel Selector] Loaded ${authorizedDistricts.length} authorized districts for role: ${currentUser?.role || 'guest'}`);
  }, [authorizedDistricts.length, currentUser?.role]);

  // Filtered districts by user search typing
  const displayedDistricts = useMemo(() => {
    if (!filterText.trim()) return authorizedDistricts;
    const q = filterText.toLowerCase().trim();
    return authorizedDistricts.filter(d => {
      const name = typeof d === 'object' ? d.name : d;
      return name.toLowerCase().includes(q);
    });
  }, [authorizedDistricts, filterText]);

  // Initialize selected district to first available or initialDistrict
  useEffect(() => {
    if (!selectedDist && displayedDistricts.length > 0) {
      const first = typeof displayedDistricts[0] === 'object' ? displayedDistricts[0].name : displayedDistricts[0];
      setSelectedDist(first);
    }
  }, [displayedDistricts, selectedDist]);

  // Stage 2: Available Offices in selected District
  const availableOffices = useMemo(() => {
    if (!selectedDist) return [];

    const officeSet = new Set();
    const cleanDist = selectedDist.trim().toLowerCase();

    // From master offices list
    if (Array.isArray(offices)) {
      offices.forEach(o => {
        const name = typeof o === 'string' ? o : o.name;
        const dist = typeof o === 'object' ? o.district : null;
        if (name && !name.includes('सभी कार्यालय/थाने') && !name.includes('सभी')) {
          if (!dist || dist.trim().toLowerCase() === cleanDist) {
            officeSet.add(name.trim());
          }
        }
      });
    }

    // Also collect offices from actual contacts in this district
    if (Array.isArray(contacts)) {
      contacts.forEach(c => {
        if (c.district && c.district.trim().toLowerCase() === cleanDist && c.office) {
          const off = c.office.trim();
          if (off && !off.includes('सभी')) {
            officeSet.add(off);
          }
        }
      });
    }

    // Fallback standard police stations for district if database has zero custom stations registered yet
    if (officeSet.size === 0) {
      const standard = [
        `थाना कोतवाली (${selectedDist})`,
        `थाना सिविल लाइन्स (${selectedDist})`,
        `महिला थाना (${selectedDist})`,
        `यातायात पुलिस लाइन (${selectedDist})`,
        `पुलिस कार्यालय / एसपी ऑफिस (${selectedDist})`,
        `अपराध शाखा / क्राइम ब्रांच (${selectedDist})`
      ];
      standard.forEach(s => officeSet.add(s));
    }

    const sorted = Array.from(officeSet).sort((a, b) => a.localeCompare(b, 'hi'));
    return sorted;
  }, [offices, contacts, selectedDist]);

  const displayedOffices = useMemo(() => {
    if (!filterText.trim()) return availableOffices;
    const q = filterText.toLowerCase().trim();
    return availableOffices.filter(o => o.toLowerCase().includes(q));
  }, [availableOffices, filterText]);

  // Initialize selected office when entering office stage or when district changes
  useEffect(() => {
    if (displayedOffices.length > 0) {
      if (!selectedOff || !displayedOffices.includes(selectedOff)) {
        setSelectedOff(displayedOffices[0]);
      }
    }
  }, [displayedOffices, selectedOff]);

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

  // Handle District Wheel Confirm -> Advance to Office stage
  const handleConfirmDistrict = () => {
    if (!selectedDist && displayedDistricts.length > 0) {
      const first = typeof displayedDistricts[0] === 'object' ? displayedDistricts[0].name : displayedDistricts[0];
      setSelectedDist(first);
    }
    setFilterText('');
    setStage('office');
  };

  // Handle Office Wheel Confirm -> Advance to Post stage
  const handleConfirmOffice = () => {
    if (!selectedOff && displayedOffices.length > 0) {
      setSelectedOff(displayedOffices[0]);
    }
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
        width: 'min(318px, 92vw)',
        maxHeight: '430px',
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
              title="जनपद व्हील पर वापस जाएं"
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
              title="थाना व्हील पर वापस जाएं"
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
            {stage === 'district' && `1. जनपद व्हील (${authorizedDistricts.length} जनपद)`}
            {stage === 'office' && `2. ${selectedDist} • थाना व्हील`}
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

      {/* Inline Quick Filter/Search input inside popup */}
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
              stage === 'district' ? 'जनपद खोजें (उदा. वाराणसी, आगरा...)' :
              stage === 'office' ? 'थाना/कार्यालय खोजें...' :
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

      {/* STAGE 1: DISTRICT WHEEL SCROLLER (Section 1) */}
      {stage === 'district' && (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px 10px 8px' }}>
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--khaki-light, #dfb97e)',
            textAlign: 'center',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <MapPin size={11} color="var(--khaki-primary, #c49756)" />
            <span>व्हील को स्क्रॉल कर जनपद चुनें</span>
          </div>

          <WheelPicker
            items={displayedDistricts}
            selectedValue={selectedDist}
            onValueChange={(val) => {
              const name = typeof val === 'object' ? val.name : val;
              setSelectedDist(name);
            }}
            itemHeight={38}
            visibleCount={5}
            ariaLabel="जनपद व्हील स्क्रोलर"
            placeholder="कोई जनपद उपलब्ध नहीं"
          />

          {/* Action button to lock in district and proceed to office stage */}
          <button
            type="button"
            onClick={handleConfirmDistrict}
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #c49756, #8e6833)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: '#081022',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(196, 151, 86, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            title={`${selectedDist} के थाने/कार्यालय देखें`}
          >
            <span>{selectedDist || 'जनपद'} के थाने चुनें</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* STAGE 2: POLICE STATION / OFFICE WHEEL SCROLLER (Section 2) */}
      {stage === 'office' && (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px 10px 8px' }}>
          <div style={{
            fontSize: '0.7rem',
            color: 'var(--khaki-light, #dfb97e)',
            textAlign: 'center',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}>
            <Building2 size={11} color="var(--khaki-primary, #c49756)" />
            <span>{selectedDist} के थाने/कार्यालय हेतु व्हील स्क्रॉल करें</span>
          </div>

          <WheelPicker
            items={displayedOffices}
            selectedValue={selectedOff}
            onValueChange={(val) => {
              const name = typeof val === 'object' ? val.name : val;
              setSelectedOff(name);
            }}
            itemHeight={38}
            visibleCount={5}
            ariaLabel="थाना/कार्यालय व्हील स्क्रोलर"
            placeholder="इस जनपद में कोई थाना नहीं मिला"
          />

          {/* Action button to lock in office and proceed to designation stage */}
          <button
            type="button"
            onClick={handleConfirmOffice}
            style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #c49756, #8e6833)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: '#081022',
              fontWeight: 800,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(196, 151, 86, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            title={`${selectedOff} के पद/रैंक देखें`}
          >
            <span>{selectedOff || 'थाना'} के पद चुनें</span>
            <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* STAGE 3: DESIGNATIONS / RANKS (Section 4 - Unmodified Flow & Layout) */}
      {stage === 'post' && (
        <div style={{
          overflowY: 'auto',
          maxHeight: '290px',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px'
        }}>
          {displayedPosts.length > 0 ? (
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
          )}
        </div>
      )}
    </div>
  );
}
