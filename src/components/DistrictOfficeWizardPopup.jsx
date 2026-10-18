import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import WheelPicker from './WheelPicker';
import { ALL_UP_DISTRICTS } from '../data/mockContacts';

/**
 * DistrictOfficeWizardPopup
 * Minimal, compact wheel scroller popup for District and Police Station selection.
 * Features:
 * - At least 5 visible districts/stations in the wheel picker.
 * - Zero search inputs, zero headlines, zero instructions.
 * - Arrow icon button only (no text button).
 * - Displays only Thanas for the district in minimal space.
 */
export default function DistrictOfficeWizardPopup({
  districts = [],
  offices = [],
  contacts = [],
  currentUser = null,
  initialDistrict = '',
  onSelectComplete,
  onClose
}) {
  const popupRef = useRef(null);

  // 2 Stages: 'district' -> 'office' (displays only Thanas in minimal space)
  const [stage, setStage] = useState('district');
  const [selectedDist, setSelectedDist] = useState(initialDistrict || '');
  const [selectedOff, setSelectedOff] = useState('');

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

  // Handle District Advance -> Move to Police Stations stage
  const handleConfirmDistrict = () => {
    if (!selectedDist && authorizedDistricts.length > 0) {
      const first = typeof authorizedDistricts[0] === 'object' ? authorizedDistricts[0].name : authorizedDistricts[0];
      setSelectedDist(first);
    }
    setStage('office');
  };

  // Handle Office Selection -> Immediately filter directory and close popup
  const handleConfirmOffice = () => {
    const finalOffice = (!selectedOff || selectedOff.includes('सभी')) ? '' : selectedOff;
    if (onSelectComplete) {
      onSelectComplete({
        district: selectedDist,
        office: finalOffice,
        post: ''
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
        width: 'min(270px, 90vw)',
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
      {/* Top minimal control bar (Close & Back icons only - NO headlines, titles, instructions, or search inputs) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: stage === 'office' ? 'space-between' : 'flex-end',
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

      {/* STAGE 1: DISTRICT WHEEL SCROLLER (At least 5 districts visible, zero headlines/search/instructions) */}
      {stage === 'district' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <WheelPicker
            items={authorizedDistricts}
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

          {/* Compact Arrow Icon Button Only (No text, minimal space) */}
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

      {/* STAGE 2: POLICE STATIONS ONLY (In minimum possible space, zero headlines/search/instructions) */}
      {stage === 'office' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <WheelPicker
            items={availableOffices}
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

          {/* Compact Arrow Icon Button Only (Applies filter and displays contacts) */}
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
              title="थाने के संपर्क देखें"
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
