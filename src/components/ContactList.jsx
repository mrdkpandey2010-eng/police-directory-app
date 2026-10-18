import React from 'react';
import ContactCard from './ContactCard';
import { SearchX } from 'lucide-react';

export default function ContactList({ 
  contacts, 
  totalCount = 0,
  currentPage = 1,
  totalPages = 1,
  pageSize = 50,
  onPageChange,
  currentUser, 
  permissions = [],
  presenceMap = {},
  onEditContact, 
  onToggleBlockContact, 
  onToggleActiveContact,
  onPromoteCoAdminContact,
  onRevokeCoAdminContact,
  onDeleteContact,
  onResetFilters,
  onOpenChatWithContact,
  onPermissionUpdated,
  displayLanguage = 'hi'
}) {
  const effectiveTotal = totalCount || contacts.length;
  const startIdx = effectiveTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, effectiveTotal);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    if (typeof onPageChange === 'function') {
      onPageChange(newPage);
    }
    const anchor = document.getElementById('contacts-top-anchor') || document.querySelector('.contacts-list');
    if (anchor) {
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (contacts.length === 0) {
    return (
      <div id="contacts-top-anchor" className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <SearchX size={44} color="var(--khaki-primary, #c49756)" />
        <h3 style={{ color: 'var(--text-bright, #fff)', fontSize: '1.1rem', fontWeight: 700, margin: '0.75rem 0 0.25rem 0' }}>
          {displayLanguage === 'en' ? 'No Officers Found' : 'कोई कार्मिक नहीं मिला (No Officers Found)'}
        </h3>
        <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.82rem', color: '#94a3b8' }}>
          {displayLanguage === 'en' 
            ? 'No police officer found matching your selected district, rank, or search criteria. Please adjust or reset filters.' 
            : 'आपके द्वारा चुने गए ज़िला, पद या खोज मापदंड के अनुसार कोई पुलिस अधिकारी/कर्मचारी नहीं मिला। कृपया फ़िल्टर बदलें या रीसेट करें।'}
        </p>
        <button className="btn btn-primary" onClick={onResetFilters} style={{ marginTop: '0.75rem', padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
          {displayLanguage === 'en' ? 'Clear All Filters' : 'सभी फ़िल्टर साफ़ करें'}
        </button>
      </div>
    );
  }

  return (
    <div id="contacts-top-anchor">
      {/* Header with Bilingual Personnel Counts & Pagination Indicator (Requirement 7) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-bright, #fff)', margin: 0 }}>
          {effectiveTotal > pageSize ? (
            displayLanguage === 'en' 
              ? `Contact Directory (${startIdx}–${endIdx} of ${effectiveTotal} Active Police Personnel)` 
              : `संपर्क निर्देशिका (${startIdx}–${endIdx} / कुल ${effectiveTotal} सक्रिय पुलिस कार्मिक)`
          ) : (
            displayLanguage === 'en' 
              ? `Contact Directory (${effectiveTotal} Active Police Personnel)` 
              : `संपर्क निर्देशिका (कुल ${effectiveTotal} सक्रिय पुलिस कार्मिक)`
          )}
        </h2>
        {totalPages > 1 && (
          <span style={{
            fontSize: '0.74rem',
            color: 'var(--khaki-light, #dfb97e)',
            background: 'rgba(196, 151, 86, 0.15)',
            border: '1px solid rgba(196, 151, 86, 0.35)',
            borderRadius: '6px',
            padding: '3px 8px',
            fontWeight: 600
          }}>
            {displayLanguage === 'en' 
              ? `📄 Page ${currentPage} of ${totalPages} (50 per page)` 
              : `📄 पृष्ठ ${currentPage} / ${totalPages} (प्रति पृष्ठ 50)`}
          </span>
        )}
      </div>

      {/* Contact Cards List */}
      <div className="contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            currentUser={currentUser}
            permissions={permissions}
            presenceMap={presenceMap}
            onEdit={onEditContact}
            onToggleBlock={onToggleBlockContact}
            onToggleActive={onToggleActiveContact}
            onPromoteCoAdmin={onPromoteCoAdminContact}
            onRevokeCoAdmin={onRevokeCoAdminContact}
            onDelete={onDeleteContact}
            onOpenChatWithContact={onOpenChatWithContact}
            onPermissionUpdated={onPermissionUpdated}
            displayLanguage={displayLanguage}
          />
        ))}
      </div>

      {/* Pagination Controls (Requirement 7: exactly 50 per page, visible when totalCount > 50) */}
      {totalPages > 1 && (
        <div 
          className="pagination-controls"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(196, 151, 86, 0.3)',
            borderRadius: '10px',
            flexWrap: 'wrap'
          }}
        >
          {/* Previous Page Button */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            aria-label="Previous Page"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--khaki-primary, #c49756)',
              background: currentPage <= 1 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(196, 151, 86, 0.18)',
              color: currentPage <= 1 ? '#64748b' : '#f8fafc',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>‹</span>
            <span>{displayLanguage === 'en' ? 'Previous' : 'पिछला'}</span>
          </button>

          {/* Page Indicator & Counter */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            textAlign: 'center'
          }}>
            <span style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: 'var(--khaki-light, #dfb97e)',
              letterSpacing: '0.02em'
            }}>
              {displayLanguage === 'en' 
                ? `Page ${currentPage} of ${totalPages}` 
                : `पृष्ठ ${currentPage} / ${totalPages}`}
            </span>
            <span style={{
              fontSize: '0.72rem',
              color: '#94a3b8'
            }}>
              {displayLanguage === 'en'
                ? `Showing ${startIdx}–${endIdx} of ${effectiveTotal} contacts`
                : `कार्मिक ${startIdx}–${endIdx} (कुल ${effectiveTotal} में से)`}
            </span>
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            aria-label="Next Page"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid var(--khaki-primary, #c49756)',
              background: currentPage >= totalPages ? 'rgba(255, 255, 255, 0.05)' : 'rgba(196, 151, 86, 0.18)',
              color: currentPage >= totalPages ? '#64748b' : '#f8fafc',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <span>{displayLanguage === 'en' ? 'Next' : 'अगला'}</span>
            <span>›</span>
          </button>
        </div>
      )}
    </div>
  );
}

