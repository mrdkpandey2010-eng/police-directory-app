export const DEFAULT_UNIFORM_PHOTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="70" r="38" fill="%23f1c27d"/><path d="M70 56 Q100 28 130 56 Q120 40 100 40 Q80 40 70 56 Z" fill="%231e293b"/><path d="M50 170 C50 125 75 110 100 110 C125 110 150 125 150 170 Z" fill="%23c29b38"/><polygon points="90,110 100,140 110,110 100,105" fill="%231e293b"/><polygon points="76,112 88,140 100,110" fill="%23a88228"/><polygon points="124,112 112,140 100,110" fill="%23a88228"/><rect x="62" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="70,123 72,128 77,128 73,131 75,136 70,133 65,136 67,131 63,128 68,128" fill="%23fbbf24"/><rect x="122" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="130,123 132,128 137,128 133,131 135,136 130,133 125,136 127,131 123,128 128,128" fill="%23fbbf24"/><rect x="115" y="152" width="22" height="7" rx="2" fill="%231e293b"/><circle cx="126" cy="155.5" r="2" fill="%23fbbf24"/><path d="M50 170 Q100 160 150 170 L150 200 L50 200 Z" fill="%23b0892f"/></svg>`;

export const DEFAULT_UNIFORM_PHOTO_FEMALE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="72" r="36" fill="%23fcd5b5"/><path d="M66 65 Q100 25 134 65 Q138 95 132 105 Q120 75 100 70 Q80 75 68 105 Z" fill="%231e293b"/><path d="M52 170 C52 128 76 112 100 112 C124 112 148 128 148 170 Z" fill="%23c29b38"/><polygon points="90,112 100,140 110,112 100,107" fill="%231e293b"/><polygon points="76,114 88,140 100,112" fill="%23a88228"/><polygon points="124,114 112,140 100,112" fill="%23a88228"/><rect x="64" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="71.5,125 73,129 77,129 74,132 75.5,136 71.5,133.5 67.5,136 69,132 66,129 70,129" fill="%23fbbf24"/><rect x="121" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="128.5,125 130,129 134,129 131,132 132.5,136 128.5,133.5 124.5,136 126,132 123,129 127,129" fill="%23fbbf24"/><path d="M52 170 Q100 162 148 170 L148 200 L52 200 Z" fill="%23b0892f"/></svg>`;

// Fresh Clean Database Rule: Zero mock data - completely clean production app
export const initialContacts = [];
export const initialCoAdmins = [];
export const initialNotifications = [];
export const initialFeedbacks = [];

// Fresh initial districts - start clean (admin can add custom or load all 75)
export const DISTRICTS = [
  "सभी ज़िले (All Districts)"
];

// Fresh initial posts - start clean (admin can add custom or load standard ranks)
export const POSTS = [
  "सभी पद (All Posts)"
];

export const DEFAULT_OFFICE_ITEMS = [];

export const OFFICES = [
  "सभी कार्यालय/थाने (All Offices)"
];

// Master Reference: All 75 Official Uttar Pradesh Districts (Available on demand in Admin Panel)
export const ALL_UP_DISTRICTS = [
  "सभी ज़िले (All Districts)",
  "अयोध्या", "अंबेडकर नगर", "अमेठी", "अमरोहा", "आगरा", "आजमगढ़", "अलीगढ़", 
  "इटावा", "उन्नाव", "एटा", "औरैया", "कन्नौज", "कानपुर देहात", "कानपुर नगर", 
  "कासगंज", "कुशीनगर", "कौशाम्बी", "गाजीपुर", "गाजियाबाद", "गोरखपुर", "गोंडा", 
  "गौतम बुद्ध नगर", "चंदौली", "चित्रकूट", "जालौन", "जौनपुर", "झांसी", "देवरिया", 
  "पीलीभीत", "प्रतापगढ़", "प्रयागराज", "फतेहपुर", "फर्रुखाबाद", "फिरोजाबाद", 
  "बलरामपुर", "बलिया", "बस्ती", "बहराइच", "बांदा", "बागपत", "बाराबंकी", "बरेली", 
  "बिजनौर", "बुलंदशहर", "बदायूं", "महोबा", "मथुरा", "महाराजगंज", "मीरजापुर", 
  "मुजफ्फरनगर", "मुरादाबाद", "मेरठ", "मैनपुरी", "रामपुर", "रायबरेली", "लखनऊ", 
  "लखीमपुर खीरी", "ललितपुर", "वाराणसी", "शामली", "शाहजहांपुर", "श्रावस्ती", "संभल", 
  "संत कबीर नगर", "भदोही (संत रविदास नगर)", "सहारनपुर", "सिद्धार्थनगर", "सीतापुर", 
  "सोनभद्र", "सुल्तानपुर", "हाथरस", "हापुड़", "हमीरपुर"
];

// Master Reference: Official Uttar Pradesh Police Designations
export const STANDARD_POLICE_POSTS = [
  "सभी पद (All Posts)",
  "पुलिस महानिदेशक (DGP)",
  "अपर पुलिस महानिदेशक (ADG)",
  "पुलिस महानिरीक्षक (IG)",
  "पुलिस उप-महानिरीक्षक (DIG)",
  "वरिष्ठ पुलिस अधीक्षक (SSP)",
  "पुलिस अधीक्षक (SP)",
  "अपर पुलिस अधीक्षक (ASP)",
  "क्षेत्राधिकारी (DSP/CO)",
  "प्रभारी निरीक्षक (Inspector/SHO)",
  "उप-निरीक्षक (Sub-Inspector)",
  "मुख्य आरक्षी (Head Constable)",
  "आरक्षी (Constable)"
];
