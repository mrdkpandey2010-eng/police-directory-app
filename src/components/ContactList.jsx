import React from 'react';
import ContactCard from './ContactCard';
import { SearchX } from 'lucide-react';

export default function ContactList({ 
  contacts, 
  currentUser, 
  permissions = [],
  onEditContact, 
  onToggleBlockContact, 
  onToggleActiveContact,
  onPromoteCoAdminContact,
  onDeleteContact,
  onResetFilters,
  onOpenChatWithContact,
  onPermissionUpdated
}) {
  if (contacts.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <SearchX size={44} color="var(--khaki-primary, #c49756)" />
        <h3 style={{ color: 'var(--text-bright, #fff)', fontSize: '1.1rem', fontWeight: 700, margin: '0.75rem 0 0.25rem 0' }}>
          कोई कार्मिक नहीं मिला (No Officers Found)
        </h3>
        <p style={{ maxWidth: '420px', margin: '0 auto', fontSize: '0.82rem', color: '#94a3b8' }}>
          आपके द्वारा चुने गए ज़िला, पद या खोज मापदंड के अनुसार कोई पुलिस अधिकारी/कर्मचारी नहीं मिला। कृपया फ़िल्टर बदलें या रीसेट करें।
        </p>
        <button className="btn btn-primary" onClick={onResetFilters} style={{ marginTop: '0.75rem', padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
          सभी फ़िल्टर साफ़ करें
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright, #fff)', margin: 0 }}>
          संपर्क निर्देशिका ({contacts.length} सक्रिय पुलिस कार्मिक)
        </h2>
      </div>

      <div className="contacts-grid">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            currentUser={currentUser}
            permissions={permissions}
            onEdit={onEditContact}
            onToggleBlock={onToggleBlockContact}
            onToggleActive={onToggleActiveContact}
            onPromoteCoAdmin={onPromoteCoAdminContact}
            onDelete={onDeleteContact}
            onOpenChatWithContact={onOpenChatWithContact}
            onPermissionUpdated={onPermissionUpdated}
          />
        ))}
      </div>
    </div>
  );
}
