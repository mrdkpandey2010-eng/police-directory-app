import React, { useMemo } from 'react';
import { Search, MapPin, Award, Building2, X, Filter, CheckCircle2 } from 'lucide-react';

export default function SearchFilters({
  isOpen = false,
  onClose,
  searchQuery,
  setSearchQuery,
  selectedDistrict,
  setSelectedDistrict,
  selectedPost,
  setSelectedPost,
  selectedOffice,
  setSelectedOffice,
  districts = [],
  posts = [],
  offices = [],
  onResetFilters,
  hasActiveFilters
}) {
  // Filter offices list by the selected district
  const availableOffices = useMemo(() => {
    if (!Array.isArray(offices)) return [];

    let filtered = offices.filter(o => {
      const name = typeof o === 'string' ? o : o.name;
      return name && !name.includes('सभी कार्यालय/थाने');
    });

    if (selectedDistrict && selectedDistrict !== 'सभी ज़िले (All Districts)' && selectedDistrict !== 'सभी ज़िले') {
      filtered = filtered.filter(o => {
        if (typeof o === 'object' && o.district) {
          return o.district === selectedDistrict;
        }
        return false;
      });
    }

    // Keep unique office names
    const seen = new Set();
    const unique = [];
    for (const item of filtered) {
      const name = typeof item === 'string' ? item : item.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        unique.push({
          id: typeof item === 'object' ? item.id : name,
          name: name,
          district: typeof item === 'object' ? item.district : ''
        });
      }
    }
    return unique;
  }, [offices, selectedDistrict]);

  // Handle District Change: if currently selected office is not in new district, reset office
  const handleDistrictChange = (newDistrict) => {
    setSelectedDistrict(newDistrict);
    if (newDistrict && selectedOffice) {
      const existsInNewDistrict = offices.some(o => {
        const name = typeof o === 'string' ? o : o.name;
        const dist = typeof o === 'object' ? o.district : null;
        return name === selectedOffice && (!dist || dist === newDistrict);
      });
      if (!existsInNewDistrict) {
        setSelectedOffice('');
      }
    }
  };

  // Handle Post Change
  const handlePostChange = (newPost) => {
    setSelectedPost(newPost);
  };

  // Handle Office Change: When final/all columns selected -> auto-close drawer (Requirement 2 & 3)
  const handleOfficeChange = (newOffice) => {
    setSelectedOffice(newOffice);
    if (newOffice) {
      // Auto-hide sidebar after brief moment for smooth UX
      setTimeout(() => {
        if (onClose) onClose();
      }, 350);
    }
  };

  if (!isOpen) return null;

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
        zIndex: 10060,
        display: 'flex',
        justifyContent: 'flex-start',
        animation: 'fadeIn 0.2s ease-out'
      }} 
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '380px',
          height: '100%',
          background: 'linear-gradient(180deg, #0e1e3b 0%, #071022 100%)',
          borderRight: '2px solid var(--khaki-primary, #c49756)',
          boxShadow: '6px 0 35px rgba(0,0,0,0.75)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '1.25rem 1rem 2.5rem 1rem',
          gap: '1.1rem',
          animation: 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(196,151,86,0.25)',
          paddingBottom: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(196,151,86,0.15)',
              border: '1px solid var(--khaki-primary, #c49756)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Filter size={17} color="var(--khaki-primary, #c49756)" />
            </div>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
                कर्मचारी खोजें एवं फ़िल्टर
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                उत्तर प्रदेश पुलिस अधिकृत निर्देशिका
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              color: '#cbd5e1',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="बंद करें"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Instant Free-Text Search Input */}
        <div className="search-input-wrapper" style={{ margin: 0 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="main-search-input"
            placeholder="नाम, मोबाइल नंबर, PNO, ज़िला या थाना..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (onClose) onClose();
              }
            }}
            autoFocus
          />
          {searchQuery && (
            <button 
              className="clear-search-btn" 
              onClick={() => setSearchQuery('')}
              title="सर्च साफ़ करें"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Multi-Criteria Select Filters in Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {/* 2. District Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <MapPin size={14} />
              ज़िला फ़िल्टर (District)
            </label>
            <select 
              className="filter-select"
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
            >
              {districts.map((d, i) => (
                <option key={i} value={i === 0 ? '' : d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 3. Post / Designation Filter */}
          <div className="filter-group">
            <label className="filter-label">
              <Award size={14} />
              पद फ़िल्टर (Designation)
            </label>
            <select 
              className="filter-select"
              value={selectedPost}
              onChange={(e) => handlePostChange(e.target.value)}
            >
              {posts.map((p, i) => (
                <option key={i} value={i === 0 ? '' : p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 4. Office / Thana Filter (Final Column -> Auto-close) */}
          <div className="filter-group">
            <label className="filter-label">
              <Building2 size={14} />
              कार्यालय / थाना (Office/Thana) {selectedDistrict ? `• ${selectedDistrict}` : ''}
            </label>
            <select 
              className="filter-select"
              value={selectedOffice}
              onChange={(e) => handleOfficeChange(e.target.value)}
            >
              <option value="">
                {selectedDistrict 
                  ? `सभी संबंधित थाने/कार्यालय (${selectedDistrict} - कुल ${availableOffices.length})` 
                  : 'सभी कार्यालय/थाने (पहले ज़िला चुनें)'}
              </option>
              {availableOffices.map((o) => (
                <option key={o.id} value={o.name}>{o.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Pills inside drawer */}
        {hasActiveFilters && (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--khaki-light, #dfb97e)', fontWeight: 700 }}>
              सक्रिय चयन:
            </div>
            <div className="active-filter-pills" style={{ flexWrap: 'wrap', gap: '6px' }}>
              {selectedDistrict && (
                <span className="pill">
                  ज़िला: {selectedDistrict}
                  <X size={12} className="pill-remove" onClick={() => handleDistrictChange('')} />
                </span>
              )}
              {selectedPost && (
                <span className="pill">
                  पद: {selectedPost}
                  <X size={12} className="pill-remove" onClick={() => setSelectedPost('')} />
                </span>
              )}
              {selectedOffice && (
                <span className="pill">
                  थाना: {selectedOffice}
                  <X size={12} className="pill-remove" onClick={() => setSelectedOffice('')} />
                </span>
              )}
              {searchQuery && (
                <span className="pill">
                  सर्च: "{searchQuery}"
                  <X size={12} className="pill-remove" onClick={() => setSearchQuery('')} />
                </span>
              )}
            </div>

            <button 
              className="btn btn-secondary"
              onClick={onResetFilters}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.78rem', width: '100%', marginTop: '4px' }}
            >
              <Filter size={13} />
              सभी फ़िल्टर साफ़ करें
            </button>
          </div>
        )}

        {/* Primary Action Button: Apply & Close (स्वतः पुनः छिपना / बंद होना) */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #c49756, #8e6833)',
              color: '#081022',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(196,151,86,0.35)'
            }}
            onClick={onClose}
          >
            <CheckCircle2 size={16} />
            <span>परिणाम देखें / फ़िल्टर लागू करें</span>
          </button>
        </div>

      </div>
    </div>
  );
}
