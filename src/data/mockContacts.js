export const DEFAULT_UNIFORM_PHOTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="70" r="38" fill="%23f1c27d"/><path d="M70 56 Q100 28 130 56 Q120 40 100 40 Q80 40 70 56 Z" fill="%231e293b"/><path d="M50 170 C50 125 75 110 100 110 C125 110 150 125 150 170 Z" fill="%23c29b38"/><polygon points="90,110 100,140 110,110 100,105" fill="%231e293b"/><polygon points="76,112 88,140 100,110" fill="%23a88228"/><polygon points="124,112 112,140 100,110" fill="%23a88228"/><rect x="62" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="70,123 72,128 77,128 73,131 75,136 70,133 65,136 67,131 63,128 68,128" fill="%23fbbf24"/><rect x="122" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="130,123 132,128 137,128 133,131 135,136 130,133 125,136 127,131 123,128 128,128" fill="%23fbbf24"/><rect x="115" y="152" width="22" height="7" rx="2" fill="%231e293b"/><circle cx="126" cy="155.5" r="2" fill="%23fbbf24"/><path d="M50 170 Q100 160 150 170 L150 200 L50 200 Z" fill="%23b0892f"/></svg>`;

export const DEFAULT_UNIFORM_PHOTO_FEMALE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="72" r="36" fill="%23fcd5b5"/><path d="M66 65 Q100 25 134 65 Q138 95 132 105 Q120 75 100 70 Q80 75 68 105 Z" fill="%231e293b"/><path d="M52 170 C52 128 76 112 100 112 C124 112 148 128 148 170 Z" fill="%23c29b38"/><polygon points="90,112 100,140 110,112 100,107" fill="%231e293b"/><polygon points="76,114 88,140 100,112" fill="%23a88228"/><polygon points="124,114 112,140 100,112" fill="%23a88228"/><rect x="64" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="71.5,125 73,129 77,129 74,132 75.5,136 71.5,133.5 67.5,136 69,132 66,129 70,129" fill="%23fbbf24"/><rect x="121" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="128.5,125 130,129 134,129 131,132 132.5,136 128.5,133.5 124.5,136 126,132 123,129 127,129" fill="%23fbbf24"/><path d="M52 170 Q100 162 148 170 L148 200 L52 200 Z" fill="%23b0892f"/></svg>`;

// Fresh Clean Database Rule: Zero mock contacts - all contacts must be authentic registrations or manual entries
export const initialContacts = [];

export const initialCoAdmins = [
  {
    id: "coadmin-lk",
    username: "coadmin_lucknow",
    name: "सुधीर कुमार (DSP/नोडल अधिकारी)",
    district: "लखनऊ",
    phone: "9454401991",
    password: "1234",
    role: "co_admin",
    status: "active"
  },
  {
    id: "coadmin-kn",
    username: "coadmin_kanpur",
    name: "आलोक श्रीवास्तव (DSP/नोडल अधिकारी)",
    district: "कानपुर नगर",
    phone: "9454401992",
    password: "1234",
    role: "co_admin",
    status: "active"
  },
  {
    id: "coadmin-vn",
    username: "coadmin_varanasi",
    name: "राजेंद्र त्रिपाठी (ASP/नोडल अधिकारी)",
    district: "वाराणसी",
    phone: "9454401993",
    password: "1234",
    role: "co_admin",
    status: "active"
  },
  {
    id: "coadmin-ag",
    username: "coadmin_agra",
    name: "रवि शंकर (DSP/नोडल अधिकारी)",
    district: "आगरा",
    phone: "9454401994",
    password: "1234",
    role: "co_admin",
    status: "active"
  }
];

export const initialNotifications = [];

export const initialFeedbacks = [];

export const DISTRICTS = [
  "सभी ज़िले (All Districts)",
  "लखनऊ",
  "कानपुर नगर",
  "वाराणसी",
  "आगरा",
  "प्रयागराज",
  "गोरखपुर",
  "मेरठ",
  "बरेली"
];

export const POSTS = [
  "सभी पद (All Posts)",
  "पुलिस वरिष्ठ अधीक्षक (SSP)",
  "पुलिस अधीक्षक (SP)",
  "अपर पुलिस अधीक्षक (ASP)",
  "क्षेत्राधिकारी (DSP)",
  "प्रभारी निरीक्षक (Inspector)",
  "उप-निरीक्षक (Sub-Inspector)",
  "मुख्य आरक्षी (Head Constable)",
  "आरक्षी (Constable)"
];

export const DEFAULT_OFFICE_ITEMS = [
  // लखनऊ
  { id: "off-1", name: "एसपी कार्यालय (मुख्यालय)", district: "लखनऊ" },
  { id: "off-2", name: "एसएसपी कार्यालय", district: "लखनऊ" },
  { id: "off-3", name: "अपराध शाखा / क्राइम ब्रांच", district: "लखनऊ" },
  { id: "off-4", name: "साइबर क्राइम सेल", district: "लखनऊ" },
  { id: "off-5", name: "थाना हजरतगंज", district: "लखनऊ" },
  { id: "off-6", name: "थाना हजरतगंज सर्द", district: "लखनऊ" },
  { id: "off-7", name: "थाना विभूति खंड", district: "लखनऊ" },
  { id: "off-8", name: "कंट्रोल रूम (112)", district: "लखनऊ" },
  { id: "off-9", name: "ट्रैफिक पुलिस लाइन", district: "लखनऊ" },
  { id: "off-10", name: "महिला थाना", district: "लखनऊ" },
  { id: "off-11", name: "थाना गोमती नगर", district: "लखनऊ" },
  { id: "off-12", name: "थाना आलमबाग", district: "लखनऊ" },
  { id: "off-13", name: "थाना चौक", district: "लखनऊ" },

  // कानपुर नगर
  { id: "off-14", name: "थाना कोतवाली", district: "कानपुर नगर" },
  { id: "off-15", name: "थाना कल्याणपुर", district: "कानपुर नगर" },
  { id: "off-16", name: "थाना काकादेव", district: "कानपुर नगर" },
  { id: "off-17", name: "थाना चकेरी", district: "कानपुर नगर" },
  { id: "off-18", name: "थाना गोविंदनगर", district: "कानपुर नगर" },
  { id: "off-19", name: "महिला थाना", district: "कानपुर नगर" },
  { id: "off-20", name: "ट्रैफिक पुलिस लाइन", district: "कानपुर नगर" },

  // वाराणसी
  { id: "off-21", name: "थाना लंका", district: "वाराणसी" },
  { id: "off-22", name: "थाना कैंट", district: "वाराणसी" },
  { id: "off-23", name: "थाना भेलूपुर", district: "वाराणसी" },
  { id: "off-24", name: "थाना दशाश्वमेध", district: "वाराणसी" },
  { id: "off-25", name: "थाना सिगरा", district: "वाराणसी" },
  { id: "off-26", name: "कंट्रोल रूम (112)", district: "वाराणसी" },
  { id: "off-27", name: "महिला थाना", district: "वाराणसी" },

  // आगरा
  { id: "off-28", name: "थाना ताजगंज वृत्त", district: "आगरा" },
  { id: "off-29", name: "थाना हरीपर्वत", district: "आगरा" },
  { id: "off-30", name: "थाना रकाबगंज", district: "आगरा" },
  { id: "off-31", name: "एसएसपी कार्यालय", district: "आगरा" },
  { id: "off-32", name: "महिला थाना", district: "आगरा" },

  // प्रयागराज
  { id: "off-33", name: "थाना कैंट", district: "प्रयागराज" },
  { id: "off-34", name: "थाना सिविल लाइंस", district: "प्रयागराज" },
  { id: "off-35", name: "थाना कर्नलगंज", district: "प्रयागराज" },
  { id: "off-36", name: "पुलिस लाइन प्रयागराज", district: "प्रयागराज" },
  { id: "off-37", name: "महिला थाना", district: "प्रयागराज" },

  // गोरखपुर
  { id: "off-38", name: "थाना कोतवाली", district: "गोरखपुर" },
  { id: "off-39", name: "थाना कैंट", district: "गोरखपुर" },
  { id: "off-40", name: "थाना गोरखनाथ", district: "गोरखपुर" },
  { id: "off-41", name: "कंट्रोल रूम (112)", district: "गोरखपुर" },
  { id: "off-42", name: "महिला थाना", district: "गोरखपुर" },

  // मेरठ
  { id: "off-43", name: "थाना नौचंदी", district: "मेरठ" },
  { id: "off-44", name: "थाना सिविल लाइंस", district: "मेरठ" },
  { id: "off-45", name: "ट्रैफिक पुलिस लाइन", district: "मेरठ" },
  { id: "off-46", name: "महिला थाना", district: "मेरठ" },

  // बरेली
  { id: "off-47", name: "थाना कोतवाली", district: "बरेली" },
  { id: "off-48", name: "थाना सुभाषनगर", district: "बरेली" },
  { id: "off-49", name: "थाना बारादरी", district: "बरेली" },
  { id: "off-50", name: "महिला थाना", district: "बरेली" }
];

export const OFFICES = [
  "सभी कार्यालय/थाने (All Offices)",
  ...Array.from(new Set(DEFAULT_OFFICE_ITEMS.map(o => o.name)))
];
