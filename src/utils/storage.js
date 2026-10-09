import * as XLSX from 'xlsx';
import { 
  initialContacts, 
  initialCoAdmins, 
  initialNotifications, 
  initialFeedbacks,
  DEFAULT_UNIFORM_PHOTO,
  DEFAULT_UNIFORM_PHOTO_FEMALE,
  POSTS as DEFAULT_POSTS,
  OFFICES as DEFAULT_OFFICES,
  DEFAULT_OFFICE_ITEMS,
  DISTRICTS as DEFAULT_DISTRICTS,
  ALL_UP_DISTRICTS,
  STANDARD_POLICE_POSTS
} from '../data/mockContacts';
import { 
  idbSet, 
  idbGet, 
  idbSaveContacts, 
  idbGetContacts, 
  idbSaveChats, 
  idbGetChats, 
  migrateLocalStorageToIDB, 
  idbEnqueueSync 
} from './indexedDB';
import { 
  saveFirestoreContact, 
  syncAllContactsToFirestore, 
  isFirebaseConfigured, 
  deleteFirestoreContact,
  saveFirestoreDistricts,
  saveFirestorePosts,
  saveFirestoreOffices,
  saveFirestoreCoAdmins,
  saveFirestoreTerms,
  saveFirestorePolicies,
  saveFirestoreMasterConfig
} from './firebase';

const CONTACTS_KEY = 'police_directory_contacts_v2';
const COADMINS_KEY = 'police_directory_coadmins_v2';
const NOTIFS_KEY = 'police_directory_notifs_v2';
const FEEDBACKS_KEY = 'police_directory_feedbacks_v2';
const SESSION_KEY = 'police_directory_session_v2';
const CHATS_KEY = 'police_directory_chats_v2';
const FINAL_PROD_CLEAN_FLAG = 'police_directory_prod_zero_clean_v7';

// Complete & absolute purge of all mock/demo records for final production release
try {
  if (!localStorage.getItem(FINAL_PROD_CLEAN_FLAG)) {
    // 1. Wipe legacy mock localStorage keys
    localStorage.removeItem('police_directory_contacts_v1');
    localStorage.removeItem('police_directory_contacts_v2');
    localStorage.removeItem('police_directory_coadmins_v1');
    localStorage.removeItem('police_directory_coadmins_v2');
    localStorage.removeItem('police_directory_chats_v1');
    localStorage.removeItem('police_directory_chats_v2');
    localStorage.removeItem('police_directory_notifs_v1');
    localStorage.removeItem('police_directory_notifs_v2');
    localStorage.removeItem('police_directory_feedbacks_v1');
    localStorage.removeItem('police_directory_feedbacks_v2');
    localStorage.removeItem('police_directory_master_offices_v1');
    localStorage.removeItem('police_directory_master_posts_v1');
    localStorage.removeItem('police_directory_master_districts_v1');

    // 2. Set 100% clean zero defaults
    localStorage.setItem(CONTACTS_KEY, JSON.stringify([]));
    localStorage.setItem(COADMINS_KEY, JSON.stringify([]));
    localStorage.setItem(NOTIFS_KEY, JSON.stringify([]));
    localStorage.setItem(CHATS_KEY, JSON.stringify([]));
    localStorage.setItem(FEEDBACKS_KEY, JSON.stringify([]));
    localStorage.setItem('police_directory_master_offices_v1', JSON.stringify([]));
    localStorage.setItem('police_directory_master_posts_v1', JSON.stringify(DEFAULT_POSTS));
    localStorage.setItem('police_directory_master_districts_v1', JSON.stringify(DEFAULT_DISTRICTS));

    // 3. Sync to IndexedDB permanent vault
    idbSet(CONTACTS_KEY, []);
    idbSet(COADMINS_KEY, []);
    idbSet(NOTIFS_KEY, []);
    idbSet(CHATS_KEY, []);
    idbSet(FEEDBACKS_KEY, []);
    idbSet('police_directory_master_offices_v1', []);
    idbSet('police_directory_master_posts_v1', DEFAULT_POSTS);
    idbSet('police_directory_master_districts_v1', DEFAULT_DISTRICTS);

    localStorage.setItem(FINAL_PROD_CLEAN_FLAG, 'true');
  }
} catch (e) {}

// Master data keys for dynamic in-app configuration
const POSTS_KEY = 'police_directory_master_posts_v1';
const OFFICES_KEY = 'police_directory_master_offices_v1';
const DISTRICTS_KEY = 'police_directory_master_districts_v1';
const TERMS_KEY = 'police_directory_terms_v1';

// ---------------- CONFIDENTIALITY TERMS & CONDITIONS ----------------
export const DEFAULT_TERMS = {
  title: "उत्तर प्रदेश पुलिस - शासकीय गोपनीयता नीति एवं सेवा शर्तें",
  subtitle: "Official Confidentiality Policy & Terms of Service • केवल अधिकृत पुलिस कार्मिकों हेतु",
  lastUpdated: new Date().toISOString().split('T')[0],
  rules: [
    "यह पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के सेवारत अधिकृत पुलिस कार्मिकों के शासकीय एवं आपातकालीन समन्वय हेतु है।",
    "पोर्टल में उपलब्ध किसी भी अधिकारी अथवा कर्मचारी का व्यक्तिगत फोन नंबर, पता, या विवरण किसी अनधिकृत व्यक्ति अथवा सार्वजनिक सोशल मीडिया पर साझा करना पूर्णतः वर्जित है।",
    "सभी कार्मिकों के लिए पोर्टल में अपनी नवीनतम आधिकारिक वर्दी (Uniform) वाली स्पष्ट फोटो अपलोड एवं सत्यापित कराना अनिवार्य है। बिना वर्दी फोटो के ऐप का उपयोग प्रतिबंधित रहेगा।",
    "लॉगिन क्रेडेंशियल्स (PNO, मोबाइल नंबर, पासवर्ड) पूर्णतः व्यक्तिगत एवं गोपनीय हैं। अपने क्रेडेंशियल्स किसी अन्य के साथ साझा न करें।",
    "नियमों के उल्लंघन अथवा डेटा के दुरुपयोग की स्थिति में भारतीय सूचना प्रौद्योगिकी अधिनियम (IT Act) एवं पुलिस आचरण नियमावली के अंतर्गत कठोर दंडात्मक व विभागीय कार्यवाही की जाएगी।"
  ]
};

export const getStoredTerms = () => {
  try {
    const saved = localStorage.getItem(TERMS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_TERMS;
  } catch (err) {
    return DEFAULT_TERMS;
  }
};

export const saveTerms = (termsData) => {
  try {
    const updated = {
      ...termsData,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    try {
      localStorage.setItem(TERMS_KEY, JSON.stringify(updated));
    } catch (e) {}
    idbSet(TERMS_KEY, updated);
    if (isFirebaseConfigured()) {
      saveFirestoreTerms(updated);
    }
    return updated;
  } catch (err) {
    console.error('Error saving terms', err);
    return termsData;
  }
};

// ---------------- DYNAMIC POLICIES & CUSTOM LINKS CMS ----------------
const POLICIES_KEY = 'police_directory_policies_v2';

export const DEFAULT_POLICIES = [
  {
    id: "disclaimer",
    title: "Disclaimer",
    hindiTitle: "अस्वीकरण",
    isBuiltIn: true,
    content: `यह पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के सेवारत अधिकृत पुलिस कार्मिकों के शासकीय समन्वय एवं आपातकालीन कार्यों हेतु विकसित की गई है।\n\nमहत्वपूर्ण सूचना: इस पोर्टल पर प्रदर्शित समस्त कार्मिक विवरण, पदस्थापना एवं संपर्क नंबर आधिकारिक शासकीय रिकॉर्ड पर आधारित हैं। इसे किसी भी अनधिकृत तीसरे पक्ष अथवा सार्वजनिक माध्यम पर साझा करना भारतीय टेलीग्राफ अधिनियम एवं आईटी एक्ट के अंतर्गत दंडात्मक अपराध है।\n\nउत्तर प्रदेश पुलिस विभाग किसी भी ऐसे व्यक्ति के विरुद्ध कड़ी वैधानिक एवं अनुशासनात्मक कार्यवाही करने का अधिकार सुरक्षित रखता है जो इस पोर्टल के डेटा का अनधिकृत संग्रह, स्क्रीन रिकॉर्डिंग, स्क्रीनशॉट या व्यावसायिक उपयोग करता है।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: "terms",
    title: "Terms and Condition",
    hindiTitle: "नियम एवं शर्तें",
    isBuiltIn: true,
    content: `उत्तर प्रदेश पुलिस संपर्क पोर्टल के उपयोग हेतु निम्नलिखित शर्तों की पाबंदी अनिवार्य है:\n\n1. अधिकृत पहुँच: केवल वैध PNO एवं पुलिस पहचान पत्र धारक पुलिस कार्मिक ही पोर्टल में प्रवेश के पात्र हैं।\n2. वर्दी फोटो अनिवार्यता: प्रत्येक कार्मिक द्वारा अपनी आधिकारिक वर्दी वाली स्पष्ट फोटो अपलोड एवं सत्यापित कराना अनिवार्य है। बिना वर्दी फोटो के पोर्टल का संचालन प्रतिबंधित रहेगा।\n3. कॉलिंग एवं संचार मर्यादा: इन-ऐप कॉलिंग एवं मैसेज बॉक्स का उपयोग पूर्णतः शासकीय, आधिकारिक एवं गरिमामय संवाद हेतु ही किया जाएगा।\n4. अधिकतम कॉल सीमा: नेटवर्क एवं सर्वर सुरक्षा के दृष्टिगत प्रति कॉल अधिकतम 05 मिनट की सीमा निर्धारित है।\n5. गोपनीयता भंग पर कार्रवाई: किसी भी सहकर्मी का फोन नंबर बिना अनुमति सार्वजनिक करने पर विभागीय जांच एवं सेवा समाप्ति की अनुशंसा की जा सकेगी।\n6. सत्र सुरक्षा: 30 मिनट तक अक्रिय रहने पर पोर्टल स्वतः लॉगआउट हो जाता है।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: "copyright",
    title: "Copyright Policy",
    hindiTitle: "कॉपीराइट नीति",
    isBuiltIn: true,
    content: `इस पोर्टल पर उपलब्ध समस्त सामग्री, डिज़ाइन, लोगो, डेटाबेस संरचना, एवं सॉफ्टवेयर कोड उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ के अनन्य स्वामित्व एवं कॉपीराइट के अधीन हैं।\n\nसक्षम प्राधिकारी की पूर्व लिखित अनुमति के बिना इस पोर्टल की किसी भी सामग्री, डेटाबेस सूची, या कार्मिक जानकारी का किसी भी रूप में पुनरुत्पादन, डाउनलोड, प्रतिलिपि, या अन्यत्र प्रकाशन पूर्णतः प्रतिबंधित है।\n\n© ${new Date().getFullYear()} उत्तर प्रदेश पुलिस (Uttar Pradesh Police). सर्वाधिकार सुरक्षित।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    hindiTitle: "गोपनीयता नीति",
    isBuiltIn: true,
    content: `यह पोर्टल उपयोगकर्ता पुलिस कार्मिकों की निजता एवं शासकीय डेटा सुरक्षा के उच्चतम मानकों का पालन करता है।\n\n1. नंबर सुरक्षा एवं प्राइवेसी: अन्य जनपद के अधिकारियों के मोबाइल नंबर डिफ़ॉल्ट रूप से मास्क (XXXXXXXX) रहते हैं। संबंधित अधिकारी द्वारा अनुमति स्वीकार करने पर ही नंबर दृश्यमान होता है।\n2. सहमति आधारित पहुँच: व्यक्तिगत या गोपनीय नंबर देखने हेतु विधिवत अनुमति अनुरोध (Permission Request) भेजना अनिवार्य है।\n3. कॉल एवं सुरक्षा ऑडिट: सुरक्षा एवं ऑडिट हेतु इन-ऐप कॉल का समय, अवधि एवं सहभागी लॉग्स एन्क्रिप्टेड रूप में सुरक्षित रखे जाते हैं। ऑडियो का अनधिकृत तीसरे पक्ष पर भंडारण नहीं होता।\n4. स्क्रीन सुरक्षा: पोर्टल पर स्क्रीनशॉट एवं स्क्रीन रिकॉर्डिंग अवरोधन (Anti-Screenshot Protection) तकनीक सक्रिय है।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: "hyperlinking",
    title: "Hyperlinking Policy",
    hindiTitle: "हाइपरलिंकिंग नीति",
    isBuiltIn: true,
    content: `बाह्य वेबसाइटों के लिंक: इस पोर्टल से केवल उत्तर प्रदेश शासन अथवा भारत सरकार की आधिकारिक वेबसाइटों (उदा. uppolice.gov.in, up.gov.in) के अधिकृत लिंक ही संदर्भित किए जा सकते हैं।\n\nइस पोर्टल हेतु लिंकिंग अनुमति: किसी भी बाह्य पोर्टल अथवा ऐप द्वारा इस आंतरिक पोर्टल के किसी भी पृष्ठ को फ्रेम या हाइपरलिंक करने की अनुमति पूर्व लिखित शासकीय आदेश के बिना पूर्णतः अमान्य है।\n\nहम यह गारंटी नहीं देते कि बाह्य लिंक हर समय सक्रिय रहेंगे तथा लिंक किए गए बाहरी पृष्ठों की सामग्री पर हमारा कोई नियंत्रण नहीं है।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: "confidentiality",
    title: "शासकीय गोपनीयता नीति एवं सेवा शर्तें",
    hindiTitle: "गोपनीयता नीति एवं सेवा शर्तें",
    isBuiltIn: true,
    content: `1. यह पोर्टल एवं संपर्क निर्देशिका केवल उत्तर प्रदेश पुलिस के सेवारत अधिकृत पुलिस कार्मिकों के शासकीय एवं आपातकालीन समन्वय हेतु है।\n2. पोर्टल में उपलब्ध किसी भी अधिकारी अथवा कर्मचारी का व्यक्तिगत फोन नंबर, पता, या विवरण किसी अनधिकृत व्यक्ति अथवा सार्वजनिक सोशल मीडिया पर साझा करना पूर्णतः वर्जित है।\n3. सभी कार्मिकों के लिए पोर्टल में अपनी नवीनतम आधिकारिक वर्दी (Uniform) वाली स्पष्ट फोटो अपलोड एवं सत्यापित कराना अनिवार्य है। बिना वर्दी फोटो के ऐप का उपयोग प्रतिबंधित रहेगा।\n4. लॉगिन क्रेडेंशियल्स (PNO, मोबाइल नंबर, पासवर्ड) पूर्णतः व्यक्तिगत एवं गोपनीय हैं। अपने क्रेडेंशियल्स किसी अन्य के साथ साझा न करें।\n5. नियमों के उल्लंघन अथवा डेटा के दुरुपयोग की स्थिति में भारतीय सूचना प्रौद्योगिकी अधिनियम (IT Act) एवं पुलिस आचरण नियमावली के अंतर्गत कठोर दंडात्मक व विभागीय कार्यवाही की जाएगी।`,
    lastUpdated: new Date().toISOString().split('T')[0]
  }
];

export const getStoredPolicies = () => {
  try {
    const saved = localStorage.getItem(POLICIES_KEY);
    if (!saved) {
      localStorage.setItem(POLICIES_KEY, JSON.stringify(DEFAULT_POLICIES));
      return DEFAULT_POLICIES;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_POLICIES;
    return parsed;
  } catch (err) {
    return DEFAULT_POLICIES;
  }
};

export const savePolicies = (policiesList) => {
  try {
    try {
      localStorage.setItem(POLICIES_KEY, JSON.stringify(policiesList));
    } catch (e) {}
    idbSet(POLICIES_KEY, policiesList);
    if (isFirebaseConfigured()) {
      saveFirestorePolicies(policiesList);
    }
  } catch (err) {
    console.error('Error saving policies', err);
  }
};

export const addCustomPolicy = (policyData) => {
  const current = getStoredPolicies();
  const slug = (policyData.title || `link-${Date.now()}`)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-') || `link-${Date.now()}`;

  const newPolicy = {
    id: `custom-${slug}-${Date.now()}`,
    title: policyData.title.trim(),
    hindiTitle: (policyData.hindiTitle || policyData.title).trim(),
    isBuiltIn: false,
    content: (policyData.content || '').trim(),
    lastUpdated: new Date().toISOString().split('T')[0]
  };
  const updated = [...current, newPolicy];
  savePolicies(updated);
  return updated;
};

export const editPolicyItem = (policyId, updatedData) => {
  const current = getStoredPolicies();
  const updated = current.map(p => {
    if (p.id === policyId) {
      return {
        ...p,
        title: updatedData.title ? updatedData.title.trim() : p.title,
        hindiTitle: updatedData.hindiTitle ? updatedData.hindiTitle.trim() : p.hindiTitle,
        content: updatedData.content !== undefined ? updatedData.content.trim() : p.content,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
    }
    return p;
  });
  savePolicies(updated);
  return updated;
};

export const deleteCustomPolicyItem = (policyId) => {
  const current = getStoredPolicies();
  const updated = current.filter(p => p.id !== policyId || p.isBuiltIn);
  savePolicies(updated);
  return updated;
};

// ---------------- MASTER CONFIGURATION (POSTS, OFFICES, DISTRICTS) ----------------
export const getStoredPosts = () => {
  try {
    const saved = localStorage.getItem(POSTS_KEY);
    if (!saved) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(DEFAULT_POSTS));
      return DEFAULT_POSTS;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length <= 1) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(DEFAULT_POSTS));
      idbSet(POSTS_KEY, DEFAULT_POSTS);
      return DEFAULT_POSTS;
    }
    return parsed;
  } catch (err) {
    return DEFAULT_POSTS;
  }
};

export const savePosts = (posts) => {
  try {
    try {
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    } catch (e) {}
    idbSet(POSTS_KEY, posts);
  } catch (err) {}
  if (isFirebaseConfigured()) {
    saveFirestorePosts(posts);
  }
};

export const addPost = (postName) => {
  const current = getStoredPosts();
  const trimmed = postName.trim();
  if (trimmed && !current.includes(trimmed)) {
    const updated = [...current, trimmed];
    savePosts(updated);
    return updated;
  }
  return current;
};

export const editPost = (oldPostName, newPostName) => {
  const current = getStoredPosts();
  const trimmed = (newPostName || '').trim();
  if (!trimmed || trimmed === oldPostName) return current;

  const updated = current.map(p => p === oldPostName ? trimmed : p);
  savePosts(updated);

  // Synchronize contacts who hold this post
  try {
    const contacts = getStoredContacts();
    let contactChanged = false;
    const updatedContacts = contacts.map(c => {
      if (c.post === oldPostName) {
        contactChanged = true;
        return { ...c, post: trimmed };
      }
      return c;
    });
    if (contactChanged) {
      saveContacts(updatedContacts);
    }
  } catch (e) {
    console.error('Error syncing contacts with edited post', e);
  }

  return updated;
};

export const deletePost = (postName) => {
  const current = getStoredPosts();
  const updated = current.filter((p, i) => i === 0 || p !== postName);
  savePosts(updated);
  return updated;
};

export const getStoredOffices = () => {
  try {
    const saved = localStorage.getItem(OFFICES_KEY);
    if (!saved) {
      localStorage.setItem(OFFICES_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }

    // Filter out any lingering mock offices (off-1 to off-50, or off-migrated)
    const clean = parsed.filter(o => {
      const id = typeof o === 'object' ? (o.id || '') : '';
      return !/^off-(50|[1-4]?[0-9])$/.test(id) && !/^off-migrated/.test(id);
    });

    if (clean.length !== parsed.length) {
      localStorage.setItem(OFFICES_KEY, JSON.stringify(clean));
      idbSet(OFFICES_KEY, clean);
    }

    return clean;
  } catch (err) {
    return [];
  }
};

export const saveOffices = (offices) => {
  try {
    try {
      localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
    } catch (e) {}
    idbSet(OFFICES_KEY, offices);
  } catch (err) {}
  if (isFirebaseConfigured()) {
    saveFirestoreOffices(offices);
  }
};

export const addOffice = (officeName, districtName = '') => {
  const current = getStoredOffices();
  const trimmedName = (officeName || '').trim();
  const trimmedDist = (districtName || '').trim();
  if (!trimmedName) return current;

  // Check duplicate within the same district
  const exists = current.some(o => 
    typeof o === 'object' 
      ? (o.name === trimmedName && o.district === trimmedDist)
      : o === trimmedName
  );

  if (!exists) {
    const newOffice = {
      id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      district: trimmedDist
    };
    const updated = [...current, newOffice];
    saveOffices(updated);
    return updated;
  }
  return current;
};

export const editOffice = (officeIdOrName, newOfficeName, newDistrict = null) => {
  const current = getStoredOffices();
  const trimmedName = (newOfficeName || '').trim();
  if (!trimmedName) return current;

  let oldName = null;
  const updated = current.map(o => {
    if (typeof o === 'object') {
      if (o.id === officeIdOrName || o.name === officeIdOrName) {
        oldName = o.name;
        return {
          ...o,
          name: trimmedName,
          district: newDistrict ? newDistrict.trim() : o.district
        };
      }
      return o;
    } else {
      if (o === officeIdOrName) {
        oldName = o;
        return {
          id: `off-${Date.now()}`,
          name: trimmedName,
          district: newDistrict ? newDistrict.trim() : (o.district || '')
        };
      }
      return o;
    }
  });

  saveOffices(updated);

  // Sync contacts whose office changed
  if (oldName && oldName !== trimmedName) {
    try {
      const contacts = getStoredContacts();
      let contactChanged = false;
      const updatedContacts = contacts.map(c => {
        if (c.office === oldName) {
          contactChanged = true;
          return { ...c, office: trimmedName };
        }
        return c;
      });
      if (contactChanged) {
        saveContacts(updatedContacts);
      }
    } catch (e) {
      console.error('Error syncing contacts with edited office', e);
    }
  }

  return updated;
};

export const deleteOffice = (officeIdOrName) => {
  const current = getStoredOffices();
  const updated = current.filter(o => {
    if (typeof o === 'object') {
      return o.id !== officeIdOrName && o.name !== officeIdOrName;
    }
    return o !== officeIdOrName;
  });
  saveOffices(updated);
  return updated;
};

export const getOfficesForDistrict = (officesList, districtName) => {
  if (!Array.isArray(officesList)) return [];
  if (!districtName || districtName === 'सभी ज़िले (All Districts)' || districtName === 'सभी ज़िले') {
    return Array.from(new Set(officesList.map(o => typeof o === 'string' ? o : o.name)));
  }
  return officesList
    .filter(o => typeof o === 'object' && o.district === districtName)
    .map(o => o.name);
};

export const getStoredDistricts = () => {
  try {
    const saved = localStorage.getItem(DISTRICTS_KEY);
    if (!saved) {
      localStorage.setItem(DISTRICTS_KEY, JSON.stringify(DEFAULT_DISTRICTS));
      return DEFAULT_DISTRICTS;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length <= 1) {
      localStorage.setItem(DISTRICTS_KEY, JSON.stringify(DEFAULT_DISTRICTS));
      idbSet(DISTRICTS_KEY, DEFAULT_DISTRICTS);
      return DEFAULT_DISTRICTS;
    }
    return parsed;
  } catch (err) {
    return DEFAULT_DISTRICTS;
  }
};

export const loadAll75Districts = () => {
  saveDistricts(ALL_UP_DISTRICTS);
  return ALL_UP_DISTRICTS;
};

export const loadStandardPolicePosts = () => {
  savePosts(STANDARD_POLICE_POSTS);
  return STANDARD_POLICE_POSTS;
};

export const resetMasterDataToClean = () => {
  saveDistricts(DEFAULT_DISTRICTS);
  savePosts(DEFAULT_POSTS);
  saveOffices([]);
  return { districts: DEFAULT_DISTRICTS, posts: DEFAULT_POSTS, offices: [] };
};

export const saveDistricts = (districts) => {
  try {
    try {
      localStorage.setItem(DISTRICTS_KEY, JSON.stringify(districts));
    } catch (e) {}
    idbSet(DISTRICTS_KEY, districts);
  } catch (err) {}
  if (isFirebaseConfigured()) {
    saveFirestoreDistricts(districts);
  }
};

export const addDistrict = (distName) => {
  const current = getStoredDistricts();
  const trimmed = distName.trim();
  if (trimmed && !current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveDistricts(updated);
    return updated;
  }
  return current;
};

export const editDistrict = (oldDistName, newDistName) => {
  const current = getStoredDistricts();
  const trimmed = (newDistName || '').trim();
  if (!trimmed || trimmed === oldDistName) return current;

  const updated = current.map(d => d === oldDistName ? trimmed : d);
  saveDistricts(updated);

  // Sync contacts
  try {
    const contacts = getStoredContacts();
    let contactChanged = false;
    const updatedContacts = contacts.map(c => {
      if (c.district === oldDistName) {
        contactChanged = true;
        return { ...c, district: trimmed };
      }
      return c;
    });
    if (contactChanged) {
      saveContacts(updatedContacts);
    }
  } catch (e) {
    console.error('Error syncing contacts with edited district', e);
  }

  // Sync co-admins
  try {
    const coAdmins = getStoredCoAdmins();
    let coAdminChanged = false;
    const updatedCoAdmins = coAdmins.map(ca => {
      if (ca.district === oldDistName) {
        coAdminChanged = true;
        return { ...ca, district: trimmed };
      }
      return ca;
    });
    if (coAdminChanged) {
      saveCoAdmins(updatedCoAdmins);
    }
  } catch (e) {
    console.error('Error syncing co-admins with edited district', e);
  }

  // Sync offices
  try {
    const offices = getStoredOffices();
    let officesChanged = false;
    const updatedOffices = offices.map(o => {
      if (typeof o === 'object' && o.district === oldDistName) {
        officesChanged = true;
        return { ...o, district: trimmed };
      }
      return o;
    });
    if (officesChanged) {
      saveOffices(updatedOffices);
    }
  } catch (e) {
    console.error('Error syncing offices with edited district', e);
  }

  return updated;
};

export const deleteDistrict = (distName) => {
  const current = getStoredDistricts();
  const updated = current.filter((d, i) => i === 0 || d !== distName);
  saveDistricts(updated);
  return updated;
};

// ---------------- CONTACTS (PERMANENT RETENTION & FRESH DATABASE) ----------------
export const getStoredContacts = () => {
  try {
    const saved = localStorage.getItem(CONTACTS_KEY);
    if (!saved) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify([]));
      return [];
    }
    // Filter out any lingering mock IDs (pol-101 to pol-115) from previous mock data
    const cleanList = parsed.filter(c => !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
    if (cleanList.length !== parsed.length) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(cleanList));
    }
    return cleanList;
  } catch (err) {
    console.error('Error reading contacts', err);
    return [];
  }
};

export const saveContacts = (contacts) => {
  try {
    const validList = Array.isArray(contacts) ? contacts : [];
    // 1. Synchronous localStorage cache (with QuotaExceeded fallback protection)
    try {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(validList));
    } catch (quotaErr) {
      console.warn('[Storage] LocalStorage quota reached. IndexedDB permanent vault is safely storing all contacts & uniform photos:', quotaErr);
    }
    // 2. High-capacity IndexedDB permanent storage vault (500MB+)
    idbSaveContacts(validList);

    // 3. Automatic Two-Way Cloud Sync (Firebase Firestore)
    if (isFirebaseConfigured()) {
      syncAllContactsToFirestore(validList);
    } else {
      idbEnqueueSync('sync_contacts', validList);
    }
  } catch (err) {
    console.error('Error in saveContacts:', err);
  }
};

/**
 * Load contacts from high-capacity permanent IndexedDB storage vault
 */
export const loadContactsFromPermanentStorage = async () => {
  try {
    // 1. First ensure migration of legacy localStorage into IDB
    await migrateLocalStorageToIDB();
    // 2. Fetch from IndexedDB
    const idbContacts = await idbGetContacts();
    if (Array.isArray(idbContacts) && idbContacts.length > 0) {
      const cleanContacts = idbContacts.filter(c => !/^pol-1(0[1-9]|1[0-5])$/.test(c.id));
      if (cleanContacts.length !== idbContacts.length) {
        idbSaveContacts(cleanContacts);
      }
      try {
        localStorage.setItem(CONTACTS_KEY, JSON.stringify(cleanContacts));
      } catch (e) {}
      return cleanContacts;
    }
  } catch (err) {
    console.warn('[Storage] Error loading from IndexedDB:', err);
  }
  return getStoredContacts();
};

// ---------------- CO-ADMINS ----------------
export const getStoredCoAdmins = () => {
  try {
    const saved = localStorage.getItem(COADMINS_KEY);
    if (!saved) {
      localStorage.setItem(COADMINS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [];

    // Purge lingering demo coadmins (coadmin-lk, kn, vn, ag)
    const clean = parsed.filter(c => !/^coadmin-(lk|kn|vn|ag)/.test(c.id));
    if (clean.length !== parsed.length) {
      localStorage.setItem(COADMINS_KEY, JSON.stringify(clean));
      idbSet(COADMINS_KEY, clean);
    }
    return clean;
  } catch (err) {
    console.error('Error reading coadmins', err);
    return [];
  }
};

export const saveCoAdmins = (coadmins) => {
  try {
    const valid = Array.isArray(coadmins) ? coadmins : [];
    try {
      localStorage.setItem(COADMINS_KEY, JSON.stringify(valid));
    } catch (e) {}
    idbSet(COADMINS_KEY, valid);
    if (isFirebaseConfigured()) {
      saveFirestoreCoAdmins(valid);
    }
  } catch (err) {
    console.error('Error saving coadmins', err);
  }
};

export const addCoAdmin = (coAdminData) => {
  const current = getStoredCoAdmins();
  const newCoAdmin = {
    id: `coadmin-${Date.now()}`,
    username: coAdminData.username.trim().toLowerCase(),
    name: coAdminData.name.trim(),
    district: coAdminData.district,
    phone: coAdminData.phone.trim(),
    password: coAdminData.password || '1234',
    role: 'co_admin',
    status: 'active'
  };
  const updated = [newCoAdmin, ...current];
  saveCoAdmins(updated);
  return updated;
};

export const deleteCoAdmin = (id) => {
  const current = getStoredCoAdmins();
  const updated = current.filter(c => c.id !== id);
  saveCoAdmins(updated);
  return updated;
};

// Toggle Co-Admin Active / Inactive status (Admin Only)
export const toggleCoAdminActive = (id) => {
  const current = getStoredCoAdmins();
  const updated = current.map(c => {
    if (c.id === id) {
      const isCurrentlyActive = c.status !== 'inactive';
      return { ...c, status: isCurrentlyActive ? 'inactive' : 'active' };
    }
    return c;
  });
  saveCoAdmins(updated);
  return updated;
};

// ---------------- PROMOTE USER TO CO-ADMIN & REVOKE ----------------
export const promoteUserToCoAdmin = (contacts, coAdmins, userId, assignedDistrict = null) => {
  const user = contacts.find(c => c.id === userId);
  if (!user) return { updatedContacts: contacts, updatedCoAdmins: coAdmins };

  const targetDistrict = assignedDistrict || user.district;

  const updatedContacts = contacts.map(c => 
    c.id === userId ? { ...c, isCoAdmin: true, district: targetDistrict } : c
  );
  saveContacts(updatedContacts);

  const existingCoAdminIdx = coAdmins.findIndex(ca => 
    ca.userId === userId || ca.id === `coadmin-${userId}` || ca.phone === user.phone
  );

  let updatedCoAdmins;
  if (existingCoAdminIdx !== -1) {
    updatedCoAdmins = [...coAdmins];
    updatedCoAdmins[existingCoAdminIdx] = {
      ...updatedCoAdmins[existingCoAdminIdx],
      district: targetDistrict,
      status: 'active'
    };
  } else {
    const cleanUsername = 'co_' + (user.pno ? user.pno.toLowerCase().replace(/[^a-z0-9]/g, '') : user.phone);
    const newCoAdmin = {
      id: `coadmin-${user.id}`,
      userId: user.id,
      username: cleanUsername,
      name: `${user.name} (नोडल/Co-Admin)`,
      district: targetDistrict,
      phone: user.phone,
      password: user.password || '1234',
      role: 'co_admin',
      status: 'active'
    };
    updatedCoAdmins = [newCoAdmin, ...coAdmins];
  }

  saveCoAdmins(updatedCoAdmins);
  return { updatedContacts, updatedCoAdmins };
};

export const revokeCoAdmin = (contacts, coAdmins, identifier) => {
  const targetCoAdmin = coAdmins.find(ca => 
    ca.id === identifier || ca.userId === identifier || ca.id === `coadmin-${identifier}` || (ca.phone && ca.phone === identifier)
  );
  const updatedCoAdmins = coAdmins.filter(ca => 
    ca.id !== identifier && ca.userId !== identifier && ca.id !== `coadmin-${identifier}` && ca.phone !== identifier
  );
  saveCoAdmins(updatedCoAdmins);

  const updatedContacts = contacts.map(c => {
    if (
      c.id === identifier || 
      (targetCoAdmin && (c.id === targetCoAdmin.userId || c.phone === targetCoAdmin.phone))
    ) {
      return { ...c, isCoAdmin: false };
    }
    return c;
  });
  saveContacts(updatedContacts);

  return { updatedContacts, updatedCoAdmins };
};

// ---------------- DISTRICT TRANSFER WORKFLOW ----------------
// Step 1: User submits transfer request (status: 'pending_coadmin')
export const requestDistrictTransfer = (contacts, userId, toDistrict, reason = '') => {
  const user = contacts.find(c => c.id === userId);
  if (!user) return contacts;

  const transferData = {
    id: `transfer-${Date.now()}`,
    fromDistrict: user.district,
    toDistrict: toDistrict,
    reason: (reason || '').trim(),
    status: 'pending_coadmin', // Pending local Co-Admin forwarding
    requestedAt: new Date().toISOString(),
    forwardedAt: null,
    forwardedBy: null,
    approvedAt: null,
    approvedBy: null
  };

  const updatedContacts = contacts.map(c => {
    if (c.id === userId) {
      return {
        ...c,
        districtTransfer: transferData
      };
    }
    return c;
  });

  saveContacts(updatedContacts);
  return updatedContacts;
};

// Step 2: Co-Admin reviews and forwards to Super Admin (status: 'pending_admin')
export const forwardDistrictTransferToAdmin = (contacts, userId, coAdminName = 'Co-Admin') => {
  const updatedContacts = contacts.map(c => {
    if (c.id === userId && c.districtTransfer) {
      return {
        ...c,
        districtTransfer: {
          ...c.districtTransfer,
          status: 'pending_admin',
          forwardedAt: new Date().toISOString(),
          forwardedBy: coAdminName
        }
      };
    }
    return c;
  });

  saveContacts(updatedContacts);
  return updatedContacts;
};

// Step 3: Super Admin gives final approval (officer's district actually changes)
export const approveDistrictTransferByAdmin = (contacts, userId, adminName = 'Super Admin') => {
  const targetUser = contacts.find(c => c.id === userId);
  if (!targetUser || !targetUser.districtTransfer) return contacts;

  const newDistrict = targetUser.districtTransfer.toDistrict;

  const updatedContacts = contacts.map(c => {
    if (c.id === userId) {
      return {
        ...c,
        district: newDistrict,
        // If they were Co-Admin in the old district, revoke Co-Admin role
        isCoAdmin: false,
        districtTransfer: null,
        registrationNotes: `जनपद स्थानांतरण स्वीकृत: ${targetUser.districtTransfer.fromDistrict} ➔ ${newDistrict} (${new Date().toLocaleDateString('hi-IN')})`
      };
    }
    return c;
  });

  saveContacts(updatedContacts);

  // If officer was Co-Admin in old district, remove from coAdmins
  try {
    const coAdmins = getStoredCoAdmins();
    const updatedCoAdmins = coAdmins.filter(ca => ca.userId !== userId && ca.phone !== targetUser.phone);
    if (updatedCoAdmins.length !== coAdmins.length) {
      saveCoAdmins(updatedCoAdmins);
    }
  } catch (err) {}

  return updatedContacts;
};

// Reject District Transfer (Co-Admin or Super Admin)
export const rejectDistrictTransfer = (contacts, userId) => {
  const updatedContacts = contacts.map(c => {
    if (c.id === userId) {
      return {
        ...c,
        districtTransfer: null
      };
    }
    return c;
  });

  saveContacts(updatedContacts);
  return updatedContacts;
};

// ---------------- NOTIFICATIONS ----------------
export const getStoredNotifications = () => {
  try {
    const saved = localStorage.getItem(NOTIFS_KEY);
    if (!saved) {
      localStorage.setItem(NOTIFS_KEY, JSON.stringify(initialNotifications));
      return initialNotifications;
    }
    return JSON.parse(saved);
  } catch (err) {
    console.error('Error reading notifications', err);
    return initialNotifications;
  }
};

export const saveNotifications = (notifs) => {
  try {
    const valid = Array.isArray(notifs) ? notifs : [];
    try {
      localStorage.setItem(NOTIFS_KEY, JSON.stringify(valid));
    } catch (e) {}
    idbSet(NOTIFS_KEY, valid);
  } catch (err) {
    console.error('Error saving notifications', err);
  }
};

export const addNotification = (notifData) => {
  const current = getStoredNotifications();
  const newNotif = {
    id: notifData.id || `notif-${Date.now()}`,
    title: notifData.title ? notifData.title.trim() : '',
    content: notifData.content ? notifData.content.trim() : '',
    district: notifData.district || 'सभी ज़िले (All Districts)',
    postedBy: notifData.postedBy || 'Admin',
    postedAt: notifData.postedAt || new Date().toISOString(),
    type: notifData.type || 'official',
    targetUserId: notifData.targetUserId || null,
    senderId: notifData.senderId || null,
    chatId: notifData.chatId || null,
    permissionId: notifData.permissionId || null,
    callerData: notifData.callerData || null
  };
  const updated = [newNotif, ...current];
  saveNotifications(updated);
  return updated;
};

export const deleteNotification = (id) => {
  const current = getStoredNotifications();
  const updated = current.filter(n => n.id !== id);
  saveNotifications(updated);
  return updated;
};

// ---------------- FEEDBACKS ----------------
export const getStoredFeedbacks = () => {
  try {
    const saved = localStorage.getItem(FEEDBACKS_KEY);
    if (!saved) {
      localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(initialFeedbacks));
      return initialFeedbacks;
    }
    return JSON.parse(saved);
  } catch (err) {
    console.error('Error reading feedbacks', err);
    return initialFeedbacks;
  }
};

export const saveFeedbacks = (feedbacks) => {
  try {
    const valid = Array.isArray(feedbacks) ? feedbacks : [];
    try {
      localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(valid));
    } catch (e) {}
    idbSet(FEEDBACKS_KEY, valid);
  } catch (err) {
    console.error('Error saving feedbacks', err);
  }
};

export const addFeedback = (feedbackData) => {
  const current = getStoredFeedbacks();
  const newFeedback = {
    id: `feed-${Date.now()}`,
    userId: feedbackData.userId || '',
    userName: feedbackData.userName || 'अज्ञात कर्मचारी',
    district: feedbackData.district || '',
    phone: feedbackData.phone || '',
    subject: feedbackData.subject.trim(),
    message: feedbackData.message.trim(),
    status: 'open',
    createdAt: new Date().toISOString()
  };
  const updated = [newFeedback, ...current];
  saveFeedbacks(updated);
  return updated;
};

export const toggleResolveFeedback = (id) => {
  const current = getStoredFeedbacks();
  const updated = current.map(f => {
    if (f.id === id) {
      return { ...f, status: f.status === 'open' ? 'resolved' : 'open' };
    }
    return f;
  });
  saveFeedbacks(updated);
  return updated;
};

// ---------------- SESSION & AUTH ----------------
export const getStoredSession = () => {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    return null;
  }
};

export const saveSession = (user) => {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (err) {}
};

// ---------------- CHATS & GROUP MESSAGING WITH SUPERVISORY CHAIN ----------------
export const initialChats = [];

export const getStoredChats = () => {
  try {
    const saved = localStorage.getItem(CHATS_KEY);
    if (!saved) {
      localStorage.setItem(CHATS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      localStorage.setItem(CHATS_KEY, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('Error reading chats', err);
    return [];
  }
};

export const saveChats = (chats) => {
  try {
    const valid = Array.isArray(chats) ? chats : [];
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(valid));
    } catch (e) {}
    idbSaveChats(valid);
  } catch (err) {
    console.error('Error saving chats', err);
  }
};

// Send direct Peer-to-Peer (1-on-1) message with instant recipient notification
export const sendDirectMessage = (chats, contacts, sender, recipient, text, file = null) => {
  const cleanText = (text || '').trim();
  // Check if direct chat already exists between sender and recipient
  let targetChat = chats.find(c => 
    c.type === 'direct' && 
    c.participants.includes(sender.id) && 
    c.participants.includes(recipient.id)
  );

  const newMessage = {
    id: `msg-${Date.now()}`,
    senderId: sender.id,
    senderName: sender.name,
    senderPost: sender.post || 'अधिकारी',
    senderDistrict: sender.district || 'उत्तर प्रदेश',
    senderPno: sender.pno || '',
    text: cleanText,
    file: file,
    timestamp: new Date().toISOString(),
    readBy: [sender.id]
  };

  let updatedChats;
  let targetChatId;

  if (targetChat) {
    targetChatId = targetChat.id;
    updatedChats = chats.map(c => {
      if (c.id === targetChat.id) {
        return {
          ...c,
          messages: [...c.messages, newMessage],
          lastMessage: cleanText || (file ? `फ़ाइल संलग्न: ${file.name}` : 'नया संदेश'),
          lastUpdated: new Date().toISOString()
        };
      }
      return c;
    });
  } else {
    targetChatId = `chat-p2p-${sender.id}-${recipient.id}`;
    const newChatObj = {
      id: targetChatId,
      type: "direct",
      title: `${recipient.name} (${recipient.district})`,
      participants: [sender.id, recipient.id],
      district: recipient.district,
      lastMessage: cleanText || (file ? `फ़ाइल संलग्न: ${file.name}` : 'नया संदेश'),
      lastUpdated: new Date().toISOString(),
      messages: [newMessage]
    };
    updatedChats = [newChatObj, ...chats];
  }

  saveChats(updatedChats);

  // Automatic recipient notification
  addNotification({
    title: `📩 नया संदेश: ${sender.name} (${sender.post || 'अधिकारी'})`,
    content: `अधिकारी ${sender.name} (${sender.post || 'अधिकारी'}, जनपद: ${sender.district || ''}) ने आपको संदेश भेजा है: "${cleanText ? cleanText.substring(0, 80) : (file ? file.name : 'फ़ाइल संलग्न')}"`,
    district: recipient.district || 'सभी ज़िले (All Districts)',
    postedBy: `${sender.name} (${sender.district || ''})`,
    type: 'direct_message',
    targetUserId: recipient.id,
    senderId: sender.id,
    chatId: targetChatId
  });

  return { updatedChats, targetChatId };
};

// Create WhatsApp-style custom police group
export const createGroupChat = (chats, creator, groupTitle, participantIds, description = '') => {
  const allParticipantIds = Array.from(new Set([creator.id, ...participantIds]));
  const newGroupId = `group-${Date.now()}`;
  const newGroupObj = {
    id: newGroupId,
    type: "group",
    title: groupTitle.trim(),
    description: (description || '').trim(),
    createdBy: creator.id,
    participants: allParticipantIds,
    district: creator.district || 'सभी ज़िले (All Districts)',
    lastMessage: `समूह का निर्माण ${creator.name} द्वारा किया गया।`,
    lastUpdated: new Date().toISOString(),
    messages: [
      {
        id: `grp-msg-${Date.now()}`,
        senderId: creator.id,
        senderName: creator.name,
        senderPost: creator.post || 'ग्रुप एडमिन',
        senderDistrict: creator.district,
        senderPno: creator.pno,
        text: `जय हिंद। "${groupTitle.trim()}" समूह का निर्माण विभागीय समन्वय हेतु किया गया है।`,
        file: null,
        timestamp: new Date().toISOString(),
        readBy: [creator.id]
      }
    ]
  };

  const updatedChats = [newGroupObj, ...chats];
  saveChats(updatedChats);
  return { updatedChats, newGroupId };
};

// Append message directly to an existing active chat (Direct or Group)
export const appendMessageToChat = (chats, chatId, sender, text, file = null) => {
  const cleanText = (text || '').trim();
  const targetChat = chats.find(c => c.id === chatId);
  if (!targetChat) return chats;

  const newMessage = {
    id: `msg-${Date.now()}`,
    senderId: sender.id,
    senderName: sender.name,
    senderPost: sender.post || 'अधिकारी',
    senderDistrict: sender.district || 'उत्तर प्रदेश',
    senderPno: sender.pno || '',
    text: cleanText,
    file: file,
    timestamp: new Date().toISOString(),
    readBy: [sender.id]
  };

  const updatedChats = chats.map(c => {
    if (c.id === chatId) {
      const participants = Array.from(new Set([...(c.participants || []), sender.id]));
      return {
        ...c,
        participants,
        messages: [...c.messages, newMessage],
        lastMessage: cleanText || (file ? `फ़ाइल: ${file.name}` : 'नया संदेश'),
        lastUpdated: new Date().toISOString()
      };
    }
    return c;
  });

  saveChats(updatedChats);

  // If this is a direct chat, notify the other participant
  if (targetChat.type === 'direct' && targetChat.participants) {
    const otherParticipantId = targetChat.participants.find(p => p !== sender.id);
    if (otherParticipantId) {
      addNotification({
        title: `📩 नया संदेश: ${sender.name} (${sender.post || 'अधिकारी'})`,
        content: `अधिकारी ${sender.name} ने आपको संदेश भेजा है: "${cleanText ? cleanText.substring(0, 80) : (file ? file.name : 'फ़ाइल संलग्न')}"`,
        district: targetChat.district || 'सभी ज़िले (All Districts)',
        postedBy: `${sender.name}`,
        type: 'direct_message',
        targetUserId: otherParticipantId,
        senderId: sender.id,
        chatId: chatId
      });
    }
  }

  return updatedChats;
};

// Send message inside a group chat
export const sendGroupMessage = (chats, groupId, sender, text, file = null) => {
  return appendMessageToChat(chats, groupId, sender, text, file);
};

// Add new participants to an existing group chat
export const addGroupParticipants = (chats, groupId, newParticipantIds, addedBy, contacts = []) => {
  if (!Array.isArray(chats) || !groupId || !Array.isArray(newParticipantIds) || newParticipantIds.length === 0) {
    return { updatedChats: chats, targetChat: null };
  }

  const targetChat = chats.find(c => c.id === groupId);
  if (!targetChat) return { updatedChats: chats, targetChat: null };

  const currentParticipants = targetChat.participants || [];
  const trulyNewIds = newParticipantIds.filter(id => !currentParticipants.includes(id));

  if (trulyNewIds.length === 0) {
    return { updatedChats: chats, targetChat };
  }

  // Determine names for system announcement
  const addedNames = trulyNewIds.map(id => {
    const c = contacts.find(contact => contact.id === id);
    return c ? (c.post ? `${c.name} (${c.post})` : c.name) : 'अधिकारी';
  }).join(', ');

  const systemText = addedBy && addedBy.name 
    ? `${addedBy.name} ने ${addedNames} को ग्रुप में जोड़ा।`
    : `${addedNames} को ग्रुप में जोड़ा गया।`;

  const systemMessage = {
    id: `grp-sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: 'system',
    senderName: 'सिस्टम',
    isSystem: true,
    text: systemText,
    file: null,
    timestamp: new Date().toISOString(),
    readBy: [addedBy?.id || 'system']
  };

  const updatedParticipants = [...currentParticipants, ...trulyNewIds];

  const updatedChat = {
    ...targetChat,
    participants: updatedParticipants,
    messages: [...(targetChat.messages || []), systemMessage],
    lastMessage: systemText,
    lastUpdated: new Date().toISOString()
  };

  const updatedChats = chats.map(c => c.id === groupId ? updatedChat : c);
  saveChats(updatedChats);

  return { updatedChats, updatedChat };
};

// Remove a participant from an existing group chat
export const removeGroupParticipant = (chats, groupId, participantIdToRemove, removedBy, contacts = []) => {
  if (!Array.isArray(chats) || !groupId || !participantIdToRemove) {
    return { updatedChats: chats, targetChat: null };
  }

  const targetChat = chats.find(c => c.id === groupId);
  if (!targetChat) return { updatedChats: chats, targetChat: null };

  const targetContact = contacts.find(c => c.id === participantIdToRemove);
  const removedName = targetContact 
    ? (targetContact.post ? `${targetContact.name} (${targetContact.post})` : targetContact.name)
    : 'सदस्य';

  const systemText = removedBy && removedBy.name
    ? `${removedBy.name} ने ${removedName} को ग्रुप से हटाया।`
    : `${removedName} को ग्रुप से हटाया गया।`;

  const systemMessage = {
    id: `grp-sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: 'system',
    senderName: 'सिस्टम',
    isSystem: true,
    text: systemText,
    file: null,
    timestamp: new Date().toISOString(),
    readBy: [removedBy?.id || 'system']
  };

  const updatedParticipants = (targetChat.participants || []).filter(id => id !== participantIdToRemove);

  const updatedChat = {
    ...targetChat,
    participants: updatedParticipants,
    messages: [...(targetChat.messages || []), systemMessage],
    lastMessage: systemText,
    lastUpdated: new Date().toISOString()
  };

  const updatedChats = chats.map(c => c.id === groupId ? updatedChat : c);
  saveChats(updatedChats);

  return { updatedChats, updatedChat };
};

// Leave a group chat
export const leaveGroupChat = (chats, groupId, leavingUser) => {
  if (!Array.isArray(chats) || !groupId || !leavingUser) {
    return { updatedChats: chats, targetChat: null };
  }

  const targetChat = chats.find(c => c.id === groupId);
  if (!targetChat) return { updatedChats: chats, targetChat: null };

  const systemText = `${leavingUser.name || 'सदस्य'} ग्रुप से बाहर हो गए।`;

  const systemMessage = {
    id: `grp-sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: 'system',
    senderName: 'सिस्टम',
    isSystem: true,
    text: systemText,
    file: null,
    timestamp: new Date().toISOString(),
    readBy: [leavingUser.id]
  };

  const updatedParticipants = (targetChat.participants || []).filter(id => id !== leavingUser.id);

  const updatedChat = {
    ...targetChat,
    participants: updatedParticipants,
    messages: [...(targetChat.messages || []), systemMessage],
    lastMessage: systemText,
    lastUpdated: new Date().toISOString()
  };

  const updatedChats = chats.map(c => c.id === groupId ? updatedChat : c);
  saveChats(updatedChats);

  return { updatedChats, updatedChat };
};

// Delete a group chat completely
export const deleteGroupChat = (chats, groupId) => {
  if (!Array.isArray(chats) || !groupId) return chats;
  const updatedChats = chats.filter(c => c.id !== groupId);
  saveChats(updatedChats);
  return updatedChats;
};


// Mark all messages in a chat as read by a user
export const markChatAsRead = (chats, chatId, userId) => {
  if (!chats || !chatId || !userId) return chats;
  let hasChanges = false;
  const updatedChats = chats.map(c => {
    if (c.id === chatId && Array.isArray(c.messages)) {
      const updatedMessages = c.messages.map(m => {
        const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
        if (!readBy.includes(userId)) {
          hasChanges = true;
          return { ...m, readBy: [...readBy, userId] };
        }
        return m;
      });
      return { ...c, messages: updatedMessages };
    }
    return c;
  });

  if (hasChanges) {
    saveChats(updatedChats);
  }
  return updatedChats;
};

// Count total unread messages for a given user across all their chats
export const getUnreadMessagesCountForUser = (chats, userId) => {
  if (!userId || !Array.isArray(chats)) return 0;
  let count = 0;
  for (const c of chats) {
    if (c.participants && c.participants.includes(userId)) {
      for (const m of c.messages || []) {
        if (m.senderId !== userId) {
          const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
          if (!readBy.includes(userId)) {
            count++;
          }
        }
      }
    }
  }
  return count;
};

// Count unread messages inside a specific chat for a user
export const getUnreadCountForChat = (chat, userId) => {
  if (!chat || !userId || !Array.isArray(chat.messages)) return 0;
  let count = 0;
  for (const m of chat.messages) {
    if (m.senderId !== userId) {
      const readBy = Array.isArray(m.readBy) ? m.readBy : [m.senderId];
      if (!readBy.includes(userId)) {
        count++;
      }
    }
  }
  return count;
};

// Filter chats for a user (Includes Direct Chats and Group Chats)
export const getChatsForUser = (chats, contacts, currentUser) => {
  if (!currentUser) return [];

  if (currentUser.role === 'admin') {
    return chats;
  }

  return chats.filter(c => {
    if (c.participants && c.participants.includes(currentUser.id)) {
      return true;
    }
    if (c.type === 'group') {
      if (c.district === 'सभी ज़िले (All Districts)' || c.district === currentUser.district) {
        return true;
      }
      if (currentUser.role === 'co_admin') {
        return true;
      }
    }
    return false;
  });
};

// Reset all to default demo data
export const resetToDefaultContacts = () => {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(initialContacts));
  localStorage.setItem(COADMINS_KEY, JSON.stringify(initialCoAdmins));
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(initialNotifications));
  localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(initialFeedbacks));
  localStorage.setItem(CHATS_KEY, JSON.stringify(initialChats));
  localStorage.setItem(POSTS_KEY, JSON.stringify(DEFAULT_POSTS));
  localStorage.setItem(OFFICES_KEY, JSON.stringify(DEFAULT_OFFICES));
  localStorage.setItem(DISTRICTS_KEY, JSON.stringify(DEFAULT_DISTRICTS));
  return {
    contacts: initialContacts,
    coAdmins: initialCoAdmins,
    notifications: initialNotifications,
    feedbacks: initialFeedbacks,
    chats: initialChats,
    posts: DEFAULT_POSTS,
    offices: DEFAULT_OFFICES,
    districts: DEFAULT_DISTRICTS
  };
};

// ---------------- USER SELF-REGISTRATION (Status: Pending) ----------------
export const registerNewOfficer = (contacts, officerData) => {
  const newOfficer = {
    id: `pol-reg-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    pno: (officerData.pno ? officerData.pno.trim() : `PNO-${Math.floor(100000000 + Math.random() * 900000000)}`),
    name: (officerData.name || '').trim(),
    post: officerData.post || 'आरक्षी (Constable)',
    district: officerData.district || 'लखनऊ',
    office: (officerData.office || '').trim(),
    phone: (officerData.phone || '').trim(),
    whatsapp: (officerData.whatsapp ? officerData.whatsapp.trim() : (officerData.phone || '').trim()),
    email: (officerData.email ? officerData.email.trim() : ''),
    password: (officerData.password ? officerData.password.trim() : '1234'),
    status: 'pending',
    isRegisteredUser: true,
    uniformPhoto: officerData.uniformPhoto || null,
    uniformPhotoUploaded: Boolean(officerData.uniformPhoto),
    isPhoneHidden: Boolean(officerData.isPhoneHidden),
    createdAt: new Date().toISOString(),
    registrationNotes: officerData.registrationNotes || 'कर्मचारी द्वारा स्व-पंजीकरण (वर्दी फोटो संलग्न)।'
  };

  const updatedList = [newOfficer, ...contacts];
  saveContacts(updatedList);
  return { updatedList, newOfficer };
};

// ---------------- UPDATE UNIFORM PHOTO (Mandatory Verification) ----------------
export const updateUserUniformPhoto = (contacts, userId, photoBase64) => {
  const current = contacts && contacts.length > 0 ? contacts : getStoredContacts();
  const updatedList = current.map(c => {
    if (c.id === userId) {
      return {
        ...c,
        uniformPhoto: photoBase64,
        uniformPhotoUploaded: true,
        uniformPhotoUploadedAt: new Date().toISOString()
      };
    }
    return c;
  });
  saveContacts(updatedList);
  return updatedList;
};

// ---------------- APPROVE / REJECT REGISTRATION ----------------
export const approveOfficer = (contacts, id) => {
  const updatedList = contacts.map(c => c.id === id ? { ...c, status: 'approved' } : c);
  saveContacts(updatedList);
  return updatedList;
};

export const rejectOfficer = (contacts, id) => {
  const updatedList = contacts.filter(c => c.id !== id);
  saveContacts(updatedList);
  return updatedList;
};

// ---------------- USER ACTIVE / INACTIVE TOGGLE (Admin & Co-Admin) ----------------
export const toggleUserActive = (contacts, id) => {
  let newStatus = 'inactive';
  const updatedList = contacts.map(c => {
    if (c.id === id) {
      const isCurrentlyActive = c.status === 'approved' || c.status === 'active';
      newStatus = isCurrentlyActive ? 'inactive' : 'approved';
      return { ...c, status: newStatus };
    }
    return c;
  });
  saveContacts(updatedList);

  try {
    const coAdmins = getStoredCoAdmins();
    const target = contacts.find(c => c.id === id);
    const updatedCoAdmins = coAdmins.map(ca => {
      if (ca.userId === id || ca.id === id || ca.id === `coadmin-${id}` || (target && target.phone && ca.phone === target.phone)) {
        return { ...ca, status: newStatus === 'inactive' ? 'inactive' : 'active' };
      }
      return ca;
    });
    saveCoAdmins(updatedCoAdmins);
  } catch (err) {}

  return updatedList;
};

// ---------------- EDIT / UPDATE CONTACT (Admin / Co-Admin) ----------------
export const editOfficerProfile = (contacts, updatedData) => {
  const updatedList = contacts.map(c => c.id === updatedData.id ? { ...c, ...updatedData } : c);
  saveContacts(updatedList);
  return updatedList;
};

// ---------------- USER PROFILE UPDATE REQUEST ----------------
export const requestUserProfileUpdate = (contacts, userId, updatedFields) => {
  const updatedList = contacts.map(c => {
    if (c.id === userId) {
      return {
        ...c,
        ...updatedFields,
        status: 'pending',
        registrationNotes: `कर्मचारी द्वारा प्रोफ़ाइल अपडेट अनुरोध (${new Date().toLocaleDateString('hi-IN')})`
      };
    }
    return c;
  });
  saveContacts(updatedList);
  return updatedList;
};

// ---------------- BLOCK / UNBLOCK ----------------
export const toggleBlockOfficer = (contacts, id) => {
  let newStatus = 'blocked';
  const updatedList = contacts.map(c => {
    if (c.id === id) {
      newStatus = c.status === 'blocked' ? 'approved' : 'blocked';
      return { ...c, status: newStatus };
    }
    return c;
  });
  saveContacts(updatedList);

  try {
    const coAdmins = getStoredCoAdmins();
    const target = contacts.find(c => c.id === id);
    const updatedCoAdmins = coAdmins.map(ca => {
      if (ca.userId === id || ca.id === id || ca.id === `coadmin-${id}` || (target && target.phone && ca.phone === target.phone)) {
        return { ...ca, status: newStatus === 'blocked' ? 'blocked' : 'active' };
      }
      return ca;
    });
    saveCoAdmins(updatedCoAdmins);
  } catch (err) {}

  return updatedList;
};

// ---------------- DELETE CONTACT ----------------
export const deleteOfficerProfile = (contacts, id) => {
  const updatedList = contacts.filter(c => c.id !== id);
  saveContacts(updatedList);
  return updatedList;
};

// ---------------- PASSWORD RESET (Admin & Co-Admin) ----------------
export const resetUserPassword = (contacts, userId, newPassword = '1234') => {
  const updatedList = contacts.map(c => c.id === userId ? { ...c, password: newPassword } : c);
  saveContacts(updatedList);
  return updatedList;
};

export const resetCoAdminPassword = (coAdminId, newPassword = '1234') => {
  const current = getStoredCoAdmins();
  const updated = current.map(c => c.id === coAdminId ? { ...c, password: newPassword } : c);
  saveCoAdmins(updated);
  return updated;
};

// ---------------- EXCEL BULK IMPORT (MATCHED WITH REGISTRATION PAGE) ----------------
export const importContactsFromExcel = async (file, existingContacts, districtFilter = null, onProgress = null) => {
  const xlsxLib = XLSX;

  try {
    if (onProgress) {
      onProgress({
        step: 1,
        percent: 15,
        title: 'फ़ाइल विश्लेषण',
        message: 'एक्सेल कार्यपुस्तिका (Workbook) लोड की जा रही है...'
      });
    }

    // Direct native ArrayBuffer reading (synchronous memory pipeline, never drops events or hangs)
    let arrayBuffer;
    if (file && typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else {
      arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('फ़ाइल पढ़ने में विफलता हुई।'));
        reader.readAsArrayBuffer(file);
      });
    }

    if (onProgress) {
      onProgress({
        step: 1,
        percent: 25,
        title: 'शीट पहचान',
        message: 'एक्सेल शीट्स एवं कॉलम हेडर का विश्लेषण किया जा रहा है...'
      });
    }

    const data = new Uint8Array(arrayBuffer);
    const workbook = xlsxLib.read(data, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('एक्सेल फ़ाइल में कोई वर्कशीट (Sheet) नहीं मिली।');
    }

    // Intelligently identify the sheet that contains the employee data
    let targetSheetName = workbook.SheetNames[0];
    for (const sName of workbook.SheetNames) {
      if (/पंजीकरण|template|टेम्पलेट|contacts|police|direct|data|कर्मचारी|सूची/i.test(sName)) {
        targetSheetName = sName;
        break;
      }
    }
    
    // If targetSheetName is a reference sheet, try another sheet
    if (/सन्दर्भ|reference|master|मानक/i.test(targetSheetName) && workbook.SheetNames.length > 1) {
      const alternate = workbook.SheetNames.find(s => !/सन्दर्भ|reference|master|मानक/i.test(s));
      if (alternate) targetSheetName = alternate;
    }

    const worksheet = workbook.Sheets[targetSheetName];
    let rawRows = xlsxLib.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      // Check if any other sheet has data
      for (const sName of workbook.SheetNames) {
        if (sName !== targetSheetName) {
          const testSheet = workbook.Sheets[sName];
          const testRows = xlsxLib.utils.sheet_to_json(testSheet, { defval: '' });
          if (testRows && testRows.length > 0) {
            targetSheetName = sName;
            rawRows = testRows;
            break;
          }
        }
      }
    }

    if (!rawRows || rawRows.length === 0) {
      throw new Error('चयनित Excel शीट पूर्णतः खाली है। कृपया आधिकारिक टेम्पलेट में डेटा भरकर अपलोड करें।');
    }

    if (onProgress) {
      onProgress({
        step: 2,
        percent: 32,
        title: 'डेटा निष्कर्षण प्रारंभ',
        message: `शीट "${targetSheetName}" से कुल ${rawRows.length} पंक्तियाँ मिलीं। सत्यापन व मिलान जारी...`,
        totalRows: rawRows.length,
        sheetName: targetSheetName
      });
    }

    // Flexible multi-lingual header value finder
    const getExcelValue = (row, fieldKeys) => {
      for (const k of fieldKeys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      const rowKeys = Object.keys(row);
      for (const fk of fieldKeys) {
        const cleanFk = fk.toLowerCase().replace(/[\s\-_/()\\.]/g, '');
        for (const rk of rowKeys) {
          const cleanRk = rk.toLowerCase().replace(/[\s\-_/()\\.]/g, '');
          if (cleanRk === cleanFk || cleanRk.includes(cleanFk) || cleanFk.includes(cleanRk)) {
            if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
              return String(row[rk]).trim();
            }
          }
        }
      }
      return '';
    };

    let updatedContacts = [...existingContacts];
    let addedCount = 0;
    let updatedCount = 0;
    const skippedRows = [];
    const newDistrictsSet = new Set();
    const newPostsSet = new Set();
    const newOfficesMap = new Map();

    const totalRows = rawRows.length;

    for (let idx = 0; idx < totalRows; idx++) {
      const row = rawRows[idx];
      const rowNum = idx + 2;

      const pno = getExcelValue(row, [
        'PNO', 'PNO (पीएनओ नंबर)', 'PNO Number', 'PNO No', 'पीएनओ', 'पीएनओ नंबर', 'Badge No', 'Badge Number', 'बैज नंबर', 'PNO / पीएनओ'
      ]);
      const name = getExcelValue(row, [
        'Name', 'Name (कर्मचारी का नाम)', 'Officer Name', 'Employee Name', 'नाम', 'कर्मचारी का नाम', 'अधिकारी का नाम', 'Name / नाम'
      ]);
      const post = getExcelValue(row, [
        'Post', 'Post (पदनाम)', 'Designation', 'पद', 'पदनाम', 'Rank', 'रैंक', 'Post / पद'
      ]);
      let district = getExcelValue(row, [
        'District', 'District (जनपद)', 'जनपद', 'ज़िला', 'जिला', 'City', 'District / जनपद'
      ]);
      const office = getExcelValue(row, [
        'Office', 'Office (कार्यालय/थाना)', 'Thana', 'Police Station', 'कार्यालय', 'थाना', 'इकाई', 'कार्यालय / थाना', 'थाना/कार्यालय'
      ]);
      const rawPhone = getExcelValue(row, [
        'Phone', 'Phone (मोबाइल नंबर - 10 अंक)', 'Mobile', 'Mobile Number', 'Contact', 'मोबाइल', 'मोबाइल नंबर', 'फोन', 'फोन नंबर'
      ]);
      const whatsapp = getExcelValue(row, [
        'WhatsApp', 'WhatsApp (व्हाट्सएप नंबर)', 'WhatsApp Number', 'वॉट्सऐप', 'व्हाट्सएप', 'व्हाट्सएप नंबर'
      ]);
      const email = getExcelValue(row, [
        'Email', 'Email (ईमेल आईडी)', 'Email ID', 'ईमेल', 'ईमेल आईडी'
      ]);
      const password = getExcelValue(row, [
        'Password', 'Password (पासवर्ड)', 'Password (लॉगिन पासवर्ड)', 'पासवर्ड'
      ]);
      const statusStr = getExcelValue(row, [
        'Status', 'Status (स्थिति: Approved/Pending)', 'Status (स्वीकृति स्थिति)', 'स्थिति', 'स्वीकृति स्थिति', 'स्वीकृति'
      ]);
      const hidePhoneStr = getExcelValue(row, [
        'Hide_Phone', 'Hide_Phone (मोबाइल नंबर छुपाएं: No/Yes)', 'Hide Phone', 'IsPhoneHidden', 'नंबर छुपाएं', 'गोपनीय'
      ]);
      const remarks = getExcelValue(row, [
        'Remarks', 'Remarks (टिप्पणी / रिमार्क्स)', 'Notes', 'RegistrationNotes', 'टिप्पणी', 'रिमार्क्स'
      ]);

      if (districtFilter) {
        district = districtFilter;
      }

      // Clean phone digits to 10 digits
      let cleanPhone = '';
      if (rawPhone) {
        const digits = String(rawPhone).replace(/\D/g, '');
        cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits;
      }

      // Validation
      if (!name || !cleanPhone || cleanPhone.length < 10) {
        skippedRows.push({
          rowNum,
          name: name || 'अनाम',
          phone: rawPhone || 'अनुपलब्ध',
          reason: !name ? 'नाम (Name) अनुपलब्ध' : '10-अंकों का वैध मोबाइल नंबर अनुपलब्ध'
        });
        continue;
      }

      const cleanWhatsapp = (whatsapp ? String(whatsapp).replace(/\D/g, '').slice(-10) : '') || cleanPhone;
      const isPhoneHidden = /yes|हाँ|true|1|यस|छुप|hide/i.test(hidePhoneStr);
      const status = /pending|लंबित|pratikhsa/i.test(statusStr) ? 'pending' : 'approved';

      const finalDist = district || (districtFilter || 'लखनऊ');
      const finalPost = post || 'आरक्षी (Constable)';
      const finalOffice = office || 'थाना कोतवाली';

      // Collect new distinct master items
      if (finalDist && finalDist !== 'सभी ज़िले (All Districts)' && finalDist !== 'सभी ज़िले') {
        newDistrictsSet.add(finalDist);
      }
      if (finalPost && finalPost !== 'सभी पद (All Posts)' && finalPost !== 'सभी पद') {
        newPostsSet.add(finalPost);
      }
      if (finalOffice && finalOffice !== 'सभी कार्यालय/थाने (All Offices)' && finalOffice !== 'सभी कार्यालय/थाने') {
        newOfficesMap.set(finalOffice, finalDist);
      }

      const existingIdx = updatedContacts.findIndex(c => 
        (pno && c.pno && String(c.pno).toLowerCase() === String(pno).toLowerCase()) || 
        (c.phone && c.phone === cleanPhone)
      );

      if (existingIdx !== -1) {
        if (districtFilter && updatedContacts[existingIdx].district !== districtFilter) {
          skippedRows.push({
            rowNum,
            name,
            phone: cleanPhone,
            reason: `कार्मिक अन्य जनपद (${updatedContacts[existingIdx].district}) में पंजीकृत है`
          });
          continue;
        }

        updatedContacts[existingIdx] = {
          ...updatedContacts[existingIdx],
          pno: pno || updatedContacts[existingIdx].pno,
          name: name || updatedContacts[existingIdx].name,
          post: finalPost || updatedContacts[existingIdx].post,
          district: finalDist || updatedContacts[existingIdx].district,
          office: finalOffice || updatedContacts[existingIdx].office,
          phone: cleanPhone || updatedContacts[existingIdx].phone,
          whatsapp: cleanWhatsapp || updatedContacts[existingIdx].whatsapp,
          email: email || updatedContacts[existingIdx].email,
          password: password || updatedContacts[existingIdx].password || '1234',
          status: status || updatedContacts[existingIdx].status || 'approved',
          isPhoneHidden: isPhoneHidden !== undefined ? isPhoneHidden : updatedContacts[existingIdx].isPhoneHidden,
          registrationNotes: remarks || updatedContacts[existingIdx].registrationNotes || 'एक्सेल शीट द्वारा अद्यतन',
          updatedAt: new Date().toISOString()
        };
        updatedCount++;
      } else {
        const newCard = {
          id: `pol-excel-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          pno: pno || `PNO-${Math.floor(100000000 + Math.random() * 900000000)}`,
          name,
          post: finalPost,
          district: finalDist,
          office: finalOffice,
          phone: cleanPhone,
          whatsapp: cleanWhatsapp,
          email: email || '',
          password: password || '1234',
          status,
          isPhoneHidden,
          isRegisteredUser: true,
          registrationNotes: remarks || 'एक्सेल शीट द्वारा आयातित (Excel Bulk Import)',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedContacts.unshift(newCard);
        addedCount++;
      }

      // Periodic progress update
      if (idx % 20 === 0 || idx === totalRows - 1) {
        if (onProgress) {
          const currentPercent = Math.round(32 + ((idx + 1) / totalRows) * 36);
          onProgress({
            step: 2,
            percent: currentPercent,
            title: 'सत्यापन व निष्कर्षण',
            message: `सत्यापन जारी: ${idx + 1} / ${totalRows} पंक्तियाँ (नए: ${addedCount}, अपडेट: ${updatedCount})...`,
            processedCount: idx + 1,
            totalRows,
            addedCount,
            updatedCount,
            skippedCount: skippedRows.length
          });
        }
      }
    }

    // STEP 3: MASTER DATA UPDATE (BATCHED IN ONE OPERATION)
    if (onProgress) {
      onProgress({
        step: 3,
        percent: 72,
        title: 'मास्टर डेटा एकीकरण',
        message: 'नए जनपद, पद एवं थानों को मास्टर सूची में एकीकृत किया जा रहा है...'
      });
    }

    // Batch merge districts
    const currentDistricts = getStoredDistricts();
    const mergedDistricts = [...currentDistricts];
    newDistrictsSet.forEach(d => {
      if (!mergedDistricts.includes(d)) mergedDistricts.push(d);
    });
    if (mergedDistricts.length !== currentDistricts.length) {
      try { localStorage.setItem(DISTRICTS_KEY, JSON.stringify(mergedDistricts)); } catch (e) {}
      idbSet(DISTRICTS_KEY, mergedDistricts);
    }

    // Batch merge posts
    const currentPosts = getStoredPosts();
    const mergedPosts = [...currentPosts];
    newPostsSet.forEach(p => {
      if (!mergedPosts.includes(p)) mergedPosts.push(p);
    });
    if (mergedPosts.length !== currentPosts.length) {
      try { localStorage.setItem(POSTS_KEY, JSON.stringify(mergedPosts)); } catch (e) {}
      idbSet(POSTS_KEY, mergedPosts);
    }

    // Batch merge offices
    const currentOffices = getStoredOffices();
    const mergedOffices = [...currentOffices];
    newOfficesMap.forEach((dist, off) => {
      const exists = mergedOffices.some(o => 
        typeof o === 'object' ? (o.name === off && o.district === dist) : o === off
      );
      if (!exists) {
        mergedOffices.push({
          id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: off,
          district: dist
        });
      }
    });
    if (mergedOffices.length !== currentOffices.length) {
      try { localStorage.setItem(OFFICES_KEY, JSON.stringify(mergedOffices)); } catch (e) {}
      idbSet(OFFICES_KEY, mergedOffices);
    }

    // STEP 4: SAVE CONTACTS LOCALLY & TO INDEXEDDB
    if (onProgress) {
      onProgress({
        step: 4,
        percent: 80,
        title: 'लोकल डेटाबेस सुरक्षित',
        message: 'स्थानीय मेमोरी एवं IndexedDB में सुरक्षित किया जा रहा है...'
      });
    }

    try {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(updatedContacts));
    } catch (e) {}
    await idbSaveContacts(updatedContacts);

    // STEP 5: SYNC TO FIREBASE CLOUD FIRESTORE
    let isCloudSynced = false;
    if (isFirebaseConfigured()) {
      if (onProgress) {
        onProgress({
          step: 5,
          percent: 84,
          title: 'Firebase लाइव सिंक',
          message: 'Google Firebase Firestore क्लाउड पर डेटा अपलोड हो रहा है...'
        });
      }

      // Sync master config in single call
      try {
        await saveFirestoreMasterConfig({
          districts: mergedDistricts,
          posts: mergedPosts,
          offices: mergedOffices
        });
      } catch (mErr) {
        console.warn('[Firebase] Master config sync warning:', mErr);
      }

      // Sync contacts in batches with real-time feedback
      try {
        await syncAllContactsToFirestore(updatedContacts, (chunkInfo) => {
          if (onProgress) {
            const cloudPct = Math.round(84 + (chunkInfo.percent * 0.15));
            onProgress({
              step: 5,
              percent: cloudPct,
              title: 'Firebase लाइव सिंक',
              message: `क्लाउड पर अपलोड: ${chunkInfo.syncedCount} / ${chunkInfo.totalCount} रिकॉर्ड्स (बैच ${chunkInfo.chunkIndex}/${chunkInfo.totalChunks})...`,
              syncedCount: chunkInfo.syncedCount,
              totalCount: chunkInfo.totalCount
            });
          }
        });
        isCloudSynced = true;
      } catch (cloudErr) {
        console.warn('[Firebase] Cloud sync batch warning:', cloudErr);
      }
    }

    if (onProgress) {
      onProgress({
        step: 6,
        percent: 100,
        title: 'सफलतापूर्वक पूर्ण',
        message: `✅ कुल ${rawRows.length} पंक्तियाँ प्रोसेस हुईं! नए जोड़े गए: ${addedCount}, अपडेट: ${updatedCount}।`
      });
    }

    return {
      success: true,
      updatedContacts,
      totalProcessed: rawRows.length,
      addedCount,
      updatedCount,
      skippedCount: skippedRows.length,
      skippedReasons: skippedRows,
      sheetName: targetSheetName,
      newDistrictsCount: newDistrictsSet.size,
      newPostsCount: newPostsSet.size,
      newOfficesCount: newOfficesMap.size,
      isCloudSynced
    };

  } catch (err) {
    if (onProgress) {
      onProgress({
        step: -1,
        percent: 0,
        title: 'त्रुटि',
        message: err.message || 'एक्सेल फ़ाइल लोड करने में समस्या आई।'
      });
    }
    throw err;
  }
};

export const downloadSampleExcel = async () => {
  const xlsxLib = XLSX;
  
  // Sheet 1: Registration Form Matched Template
  const templateRows = [
    {
      "PNO (पीएनओ नंबर)": "948120011",
      "Name (कर्मचारी का नाम)": "राजेश कुमार सिंह",
      "Post (पदनाम)": "प्रभारी निरीक्षक (Inspector/SHO)",
      "District (जनपद)": "लखनऊ",
      "Office (कार्यालय/थाना)": "थाना हजरतगंज",
      "Phone (मोबाइल नंबर - 10 अंक)": "9454401234",
      "WhatsApp (व्हाट्सएप नंबर)": "9454401234",
      "Email (ईमेल आईडी)": "sho.hazratganj@uppolice.gov.in",
      "Password (पासवर्ड)": "1234",
      "Status (स्थिति: Approved/Pending)": "Approved",
      "Hide_Phone (मोबाइल नंबर छुपाएं: No/Yes)": "No",
      "Remarks (टिप्पणी / रिमार्क्स)": "प्रभारी निरीक्षक हजरतगंज"
    },
    {
      "PNO (पीएनओ नंबर)": "983210452",
      "Name (कर्मचारी का नाम)": "अमित कुमार वर्मा",
      "Post (पदनाम)": "उप-निरीक्षक (Sub-Inspector)",
      "District (जनपद)": "वाराणसी",
      "Office (कार्यालय/थाना)": "थाना कैंट",
      "Phone (मोबाइल नंबर - 10 अंक)": "9454402345",
      "WhatsApp (व्हाट्सएप नंबर)": "9454402345",
      "Email (ईमेल आईडी)": "si.amit@uppolice.gov.in",
      "Password (पासवर्ड)": "1234",
      "Status (स्थिति: Approved/Pending)": "Approved",
      "Hide_Phone (मोबाइल नंबर छुपाएं: No/Yes)": "No",
      "Remarks (टिप्पणी / रिमार्क्स)": "उप-निरीक्षक कैंट"
    },
    {
      "PNO (पीएनओ नंबर)": "120938475",
      "Name (कर्मचारी का नाम)": "सुनील कुमार यादव",
      "Post (पदनाम)": "आरक्षी (Constable)",
      "District (जनपद)": "कानपुर नगर",
      "Office (कार्यालय/थाना)": "थाना कोतवाली",
      "Phone (मोबाइल नंबर - 10 अंक)": "9454403456",
      "WhatsApp (व्हाट्सएप नंबर)": "9454403456",
      "Email (ईमेल आईडी)": "const.sunil@uppolice.gov.in",
      "Password (पासवर्ड)": "1234",
      "Status (स्थिति: Approved/Pending)": "Approved",
      "Hide_Phone (मोबाइल नंबर छुपाएं: No/Yes)": "No",
      "Remarks (टिप्पणी / रिमार्क्स)": "बीट आरक्षी कोतवाली"
    },
    {
      "PNO (पीएनओ नंबर)": "145029381",
      "Name (कर्मचारी का नाम)": "प्रियंका चतुर्वेदी",
      "Post (पदनाम)": "मुख्य आरक्षी (Head Constable)",
      "District (जनपद)": "प्रयागराज",
      "Office (कार्यालय/थाना)": "महिला थाना",
      "Phone (मोबाइल नंबर - 10 अंक)": "9454404567",
      "WhatsApp (व्हाट्सएप नंबर)": "9454404567",
      "Email (ईमेल आईडी)": "hc.priyanka@uppolice.gov.in",
      "Password (पासवर्ड)": "1234",
      "Status (स्थिति: Approved/Pending)": "Approved",
      "Hide_Phone (मोबाइल नंबर छुपाएं: No/Yes)": "Yes",
      "Remarks (टिप्पणी / रिमार्क्स)": "महिला हेल्पडेस्क प्रभारी"
    }
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  
  // Set generous column widths
  worksheet['!cols'] = [
    { wch: 22 }, // PNO
    { wch: 26 }, // Name
    { wch: 34 }, // Post
    { wch: 22 }, // District
    { wch: 26 }, // Office
    { wch: 28 }, // Phone
    { wch: 26 }, // WhatsApp
    { wch: 32 }, // Email
    { wch: 18 }, // Password
    { wch: 28 }, // Status
    { wch: 32 }, // Hide_Phone
    { wch: 32 }  // Remarks
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "पंजीकरण_टेम्पलेट");

  // Sheet 2: Master Reference for easy copy-pasting
  const refHeader = ["उत्तर प्रदेश के सभी 75 जनपद", "मानक पुलिस पदनाम"];
  const maxRows = Math.max(ALL_UP_DISTRICTS.length, STANDARD_POLICE_POSTS.length);
  const refRows = [refHeader];
  for (let i = 1; i < maxRows; i++) {
    const dist = ALL_UP_DISTRICTS[i] || "";
    const post = STANDARD_POLICE_POSTS[i] || "";
    if (dist || post) {
      refRows.push([dist, post]);
    }
  }

  const refWorksheet = XLSX.utils.aoa_to_sheet(refRows);
  refWorksheet['!cols'] = [{ wch: 32 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(workbook, refWorksheet, "मानक_सूची_सन्दर्भ");

  XLSX.writeFile(workbook, "UP_Police_Registration_Template.xlsx");
};

// ---------------- CALL LOGS (In-App Voice Calling Audit Trail) ----------------
const CALL_LOGS_KEY = 'police_directory_call_logs_v1';

export const getStoredCallLogs = () => {
  try {
    const saved = localStorage.getItem(CALL_LOGS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
};

export const saveCallLog = (logEntry) => {
  try {
    const current = getStoredCallLogs();
    const newEntry = {
      id: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    // Keep up to 200 call logs in local storage
    const updated = [newEntry, ...current].slice(0, 200);
    localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving call log', err);
    return getStoredCallLogs();
  }
};

export const clearCallLogs = () => {
  try {
    localStorage.removeItem(CALL_LOGS_KEY);
    return [];
  } catch (err) {
    return [];
  }
};

// ---------------- AUTOMATED 6-HOUR ROLLING BACKUP (MAX 5 SLOTS) ----------------
const BACKUPS_KEY = 'police_directory_backups_v1';

export const getStoredBackups = () => {
  try {
    const saved = localStorage.getItem(BACKUPS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
};

export const createBackupSlot = (label = 'स्वचालित 6-घंटे का आवधिक बैकअप') => {
  try {
    const currentBackups = getStoredBackups();
    
    // Create snapshot of all major keys
    const snapshot = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      label,
      data: {
        contacts: getStoredContacts(),
        coAdmins: getStoredCoAdmins(),
        chats: getStoredChats(),
        callLogs: getStoredCallLogs(),
        notifications: getStoredNotifications(),
        feedbacks: getStoredFeedbacks(),
        terms: getStoredTerms(),
        posts: getStoredPosts(),
        offices: getStoredOffices(),
        districts: getStoredDistricts()
      },
      counts: {
        contacts: getStoredContacts().length,
        chats: getStoredChats().length,
        callLogs: getStoredCallLogs().length
      }
    };

    // Keep MAX 5 slots; overwrite oldest when exceeding 5
    const updated = [snapshot, ...currentBackups].slice(0, 5);
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error creating backup slot', err);
    return getStoredBackups();
  }
};

export const checkAndTrigger6HourBackup = () => {
  try {
    const backups = getStoredBackups();
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    
    if (backups.length === 0) {
      return createBackupSlot('प्रारंभिक आधारभूत बैकअप (Baseline Backup)');
    }

    const latest = backups[0];
    const latestTime = new Date(latest.timestamp).getTime();
    const now = Date.now();

    if (now - latestTime >= SIX_HOURS_MS) {
      return createBackupSlot('स्वचालित 6-घंटे का आवधिक बैकअप (Rolling Backup)');
    }

    return backups;
  } catch (err) {
    return getStoredBackups();
  }
};

export const restoreBackupSlot = (backupId) => {
  try {
    const backups = getStoredBackups();
    const target = backups.find(b => b.id === backupId);
    if (!target || !target.data) {
      throw new Error('बैकअप स्लॉट उपलब्ध नहीं है या डेटा रिक्त है।');
    }

    const { contacts, coAdmins, chats, callLogs, notifications, feedbacks, terms, posts, offices, districts } = target.data;
    if (contacts) saveContacts(contacts);
    if (coAdmins) saveCoAdmins(coAdmins);
    if (chats) saveChats(chats);
    if (callLogs) localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(callLogs));
    if (notifications) saveNotifications(notifications);
    if (feedbacks) saveFeedbacks(feedbacks);
    if (terms) saveTerms(terms);
    if (posts) savePosts(posts);
    if (offices) saveOffices(offices);
    if (districts) saveDistricts(districts);

    return true;
  } catch (err) {
    console.error('Error restoring backup slot', err);
    throw err;
  }
};

// ---------------- PHONE NUMBER PRIVACY & PERMISSION SYSTEM ----------------
const PHONE_PERMISSIONS_KEY = 'police_directory_phone_permissions_v1';

export const getStoredPhonePermissions = () => {
  try {
    const saved = localStorage.getItem(PHONE_PERMISSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
};

export const savePhonePermissions = (perms) => {
  try {
    localStorage.setItem(PHONE_PERMISSIONS_KEY, JSON.stringify(perms));
  } catch (err) {}
};

export const requestPhonePermission = (requester, targetOfficer) => {
  const current = getStoredPhonePermissions();
  // Check if an existing request is already there
  const existing = current.find(p => p.requesterId === requester.id && p.targetId === targetOfficer.id);
  if (existing) {
    const statusText = existing.status === 'approved' ? 'स्वीकृत' : existing.status === 'rejected' ? 'अस्वीकृत' : 'लंबित';
    return { success: false, status: existing.status, message: `अनुरोध पहले से भेजा जा चुका है (${statusText})` };
  }

  const newReq = {
    id: `perm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    requesterId: requester.id,
    requesterName: requester.name,
    requesterPost: requester.post,
    requesterDistrict: requester.district,
    requesterPhone: requester.phone,
    targetId: targetOfficer.id,
    targetName: targetOfficer.name,
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    requestedAt: new Date().toISOString()
  };

  const updated = [newReq, ...current];
  savePhonePermissions(updated);

  // Notify target officer about the incoming phone access request
  try {
    const notifId = `notif-perm-${newReq.id}`;
    addNotification({
      id: notifId,
      title: '📲 संपर्क नंबर देखने हेतु अनुमति अनुरोध',
      content: `अधिकारी ${requester.name} (${requester.post}, जनपद: ${requester.district}) ने आपका गोपनीय मोबाइल नंबर देखने हेतु अनुमति मांगी है।`,
      district: targetOfficer.district,
      type: 'phone_permission',
      targetUserId: targetOfficer.id,
      senderId: requester.id,
      permissionId: newReq.id
    });
  } catch (e) {}

  return { success: true, request: newReq };
};

export const respondPhonePermission = (requestId, newStatus) => {
  const current = getStoredPhonePermissions();
  const updated = current.map(p => p.id === requestId ? { ...p, status: newStatus, respondedAt: new Date().toISOString() } : p);
  savePhonePermissions(updated);
  return updated;
};

export const canViewPhoneNumber = (viewer, targetOfficer, permissions = []) => {
  if (!viewer || !targetOfficer) return false;

  // Super Admin can always view all numbers
  if (viewer.role === 'admin') return true;

  // Viewing self
  if (viewer.id === targetOfficer.id) return true;

  // Co-Admin can always view all numbers in their assigned district
  if (viewer.role === 'co_admin' && viewer.district === targetOfficer.district) return true;

  // STRICT CROSS-DISTRICT RULE:
  // If the viewer is from a DIFFERENT district, the number is STRICTLY HIDDEN
  // It is ONLY visible if the target officer has approved their permission request
  if (viewer.district && targetOfficer.district && viewer.district !== targetOfficer.district) {
    const hasApprovedPerm = (permissions || []).some(p => 
      p.requesterId === viewer.id && 
      p.targetId === targetOfficer.id && 
      p.status === 'approved'
    );
    return hasApprovedPerm;
  }

  // SAME DISTRICT RULE:
  // If user has explicitly hidden their phone, check if approved permission exists
  if (targetOfficer.isPhoneHidden) {
    const hasApprovedPerm = (permissions || []).some(p => 
      p.requesterId === viewer.id && 
      p.targetId === targetOfficer.id && 
      p.status === 'approved'
    );
    return hasApprovedPerm;
  }

  // Same district peer viewing allowed by default
  return true;
};

// ---------------- 2FA FOR ADMIN PANEL ----------------
const TWO_FACTOR_KEY = 'police_directory_2fa_config_v1';

export const getStored2FAConfig = () => {
  try {
    const saved = localStorage.getItem(TWO_FACTOR_KEY);
    return saved ? JSON.parse(saved) : { enabled: true, secretPin: '998877' };
  } catch (err) {
    return { enabled: true, secretPin: '998877' };
  }
};

export const save2FAConfig = (config) => {
  try {
    localStorage.setItem(TWO_FACTOR_KEY, JSON.stringify(config));
  } catch (err) {}
};

// ---------------- SUPER ADMIN MASTER LOGIN PIN ----------------
const SUPER_ADMIN_PIN_KEY = 'police_directory_super_admin_pin_v1';

export const getStoredAdminMasterPin = () => {
  try {
    const saved = localStorage.getItem(SUPER_ADMIN_PIN_KEY);
    return saved ? saved.trim() : '1234';
  } catch (err) {
    return '1234';
  }
};

export const saveAdminMasterPin = (newPin) => {
  try {
    localStorage.setItem(SUPER_ADMIN_PIN_KEY, String(newPin).trim());
  } catch (err) {}
};
