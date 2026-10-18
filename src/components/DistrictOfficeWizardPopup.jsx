import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import WheelPicker from './WheelPicker';
import { ALL_UP_DISTRICTS, STANDARD_POLICE_POSTS } from '../data/mockContacts';

/**
 * DistrictOfficeWizardPopup
 * Minimal, compact 3-stage wheel scroller popup:
 * Sequence: 1. District (जनपद) -> 2. Police Station (थाना) -> 3. Designation (पद)
 * Features:
 * - At least 5 visible items at each stage in the 3D drum wheel picker.
 * - Zero search inputs, zero headlines, zero instructions across all stages.
 * - Uniform style with compact golden arrow icon button only (no text buttons).
 * - Smooth back navigation (<) and close (✕) controls.
 */
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

  // 3 Stages in sequence: 'district' -> 'office' -> 'post'
  const [stage, setStage] = useState('district');
  const [selectedDist, setSelectedDist] = useState(initialDistrict || '');
  const [selectedOff, setSelectedOff] = useState('');
  const [selectedPost, setSelectedPost] = useState('');

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

  // Stage 1: Authorized Districts list (Scoped legitimately, all 75 UP districts for authorized users)
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

  // Safe diagnostic log
  useEffect(() => {
    console.log(`[District Wheel Selector] Loaded ${authorizedDistricts.length} authorized districts for role: ${currentUser?.role || 'guest'}`);
  }, [authorizedDistricts.length, currentUser?.role]);

  // Initialize selected district
  useEffect(() => {
    if (!selectedDist && authorizedDistricts.length > 0) {
      const first = typeof authorizedDistricts[0] === 'object' ? authorizedDistricts[0].name : authorizedDistricts[0];
      setSelectedDist(first);
    }
  }, [authorizedDistricts, selectedDist]);

  // Stage 2: Available Thanas / Offices in selected District
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
    return ['सभी थाने / कार्यालय (All Stations)', ...sorted];
  }, [offices, contacts, selectedDist]);

  // Initialize selected office when entering office stage or when district changes
  useEffect(() => {
    if (availableOffices.length > 0) {
      if (!selectedOff || !availableOffices.includes(selectedOff)) {
        setSelectedOff(availableOffices[0]);
      }
    }
  }, [availableOffices, selectedOff]);

  // Stage 3: Available Designations / Posts (for selected district and thana)
  const availablePosts = useMemo(() => {
    const list = Array.isArray(posts) && posts.length > 0 ? posts : STANDARD_POLICE_POSTS;
    const cleanMaster = list.filter(p => p && p !== 'सभी पद (All Posts)' && p !== 'सभी पद');

    // Find designations specifically present in this district & thana
    const officePosts = new Set();
    const cleanDist = (selectedDist || '').trim().toLowerCase();
    const cleanOff = (selectedOff || '').trim().toLowerCase();
    const isAllOffices = !cleanOff || cleanOff.includes('सभी');

    if (cleanDist && Array.isArray(contacts)) {
      contacts.forEach(c => {
        const cDist = (c.district || '').trim().toLowerCase();
        const cOff = (c.office || '').trim().toLowerCase();
        if (cDist === cleanDist && (isAllOffices || cOff === cleanOff) && c.post) {
          officePosts.add(c.post.trim());
        }
      });
    }

    // Combine office-specific posts first, then master posts list
    const combined = Array.from(new Set([...officePosts, ...cleanMaster]));
    return ['सभी पद (All Posts)', ...combined];
  }, [posts, contacts, selectedDist, selectedOff]);

  // Initialize selected post when entering post stage
  useEffect(() => {
    if (availablePosts.length > 0) {
      if (!selectedPost || !availablePosts.includes(selectedPost)) {
        setSelectedPost(availablePosts[0]);
      }
    }
  }, [availablePosts, selectedPost]);

  // Action: Confirm District -> Move to Thanas stage
  const handleConfirmDistrict = () => {
    if (!selectedDist && authorizedDistricts.length > 0) {
      const first = typeof authorizedDistricts[0] === 'object' ? authorizedDistricts[0].name : authorizedDistricts[0];
      setSelectedDist(first);
    }
    setStage('office');
  };

  // Action: Confirm Thana -> Move to Designation (पद) stage
  const handleConfirmOffice = () => {
    if (!selectedOff && availableOffices.length > 0) {
      setSelectedOff(availableOffices[0]);
    }
    setStage('post');
  };

  // Action: Confirm Designation (पद) -> Filter directory & close popup
  const handleConfirmPost = () => {
    const finalOffice = (!selectedOff || selectedOff.includes('सभी थाने')) ? '' : selectedOff;
    const finalPost = (!selectedPost || selectedPost.includes('सभी पद')) ? '' : selectedPost;

    if (onSelectComplete) {
      onSelectComplete({
        district: selectedDist,
        office: finalOffice,
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
        width: 'min(300px, 92vw)',
        maxHeight: 'min(480px, 86vh)',
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
        animation: 'fadeIn 0.18s ease-out',
        padding: '6px 8px 10px 8px'
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Top minimal control bar (Back and Close icons only - NO headlines, titles, instructions, or search inputs) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: stage !== 'district' ? 'space-between' : 'flex-end',
        padding: '2px 4px 4px 4px',
        minHeight: '26px'
      }}>
        {stage === 'office' && (
          <button
            type="button"
            onClick={() => setStage('district')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'var(--khaki-light, #dfb97e)',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            title="जनपद व्हील पर वापस जाएं"
            aria-label="पीछे जाएं"
          >
            <ArrowLeft size={16} />
          </button>
        )}

        {stage === 'post' && (
          <button
            type="button"
            onClick={() => setStage('office')}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'var(--khaki-light, #dfb97e)',
              borderRadius: '6px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            title="थाना व्हील पर वापस जाएं"
            aria-label="पीछे जाएं"
          >
            <ArrowLeft size={16} />
          </button>
        )}

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
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'color 0.15s ease'
          }}
          aria-label="बंद करें"
          title="बंद करें"
          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          <X size={16} />
        </button>
      </div>

      {/* STAGE 1: DISTRICT WHEEL SCROLLER (जनपद व्हील - up to 11 visible items, arrow icon button) */}
      {stage === 'district' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <WheelPicker
            items={authorizedDistricts}
            selectedValue={selectedDist}
            onValueChange={(val) => {
              const name = typeof val === 'object' ? val.name : val;
              setSelectedDist(name);
            }}
            itemHeight={34}
            visibleCount={11}
            ariaLabel="जनपद व्हील स्क्रोलर"
            placeholder="कोई जनपद उपलब्ध नहीं"
          />

          {/* Compact Arrow Icon Button Only (No text button) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleConfirmDistrict}
              style={{
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #c49756, #8e6833)',
                border: 'none',
                borderRadius: '50%',
                color: '#081022',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(196, 151, 86, 0.45)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              title={`${selectedDist} के थाने देखें`}
              aria-label="थाने देखें"
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: POLICE STATIONS WHEEL SCROLLER (थाना व्हील - up to 11 visible items, arrow icon button) */}
      {stage === 'office' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <WheelPicker
            items={availableOffices}
            selectedValue={selectedOff}
            onValueChange={(val) => {
              const name = typeof val === 'object' ? val.name : val;
              setSelectedOff(name);
            }}
            itemHeight={34}
            visibleCount={11}
            ariaLabel="थाना/कार्यालय व्हील स्क्रोलर"
            placeholder="इस जनपद में कोई थाना नहीं मिला"
          />

          {/* Compact Arrow Icon Button Only (Advances to Post stage) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleConfirmOffice}
              style={{
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #c49756, #8e6833)',
                border: 'none',
                borderRadius: '50%',
                color: '#081022',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(196, 151, 86, 0.45)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              title={`${selectedOff || 'थाने'} के पद देखें`}
              aria-label="पद देखें"
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: DESIGNATIONS / RANKS WHEEL SCROLLER (पद/रैंक व्हील - up to 11 visible items, arrow icon button) */}
      {stage === 'post' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <WheelPicker
            items={availablePosts}
            selectedValue={selectedPost}
            onValueChange={(val) => {
              const name = typeof val === 'object' ? val.name : val;
              setSelectedPost(name);
            }}
            itemHeight={34}
            visibleCount={11}
            ariaLabel="पद/रैंक व्हील स्क्रोलर"
            placeholder="कोई पद उपलब्ध नहीं"
          />

          {/* Compact Arrow Icon Button Only (Applies filter and displays contacts) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleConfirmPost}
              style={{
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #c49756, #8e6833)',
                border: 'none',
                borderRadius: '50%',
                color: '#081022',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(196, 151, 86, 0.45)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              title="संपर्क देखें"
              aria-label="संपर्क देखें"
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ArrowRight size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
