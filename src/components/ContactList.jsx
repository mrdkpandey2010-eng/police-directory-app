import React from 'react';
import ContactCard from './ContactCard';
import { SearchX } from 'lucide-react';

export default function ContactList({ 
  contacts, 
  currentUser, 
  onEditContact, 
  onToggleBlockContact, 
  onToggleActiveContact,
  onPromoteCoAdminContact,
  onDeleteContact,
  onResetFilters,
  onOpenChatWithContact
}) {
  if (contacts.length === 0) {
    return (
      <div className="empty-state">
        <SearchX size={48} />
        <h3 style={{ color: 'var(--text-bright)', fontSize: '1.2rem', fontWeight: 700 }}>
          कोई परिणाम नहीं मिला (No Contacts Found)
        </h3>
        <p style={{ maxWidth: '450px', fontSize: '0.9rem' }}>
          आपके द्वारा चुने गए ज़िला, पद या खोज मापदंड के अनुसार कोई पुलिस अधिकारी/कर्मचारी नहीं मिला। कृपया फ़िल्टर बदलें या रीसेट करें।
        </p>
        <button className="btn btn-primary" onClick={onResetFilters} style={{ marginTop: '0.5rem' }}>
          सभी फ़िल्टर साफ़ करें
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
          संपर्क निर्देशिका ({contacts.length} सक्रिय अधिकारी/कर्मचारी)
        </h2>
      </div>

      <div className="contacts-grid">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            currentUser={currentUser}
            onEdit={onEditContact}
            onToggleBlock={onToggleBlockContact}
            onToggleActive={onToggleActiveContact}
            onPromoteCoAdmin={onPromoteCoAdminContact}
            onDelete={onDeleteContact}
            onOpenChatWithContact={onOpenChatWithContact}
          />
        ))}
      </div>
    </div>
  );
}
