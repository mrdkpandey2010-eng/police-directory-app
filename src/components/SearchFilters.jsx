import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowRight, RefreshCw } from 'lucide-react';

export default function SearchFilters({
  isOpen = false,
  onClose,
  searchQuery = '',
  selectedDistrict = '',
  selectedPost = '',
  selectedOffice = '',
  onExecuteSearch,
  districts = [],
  posts = [],
  offices = [],
  currentUser = null
}) {
  // Local draft filter states
  const [query, setQuery] = useState(searchQuery || '');
  const [district, setDistrict] = useState(selectedDistrict || '');
  const [post, setPost] = useState(selectedPost || '');
  const [office, setOffice] = useState(selectedOffice || '');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with incoming props when opening
  useEffect(() => {
    if (isOpen) {
      setQuery(searchQuery || '');
      setDistrict(selectedDistrict || '');
      setPost(selectedPost || '');
      setOffice(selectedOffice || '');
      setValidationError('');
      setIsSubmitting(false);
    }
  }, [isOpen, searchQuery, selectedDistrict, selectedPost, selectedOffice]);

  // Authorized Districts (Role Scoping: Co-Admin restricted to their district, Admin all, Regular officer all authorized)
  const authorizedDistricts = useMemo(() => {
    let list = Array.isArray(districts) ? districts : [];
    list = list.filter(d => d && d !== 'सभी ज़िले (All Districts)' && d !== 'सभी ज़िले');

    if (!currentUser) return list;
    if (currentUser.role === 'admin') return list;
    if (currentUser.role === 'co_admin' && currentUser.district) {
      return [currentUser.district];
    }
    if (currentUser.allowedDistricts && Array.isArray(currentUser.allowedDistricts) && currentUser.allowedDistricts.length > 0) {
      return currentUser.allowedDistricts;
    }
    return list;
  }, [districts, currentUser]);

  // Dependent Offices (Filtered by selected District)
  const availableOffices = useMemo(() => {
    if (!Array.isArray(offices)) return [];

    let filtered = offices.filter(o => {
      const name = typeof o === 'string' ? o : o.name;
      return name && !name.includes('सभी कार्यालय/थाने') && !name.includes('सभी');
    });

    const activeDist = district || (currentUser?.role === 'co_admin' ? currentUser?.district : '');
    if (activeDist) {
      filtered = filtered.filter(o => {
        if (typeof o === 'object' && o.district) {
          return o.district.trim().toLowerCase() === activeDist.trim().toLowerCase();
        }
        return false;
      });
    }

    const seen = new Set();
    const unique = [];
    for (const item of filtered) {
      const name = typeof item === 'string' ? item : item.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        unique.push({
          id: typeof item === 'object' ? (item.id || name) : name,
          name: name,
          district: typeof item === 'object' ? item.district : ''
        });
      }
    }
    return unique;
  }, [offices, district, currentUser]);

  // Handle District change & reset dependent office if incompatible
  const handleDistrictChange = (newDistrict) => {
    setDistrict(newDistrict);
    setValidationError('');
    if (newDistrict && office) {
      const existsInNewDistrict = offices.some(o => {
        const name = typeof o === 'string' ? o : o.name;
        const dist = typeof o === 'object' ? o.district : null;
        return name === office && (!dist || dist.trim().toLowerCase() === newDistrict.trim().toLowerCase());
      });
      if (!existsInNewDistrict) {
        setOffice('');
      }
    }
  };

  const handlePostChange = (newPost) => {
    setPost(newPost);
    setValidationError('');
  };

  const handleOfficeChange = (newOffice) => {
    setOffice(newOffice);
    setValidationError('');
  };

  const handleQueryChange = (newQuery) => {
    setQuery(newQuery);
    if (newQuery.trim().length > 0) {
      setValidationError('');
    }
  };

  // Mandatory Validation & Search Trigger
  const handleSearchSubmit = () => {
    const cleanQ = (query || '').trim();
    const cleanDist = (district || '').trim();
    const cleanPost = (post || '').trim();
    const cleanOff = (office || '').trim();

    // When the employee search field is empty:
    // User must select all three: District, Rank/designation, and Office/police station
    if (!cleanQ) {
      const missingDistrict = !cleanDist || cleanDist === 'सभी ज़िले' || cleanDist === 'सभी ज़िले (All Districts)';
      const missingPost = !cleanPost || cleanPost === 'सभी पद';
      const missingOffice = !cleanOff || cleanOff.includes('सभी');

      if (missingDistrict || missingPost || missingOffice) {
        setValidationError('सर्च खाली होने पर जनपद, पद एवं थाना तीनों अनिवार्य हैं।');
        return;
      }
    }

    setValidationError('');
    setIsSubmitting(true);

    if (onExecuteSearch) {
      onExecuteSearch({
        query: cleanQ,
        district: cleanDist,
        post: cleanPost,
        office: cleanOff
      });
    }

    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const isQueryEmpty = !(query && query.trim().length > 0);
  const isDistrictMissing = isQueryEmpty && (!district || district === 'सभी ज़िले' || district === 'सभी ज़िले (All Districts)');
  const isPostMissing = isQueryEmpty && (!post || post === 'सभी पद');
  const isOfficeMissing = isQueryEmpty && (!office || office.includes('सभी'));

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 10060,
        display: 'flex',
        justifyContent: 'flex-start',
        animation: 'fadeIn 0.2s ease-out'
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          width: 'min(320px, 86vw)',
          height: '100%',
          background: 'linear-gradient(180deg, #0e1e3b 0%, #071022 100%)',
          borderRight: '2px solid var(--khaki-primary, #c49756)',
          boxShadow: '6px 0 35px rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 1rem 2rem 1rem',
          gap: '14px',
          animation: 'slideInLeft 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 1. Close Icon */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#cbd5e1',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease'
            }}
            aria-label="बंद करें"
            title="बंद करें"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Employee Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1.5px solid rgba(196, 151, 86, 0.4)',
          borderRadius: '8px',
          padding: '0 10px',
          height: '42px',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
        }}>
          <Search size={16} color="var(--khaki-light, #dfb97e)" style={{ flexShrink: 0, marginRight: '8px' }} />
          <input
            type="text"
            placeholder="कर्मचारी खोजें (नाम, PNO, मोबाइल...)"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.85rem'
            }}
            aria-label="कर्मचारी खोजें"
            autoFocus
          />
          {query && (
            <button 
              type="button"
              onClick={() => handleQueryChange('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="सर्च साफ़ करें"
              title="सर्च साफ़ करें"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* 3. District Selection / Filter */}
        <select 
          value={district}
          onChange={(e) => handleDistrictChange(e.target.value)}
          aria-label="जनपद चुनें"
          style={{
            width: '100%',
            height: '42px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: validationError && isDistrictMissing ? '1.5px solid #ef4444' : '1.5px solid rgba(196, 151, 86, 0.4)',
            borderRadius: '8px',
            color: district ? '#f8fafc' : '#94a3b8',
            padding: '0 10px',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ background: '#0e1e3b', color: '#94a3b8' }}>जनपद चुनें</option>
          {authorizedDistricts.map((d, i) => (
            <option key={i} value={d} style={{ background: '#0e1e3b', color: '#f8fafc' }}>
              {d}
            </option>
          ))}
        </select>

        {/* 4. Rank / Designation Selection / Filter */}
        <select 
          value={post}
          onChange={(e) => handlePostChange(e.target.value)}
          aria-label="पद / रैंक चुनें"
          style={{
            width: '100%',
            height: '42px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: validationError && isPostMissing ? '1.5px solid #ef4444' : '1.5px solid rgba(196, 151, 86, 0.4)',
            borderRadius: '8px',
            color: post ? '#f8fafc' : '#94a3b8',
            padding: '0 10px',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ background: '#0e1e3b', color: '#94a3b8' }}>पद / रैंक चुनें</option>
          {posts.filter(p => p && p !== 'सभी पद').map((p, i) => (
            <option key={i} value={p} style={{ background: '#0e1e3b', color: '#f8fafc' }}>
              {p}
            </option>
          ))}
        </select>

        {/* 5. Office / Police Station Selection / Filter */}
        <select 
          value={office}
          onChange={(e) => handleOfficeChange(e.target.value)}
          aria-label="कार्यालय / थाना चुनें"
          style={{
            width: '100%',
            height: '42px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: validationError && isOfficeMissing ? '1.5px solid #ef4444' : '1.5px solid rgba(196, 151, 86, 0.4)',
            borderRadius: '8px',
            color: office ? '#f8fafc' : '#94a3b8',
            padding: '0 10px',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="" style={{ background: '#0e1e3b', color: '#94a3b8' }}>कार्यालय / थाना चुनें</option>
          {availableOffices.map((o) => (
            <option key={o.id} value={o.name} style={{ background: '#0e1e3b', color: '#f8fafc' }}>
              {o.name}
            </option>
          ))}
        </select>

        {/* Subtle Inline Validation Indication */}
        {validationError && (
          <div style={{
            color: '#f87171',
            fontSize: '0.74rem',
            fontWeight: 600,
            textAlign: 'center',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '6px',
            padding: '6px 8px',
            lineHeight: 1.3
          }}>
            {validationError}
          </div>
        )}

        {/* 6. Compact Arrow-Icon Results Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
          <button
            type="button"
            onClick={handleSearchSubmit}
            disabled={isSubmitting}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c49756, #8e6833)',
              border: 'none',
              color: '#081022',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(196,151,86,0.35)',
              transition: 'transform 0.15s ease, opacity 0.15s ease',
              opacity: isSubmitting ? 0.7 : 1
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            aria-label="परिणाम देखें"
            title="परिणाम देखें"
          >
            {isSubmitting ? (
              <RefreshCw size={18} color="#081022" className="animate-spin" />
            ) : (
              <ArrowRight size={20} color="#081022" />
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
