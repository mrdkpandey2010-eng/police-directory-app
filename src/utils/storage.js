import { 
  initialContacts, 
  initialCoAdmins, 
  initialNotifications, 
  initialFeedbacks,
  DEFAULT_UNIFORM_PHOTO,
  DEFAULT_UNIFORM_PHOTO_FEMALE,
  POSTS as DEFAULT_POSTS,
  OFFICES as DEFAULT_OFFICES,
  DISTRICTS as DEFAULT_DISTRICTS
} from '../data/mockContacts';
import * as XLSX from 'xlsx';

const CONTACTS_KEY = 'police_directory_contacts_v2';
const COADMINS_KEY = 'police_directory_coadmins_v2';
const NOTIFS_KEY = 'police_directory_notifs_v2';
const FEEDBACKS_KEY = 'police_directory_feedbacks_v2';
const SESSION_KEY = 'police_directory_session_v2';
const CHATS_KEY = 'police_directory_chats_v2';

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
    localStorage.setItem(TERMS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving terms', err);
    return termsData;
  }
};

// ---------------- MASTER CONFIGURATION (POSTS, OFFICES, DISTRICTS) ----------------
export const getStoredPosts = () => {
  try {
    const saved = localStorage.getItem(POSTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_POSTS;
  } catch (err) {
    return DEFAULT_POSTS;
  }
};

export const savePosts = (posts) => {
  try {
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
  } catch (err) {}
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

export const deletePost = (postName) => {
  const current = getStoredPosts();
  const updated = current.filter((p, i) => i === 0 || p !== postName);
  savePosts(updated);
  return updated;
};

export const getStoredOffices = () => {
  try {
    const saved = localStorage.getItem(OFFICES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_OFFICES;
  } catch (err) {
    return DEFAULT_OFFICES;
  }
};

export const saveOffices = (offices) => {
  try {
    localStorage.setItem(OFFICES_KEY, JSON.stringify(offices));
  } catch (err) {}
};

export const addOffice = (officeName) => {
  const current = getStoredOffices();
  const trimmed = officeName.trim();
  if (trimmed && !current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveOffices(updated);
    return updated;
  }
  return current;
};

export const deleteOffice = (officeName) => {
  const current = getStoredOffices();
  const updated = current.filter((o, i) => i === 0 || o !== officeName);
  saveOffices(updated);
  return updated;
};

export const getStoredDistricts = () => {
  try {
    const saved = localStorage.getItem(DISTRICTS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_DISTRICTS;
  } catch (err) {
    return DEFAULT_DISTRICTS;
  }
};

export const saveDistricts = (districts) => {
  try {
    localStorage.setItem(DISTRICTS_KEY, JSON.stringify(districts));
  } catch (err) {}
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

export const deleteDistrict = (distName) => {
  const current = getStoredDistricts();
  const updated = current.filter((d, i) => i === 0 || d !== distName);
  saveDistricts(updated);
  return updated;
};

// ---------------- CONTACTS ----------------
export const getStoredContacts = () => {
  try {
    const saved = localStorage.getItem(CONTACTS_KEY);
    if (!saved) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(initialContacts));
      return initialContacts;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(initialContacts));
      return initialContacts;
    }
    let patched = false;
    const result = parsed.map(c => {
      const initMatch = initialContacts.find(ic => ic.id === c.id);
      if (initMatch && initMatch.uniformPhoto && !c.uniformPhoto && c.id !== 'pol-115') {
        patched = true;
        return { ...c, uniformPhoto: initMatch.uniformPhoto, uniformPhotoUploaded: true };
      }
      return c;
    });
    if (!result.some(c => c.id === 'pol-115')) {
      const pol115 = initialContacts.find(ic => ic.id === 'pol-115');
      if (pol115) {
        result.push(pol115);
        patched = true;
      }
    }
    if (patched) {
      localStorage.setItem(CONTACTS_KEY, JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.error('Error reading contacts', err);
    return initialContacts;
  }
};

export const saveContacts = (contacts) => {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error('Error saving contacts', err);
  }
};

// ---------------- CO-ADMINS ----------------
export const getStoredCoAdmins = () => {
  try {
    const saved = localStorage.getItem(COADMINS_KEY);
    if (!saved) {
      localStorage.setItem(COADMINS_KEY, JSON.stringify(initialCoAdmins));
      return initialCoAdmins;
    }
    return JSON.parse(saved);
  } catch (err) {
    console.error('Error reading coadmins', err);
    return initialCoAdmins;
  }
};

export const saveCoAdmins = (coadmins) => {
  try {
    localStorage.setItem(COADMINS_KEY, JSON.stringify(coadmins));
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

export const revokeCoAdmin = (contacts, coAdmins, coAdminId) => {
  const targetCoAdmin = coAdmins.find(ca => ca.id === coAdminId);
  const updatedCoAdmins = coAdmins.filter(ca => ca.id !== coAdminId);
  saveCoAdmins(updatedCoAdmins);

  let updatedContacts = contacts;
  if (targetCoAdmin) {
    updatedContacts = contacts.map(c => {
      if (c.id === targetCoAdmin.userId || c.phone === targetCoAdmin.phone) {
        return { ...c, isCoAdmin: false };
      }
      return c;
    });
    saveContacts(updatedContacts);
  }

  return { updatedContacts, updatedCoAdmins };
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
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
  } catch (err) {
    console.error('Error saving notifications', err);
  }
};

export const addNotification = (notifData) => {
  const current = getStoredNotifications();
  const newNotif = {
    id: `notif-${Date.now()}`,
    title: notifData.title.trim(),
    content: notifData.content.trim(),
    district: notifData.district || 'सभी ज़िले (All Districts)',
    postedBy: notifData.postedBy || 'Admin',
    postedAt: new Date().toISOString(),
    type: notifData.type || 'official',
    targetUserId: notifData.targetUserId || null,
    senderId: notifData.senderId || null,
    chatId: notifData.chatId || null
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
    localStorage.setItem(FEEDBACKS_KEY, JSON.stringify(feedbacks));
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
    district: feedbackData.district || 'लखनऊ',
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
export const initialChats = [
  {
    id: "chat-dir-pol103-pol106",
    type: "direct",
    title: "अंतर-जनपद संवाद: प्रिया वर्मा ➔ राकेश कुमार",
    participants: ["pol-103", "pol-106"],
    district: "कानपुर नगर",
    supervisoryChain: {
      recipientDistrict: "कानपुर नगर",
      recipientOffice: "थाना कोतवाली",
      roles: ["थाना प्रभारी (Inspector)", "क्षेत्राधिकारी (DSP)", "वरिष्ठ पुलिस अधीक्षक (SSP)"]
    },
    lastMessage: "अवगत कराया जाता है कि वांछित अभियुक्त के कानपुर में होने की सूचना है, कृपया सत्यापन करें।",
    lastUpdated: "2026-09-30T16:30:00.000Z",
    messages: [
      {
        id: "msg-1",
        senderId: "pol-103",
        senderName: "प्रिया वर्मा",
        senderPost: "क्षेत्राधिकारी (DSP)",
        senderDistrict: "लखनऊ",
        senderPno: "PNO-012849103",
        text: "जय हिंद मुख्य आरक्षी राकेश जी। लखनऊ थाना हजरतगंज के मु.अ.सं. 112/26 में एक वांछित अभियुक्त के कानपुर कोतवाली क्षेत्र में देखे जाने की सूचना प्राप्त हुई है।",
        file: null,
        timestamp: "2026-09-30T16:20:00.000Z",
        supervisoryAlert: true
      },
      {
        id: "msg-2",
        senderId: "pol-103",
        senderName: "प्रिया वर्मा",
        senderPost: "क्षेत्राधिकारी (DSP)",
        senderDistrict: "लखनऊ",
        senderPno: "PNO-012849103",
        text: "अभियुक्त का विवरण संलग्न फ़ोटो एवं वारंट प्रतिलिपि में देखें। कृपया तत्काल तस्दीक कर आख्या दें। (पर्यवेक्षी प्रतिलिपि: SHO कोतवाली, CO, SSP कानपुर)",
        file: {
          name: "Accused_Suspect_Photo.jpg",
          type: "image",
          size: "142 KB",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200' viewBox='0 0 320 200'><rect width='100%' height='100%' fill='%230f172a'/><circle cx='160' cy='85' r='45' fill='%23334155'/><path d='M90,175 C90,135 130,135 160,135 C190,135 230,135 230,175 Z' fill='%231e3a8a'/><text x='50%' y='30' fill='%23e5b842' font-size='14' font-family='sans-serif' text-anchor='middle' font-weight='bold'>UP POLICE CRIME EVIDENCE</text><text x='50%' y='190' fill='%2394a3b8' font-size='12' font-family='sans-serif' text-anchor='middle'>अभियुक्त पहचान फोटोग्राफ (JPG)</text></svg>"
        },
        timestamp: "2026-09-30T16:25:00.000Z",
        supervisoryAlert: true
      },
      {
        id: "msg-3",
        senderId: "pol-106",
        senderName: "राकेश कुमार",
        senderPost: "मुख्य आरक्षी (Head Constable)",
        senderDistrict: "कानपुर नगर",
        senderPno: "PNO-182940196",
        text: "महोदया, जय हिंद। प्राप्त विवरणानुसार थाना कोतवाली क्षेत्र में मुखबिर तंत्र सक्रिय कर दिया गया है। SHO महोदय एवं CO महोदय को भी अवगत करा दिया गया है।",
        file: null,
        timestamp: "2026-09-30T16:30:00.000Z",
        supervisoryAlert: true
      }
    ]
  },
  {
    id: "group-special-task-up",
    type: "group",
    title: "🚨 आगामी त्योहार सुरक्षा टास्क ग्रुप (UP Police Inter-District)",
    description: "समस्त संवेदनशील जनपदों (लखनऊ, कानपुर, वाराणसी, आगरा) के लिए संयुक्त सुरक्षा व समन्वय ग्रुप",
    createdBy: "pol-101",
    participants: ["pol-101", "pol-102", "pol-103", "pol-104", "pol-106", "pol-107", "pol-108", "pol-110"],
    district: "सभी ज़िले (All Districts)",
    lastMessage: "त्योहार ड्युटी चार्ट एवं सुरक्षा एसओपी (PDF) संलग्न की गई है।",
    lastUpdated: "2026-09-30T18:00:00.000Z",
    messages: [
      {
        id: "grp-msg-1",
        senderId: "pol-101",
        senderName: "विक्रम सिंह (IPS)",
        senderPost: "पुलिस अधीक्षक (SP)",
        senderDistrict: "लखनऊ",
        senderPno: "PNO-948120011",
        text: "जय हिंद सभी अधिकारियों एवं कार्मिकों को। आगामी त्योहारों के दृष्टिगत अंतर-जनपद समन्वय एवं त्वरित आसूचना साझा करने हेतु यह ग्रुप गठित किया गया है।",
        file: null,
        timestamp: "2026-09-30T17:45:00.000Z",
        supervisoryAlert: false
      },
      {
        id: "grp-msg-2",
        senderId: "pol-101",
        senderName: "विक्रम सिंह (IPS)",
        senderPost: "पुलिस अधीक्षक (SP)",
        senderDistrict: "लखनऊ",
        senderPno: "PNO-948120011",
        text: "मुख्यालय द्वारा जारी सुरक्षा दिशानिर्देश एवं एसओपी की प्रतिलिपि नीचे संलग्न है। सभी थाना प्रभारी व क्षेत्राधिकारी इसका कड़ाई से अनुपालन सुनिश्चित करें।",
        file: {
          name: "Festival_Security_SOP_2026.pdf",
          type: "pdf",
          size: "348 KB",
          url: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA0OSAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeJwrVAh2DQ3yVfB0dAn29Vdw93RXcPd09/X3BwA5mgeRCmVuZHN0cmVhbQplbmRvYmoK"
        },
        timestamp: "2026-09-30T18:00:00.000Z",
        supervisoryAlert: false
      }
    ]
  }
];

export const getStoredChats = () => {
  try {
    const saved = localStorage.getItem(CHATS_KEY);
    if (!saved) {
      localStorage.setItem(CHATS_KEY, JSON.stringify(initialChats));
      return initialChats;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CHATS_KEY, JSON.stringify(initialChats));
      return initialChats;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading chats', err);
    return initialChats;
  }
};

export const saveChats = (chats) => {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
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
    id: `pol-reg-${Date.now()}`,
    pno: officerData.pno ? officerData.pno.trim() : `PNO-${Math.floor(100000000 + Math.random() * 900000000)}`,
    name: officerData.name.trim(),
    post: officerData.post,
    district: officerData.district,
    office: officerData.office.trim(),
    phone: officerData.phone.trim(),
    whatsapp: officerData.whatsapp ? officerData.whatsapp.trim() : officerData.phone.trim(),
    email: officerData.email ? officerData.email.trim() : '',
    password: officerData.password ? officerData.password.trim() : '1234',
    status: 'pending',
    isRegisteredUser: true,
    uniformPhoto: officerData.uniformPhoto || null,
    uniformPhotoUploaded: Boolean(officerData.uniformPhoto),
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
  const updatedList = contacts.map(c => {
    if (c.id === id) {
      const isCurrentlyActive = c.status === 'approved' || c.status === 'active';
      return { ...c, status: isCurrentlyActive ? 'inactive' : 'approved' };
    }
    return c;
  });
  saveContacts(updatedList);
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
  const updatedList = contacts.map(c => {
    if (c.id === id) {
      const newStatus = c.status === 'blocked' ? 'approved' : 'blocked';
      return { ...c, status: newStatus };
    }
    return c;
  });
  saveContacts(updatedList);
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

// ---------------- EXCEL BULK IMPORT ----------------
export const importContactsFromExcel = (file, existingContacts, districtFilter = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows || rawRows.length === 0) {
          reject(new Error('Excel फ़ाइल खाली है या उसमें कोई डेटा नहीं है।'));
          return;
        }

        let updatedContacts = [...existingContacts];
        let addedCount = 0;
        let updatedCount = 0;

        rawRows.forEach((row, idx) => {
          const pno = String(row['PNO'] || row['PNO Number'] || row['पीएनओ'] || row['Badge No'] || '').trim();
          const name = String(row['Name'] || row['नाम'] || row['Officer Name'] || '').trim();
          const post = String(row['Post'] || row['Designation'] || row['पद'] || '').trim();
          let district = String(row['District'] || row['ज़िला'] || row['जिला'] || '').trim();
          const office = String(row['Office'] || row['Thana'] || row['कार्यालय'] || row['थाना'] || '').trim();
          const phone = String(row['Phone'] || row['Mobile'] || row['मोबाइल'] || row['नंबर'] || '').trim();
          const whatsapp = String(row['WhatsApp'] || row['वॉट्सऐप'] || phone).trim();
          const email = String(row['Email'] || row['ईमेल'] || '').trim();
          const password = String(row['Password'] || row['पासवर्ड'] || '1234').trim();

          if (districtFilter) {
            district = districtFilter;
          }

          if (!name || !phone) {
            return;
          }

          const existingIdx = updatedContacts.findIndex(c => 
            (pno && c.pno.toLowerCase() === pno.toLowerCase()) || 
            (c.phone === phone)
          );

          if (existingIdx !== -1) {
            if (districtFilter && updatedContacts[existingIdx].district !== districtFilter) {
              return;
            }

            updatedContacts[existingIdx] = {
              ...updatedContacts[existingIdx],
              pno: pno || updatedContacts[existingIdx].pno,
              name: name || updatedContacts[existingIdx].name,
              post: post || updatedContacts[existingIdx].post,
              district: district || updatedContacts[existingIdx].district,
              office: office || updatedContacts[existingIdx].office,
              phone: phone || updatedContacts[existingIdx].phone,
              whatsapp: whatsapp || updatedContacts[existingIdx].whatsapp,
              email: email || updatedContacts[existingIdx].email,
              status: 'approved'
            };
            updatedCount++;
          } else {
            const newCard = {
              id: `pol-excel-${Date.now()}-${idx}`,
              pno: pno || `PNO-${Math.floor(100000000 + Math.random() * 900000000)}`,
              name,
              post: post || 'कर्मचारी (Staff)',
              district: district || (districtFilter || 'लखनऊ'),
              office: office || 'कार्यालय',
              phone,
              whatsapp: whatsapp || phone,
              email: email || '',
              password: password || '1234',
              status: 'approved',
              isRegisteredUser: false,
              createdAt: new Date().toISOString()
            };
            updatedContacts.unshift(newCard);
            addedCount++;
          }
        });

        saveContacts(updatedContacts);
        resolve({ updatedContacts, addedCount, updatedCount, totalProcessed: rawRows.length });
      } catch (err) {
        reject(new Error('Excel फ़ाइल प्रोसेस करने में त्रुटि: ' + err.message));
      }
    };

    reader.onerror = () => reject(new Error('फ़ाइल पढ़ने में विफलता हुई।'));
    reader.readAsArrayBuffer(file);
  });
};

export const downloadSampleExcel = () => {
  const sampleData = [
    {
      "PNO": "PNO-948120099",
      "Name": "राकेश शर्मा",
      "Post": "प्रभारी निरीक्षक (Inspector)",
      "District": "लखनऊ",
      "Office": "थाना गोमती नगर",
      "Phone": "9454401999",
      "WhatsApp": "9454401999",
      "Email": "sho.gomtinagar@up.gov.in",
      "Password": "1234"
    },
    {
      "PNO": "PNO-948120088",
      "Name": "सुमन देव",
      "Post": "उप-निरीक्षक (Sub-Inspector)",
      "District": "वाराणसी",
      "Office": "थाना कैंट",
      "Phone": "9454401888",
      "WhatsApp": "9454401888",
      "Email": "si.suman@up.gov.in",
      "Password": "1234"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Police_Directory");
  XLSX.writeFile(workbook, "Police_Directory_Template.xlsx");
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
    return { success: false, status: existing.status, message: `अनुरोध पहले से भेजा जा चुका है (${existing.status})` };
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

  // Co-Admin can always view all numbers in their district
  if (viewer.role === 'co_admin' && viewer.district === targetOfficer.district) return true;

  // Viewing self
  if (viewer.id === targetOfficer.id) return true;

  // If user has not hidden their phone and no privacy gate is enabled
  if (!targetOfficer.isPhoneHidden) {
    // If user marked as not hidden, visible to police peers
    return true;
  }

  // If user has hidden their phone, check if approved permission exists
  const hasApprovedPerm = permissions.some(p => 
    p.requesterId === viewer.id && 
    p.targetId === targetOfficer.id && 
    p.status === 'approved'
  );

  return hasApprovedPerm;
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
