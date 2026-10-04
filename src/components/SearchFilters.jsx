import React, { useMemo } from 'react';
import { Search, MapPin, Award, Building2, X, Filter } from 'lucide-react';

export default function SearchFilters({
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

  return (
    <div className="search-card">
      {/* Instant Free-Text Search */}
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="main-search-input"
          placeholder="नाम, मोबाइल नंबर, पीएनओ (PNO), ज़िला या थाना लिखकर खोजें..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="clear-search-btn" 
            onClick={() => setSearchQuery('')}
            title="सर्च साफ़ करें"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Multi-Criteria Select Filters */}
      <div className="filter-grid">
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

        <div className="filter-group">
          <label className="filter-label">
            <Award size={14} />
            पद फ़िल्टर (Designation)
          </label>
          <select 
            className="filter-select"
            value={selectedPost}
            onChange={(e) => setSelectedPost(e.target.value)}
          >
            {posts.map((p, i) => (
              <option key={i} value={i === 0 ? '' : p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">
            <Building2 size={14} />
            कार्यालय / थाना (Office/Thana) {selectedDistrict ? `• ${selectedDistrict}` : ''}
          </label>
          <select 
            className="filter-select"
            value={selectedOffice}
            onChange={(e) => setSelectedOffice(e.target.value)}
          >
            <option value="">
              {selectedDistrict 
                ? `सभी संबंधित थाने/कार्यालय (${selectedDistrict} - कुल ${availableOffices.length})` 
                : 'सभी कार्यालय/थाने (पहले ज़िला चुनें तो केवल उस ज़िले के थाने दिखेंगे)'}
            </option>
            {availableOffices.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="stats-bar">
          <div className="active-filter-pills">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>सक्रिय फ़िल्टर:</span>
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
                थाना/कार्यालय: {selectedOffice}
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
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
          >
            <Filter size={13} />
            सभी फ़िल्टर साफ़ करें
          </button>
        </div>
      )}
    </div>
  );
}
