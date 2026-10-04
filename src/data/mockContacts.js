export const DEFAULT_UNIFORM_PHOTO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="70" r="38" fill="%23f1c27d"/><path d="M70 56 Q100 28 130 56 Q120 40 100 40 Q80 40 70 56 Z" fill="%231e293b"/><path d="M50 170 C50 125 75 110 100 110 C125 110 150 125 150 170 Z" fill="%23c29b38"/><polygon points="90,110 100,140 110,110 100,105" fill="%231e293b"/><polygon points="76,112 88,140 100,110" fill="%23a88228"/><polygon points="124,112 112,140 100,110" fill="%23a88228"/><rect x="62" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="70,123 72,128 77,128 73,131 75,136 70,133 65,136 67,131 63,128 68,128" fill="%23fbbf24"/><rect x="122" y="118" width="16" height="26" rx="3" fill="%231e3a8a"/><polygon points="130,123 132,128 137,128 133,131 135,136 130,133 125,136 127,131 123,128 128,128" fill="%23fbbf24"/><rect x="115" y="152" width="22" height="7" rx="2" fill="%231e293b"/><circle cx="126" cy="155.5" r="2" fill="%23fbbf24"/><path d="M50 170 Q100 160 150 170 L150 200 L50 200 Z" fill="%23b0892f"/></svg>`;

export const DEFAULT_UNIFORM_PHOTO_FEMALE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><circle cx="100" cy="72" r="36" fill="%23fcd5b5"/><path d="M66 65 Q100 25 134 65 Q138 95 132 105 Q120 75 100 70 Q80 75 68 105 Z" fill="%231e293b"/><path d="M52 170 C52 128 76 112 100 112 C124 112 148 128 148 170 Z" fill="%23c29b38"/><polygon points="90,112 100,140 110,112 100,107" fill="%231e293b"/><polygon points="76,114 88,140 100,112" fill="%23a88228"/><polygon points="124,114 112,140 100,112" fill="%23a88228"/><rect x="64" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="71.5,125 73,129 77,129 74,132 75.5,136 71.5,133.5 67.5,136 69,132 66,129 70,129" fill="%23fbbf24"/><rect x="121" y="120" width="15" height="24" rx="3" fill="%231e3a8a"/><polygon points="128.5,125 130,129 134,129 131,132 132.5,136 128.5,133.5 124.5,136 126,132 123,129 127,129" fill="%23fbbf24"/><path d="M52 170 Q100 162 148 170 L148 200 L52 200 Z" fill="%23b0892f"/></svg>`;

export const initialContacts = [
  {
    id: "pol-101",
    pno: "PNO-948120011",
    name: "विक्रम सिंह (IPS)",
    post: "पुलिस अधीक्षक (SP)",
    district: "लखनऊ",
    office: "एसपी कार्यालय (मुख्यालय)",
    phone: "9454401201",
    whatsapp: "9454401201",
    email: "sp.lucknow@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    uniformPhoto: DEFAULT_UNIFORM_PHOTO,
    uniformPhotoUploaded: true,
    createdAt: "2026-01-10T10:00:00.000Z"
  },
  {
    id: "pol-102",
    pno: "PNO-981200342",
    name: "अमित कुमार शर्मा",
    post: "अपर पुलिस अधीक्षक (ASP)",
    district: "लखनऊ",
    office: "अपराध शाखा / क्राइम ब्रांच",
    phone: "9454401202",
    whatsapp: "9454401202",
    email: "asp.crime.lk@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-01-12T11:30:00.000Z"
  },
  {
    id: "pol-103",
    pno: "PNO-012849103",
    name: "प्रिया वर्मा",
    post: "क्षेत्राधिकारी (DSP)",
    district: "लखनऊ",
    office: "थाना हजरतगंज सर्द",
    phone: "9454401203",
    whatsapp: "9454401203",
    email: "co.hazratganj@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: true,
    uniformPhoto: DEFAULT_UNIFORM_PHOTO_FEMALE,
    uniformPhotoUploaded: true,
    createdAt: "2026-02-01T09:15:00.000Z"
  },
  {
    id: "pol-104",
    pno: "PNO-058291044",
    name: "राजेश कुमार यादव",
    post: "प्रभारी निरीक्षक (Inspector)",
    district: "लखनऊ",
    office: "थाना हजरतगंज",
    phone: "9454401204",
    whatsapp: "9454401204",
    email: "sho.hazratganj@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: true,
    uniformPhoto: DEFAULT_UNIFORM_PHOTO,
    uniformPhotoUploaded: true,
    createdAt: "2026-02-05T14:20:00.000Z"
  },
  {
    id: "pol-105",
    pno: "PNO-120492815",
    name: "संजय प्रताप सिंह",
    post: "उप-निरीक्षक (Sub-Inspector)",
    district: "लखनऊ",
    office: "साइबर क्राइम सेल",
    phone: "9454401205",
    whatsapp: "9454401205",
    email: "cyber.lucknow@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-02-10T16:00:00.000Z"
  },
  {
    id: "pol-106",
    pno: "PNO-182940196",
    name: "राकेश कुमार",
    post: "मुख्य आरक्षी (Head Constable)",
    district: "कानपुर नगर",
    office: "थाना कोतवाली",
    phone: "9454401301",
    whatsapp: "9454401301",
    email: "hc.rakesh@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-02-12T10:00:00.000Z"
  },
  {
    id: "pol-107",
    pno: "PNO-204918277",
    name: "सुनील तिवारी (IPS)",
    post: "पुलिस वरिष्ठ अधीक्षक (SSP)",
    district: "कानपुर नगर",
    office: "एसएसपी कार्यालय",
    phone: "9454401300",
    whatsapp: "9454401300",
    email: "ssp.kanpur@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-01-15T08:30:00.000Z"
  },
  {
    id: "pol-108",
    pno: "PNO-229104828",
    name: "कविता पांडे",
    post: "प्रभारी निरीक्षक (Inspector)",
    district: "वाराणसी",
    office: "महिला थाना",
    phone: "9454401401",
    whatsapp: "9454401401",
    email: "mahilathana.vns@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: true,
    createdAt: "2026-02-15T12:00:00.000Z"
  },
  {
    id: "pol-109",
    pno: "PNO-259104829",
    name: "मनोज तिवारी",
    post: "उप-निरीक्षक (Sub-Inspector)",
    district: "वाराणसी",
    office: "थाना लंका",
    phone: "9454401402",
    whatsapp: "9454401402",
    email: "si.manoj@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-02-18T15:30:00.000Z"
  },
  {
    id: "pol-110",
    pno: "PNO-301948210",
    name: "दीपक कुमार गौतम",
    post: "क्षेत्राधिकारी (DSP)",
    district: "आगरा",
    office: "थाना ताजगंज वृत्त",
    phone: "9454401501",
    whatsapp: "9454401501",
    email: "co.tajganj@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-02-20T11:00:00.000Z"
  },
  {
    id: "pol-111",
    pno: "PNO-339104811",
    name: "अनिल सिंह चौहान",
    post: "आरक्षी (Constable)",
    district: "प्रयागराज",
    office: "कंट्रोल रूम (112)",
    phone: "9454401601",
    whatsapp: "9454401601",
    email: "anil.c112@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: false,
    createdAt: "2026-02-22T17:45:00.000Z"
  },
  {
    id: "pol-112",
    pno: "PNO-440192812",
    name: "सौरभ भारद्वाज",
    post: "उप-निरीक्षक (Sub-Inspector)",
    district: "लखनऊ",
    office: "थाना विभूति खंड",
    phone: "9454401209",
    whatsapp: "9454401209",
    email: "saurabh.si@up.gov.in",
    password: "1234",
    status: "pending",
    isRegisteredUser: true,
    createdAt: "2026-07-20T10:15:00.000Z",
    registrationNotes: "नवीन पदस्थापना के पश्चात प्रोफ़ाइल अपडेट हेतु आवेदन।"
  },
  {
    id: "pol-113",
    pno: "PNO-491029413",
    name: "शालिनी सिंह",
    post: "मुख्य आरक्षी (Head Constable)",
    district: "प्रयागराज",
    office: "ट्रैफिक पुलिस लाइन",
    phone: "9454401605",
    whatsapp: "9454401605",
    email: "shalini.traffic@up.gov.in",
    password: "1234",
    status: "pending",
    isRegisteredUser: true,
    createdAt: "2026-07-21T08:00:00.000Z",
    registrationNotes: "स्वयं का मोबाइल नंबर एवं ईमेल अद्यतन (Update) हेतु।"
  },
  {
    id: "pol-114",
    pno: "PNO-501829414",
    name: "महेश चंद्र",
    post: "उप-निरीक्षक (Sub-Inspector)",
    district: "कानपुर नगर",
    office: "थाना कल्याणपुर",
    phone: "9454401315",
    whatsapp: "9454401315",
    email: "mahesh.si@up.gov.in",
    password: "1234",
    status: "pending",
    isRegisteredUser: true,
    uniformPhoto: DEFAULT_UNIFORM_PHOTO,
    uniformPhotoUploaded: true,
    createdAt: "2026-08-01T11:20:00.000Z",
    registrationNotes: "कानपुर नगर में नया पदभार ग्रहण किया है, अनुमोदन की कृपा करें।"
  },
  {
    id: "pol-115",
    pno: "PNO-999000111",
    name: "विकास यादव (फोटो अपलोड अपेक्षित)",
    post: "आरक्षी (Constable)",
    district: "लखनऊ",
    office: "थाना विभूति खंड",
    phone: "9454401999",
    whatsapp: "9454401999",
    email: "vikas.constable@up.gov.in",
    password: "1234",
    status: "approved",
    isRegisteredUser: true,
    uniformPhoto: null,
    uniformPhotoUploaded: false,
    createdAt: "2026-08-10T11:20:00.000Z"
  }
];

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

export const initialNotifications = [
  {
    id: "notif-cross-1",
    title: "🚨 [अंतर-जनपद संवाद अलर्ट] लखनऊ ➔ कानपुर नगर (राकेश कुमार)",
    content: "अधिकारी प्रिया वर्मा (DSP, जनपद: लखनऊ) ने आपके जनपद के कार्मिक राकेश कुमार (मुख्य आरक्षी, थाना कोतवाली) को आधिकारिक आंतरिक संदेश एवं अभियुक्त शिनाख्त फ़ोटो प्रेषित किया है।\nपर्यवेक्षी प्रतिलिपि: संबंधित थाना प्रभारी (SHO कोतवाली), क्षेत्राधिकारी (CO कोतवाली), वरिष्ठ पुलिस अधीक्षक (SSP कानपुर नगर)।",
    district: "कानपुर नगर",
    postedBy: "प्रिया वर्मा (DSP लखनऊ)",
    postedAt: "2026-09-30T16:25:00.000Z",
    type: "inter_district_alert",
    targetUserId: "pol-106",
    senderId: "pol-103",
    chatId: "chat-dir-pol103-pol106"
  },
  {
    id: "notif-1",
    title: "आगामी त्योहारों के मद्देनज़र सतर्कता एवं गश्त बढ़ाने हेतु निर्देश",
    content: "सभी ज़िला पुलिस अधीक्षकों एवं थाना प्रभारियों को निर्देशित किया जाता है कि संवेदनशील क्षेत्रों में फ्लैग मार्च एवं लगातार चेकिंग सुनिश्चित करें।",
    district: "सभी ज़िले (All Districts)",
    postedBy: "मुख्यालय पुलिस महानिदेशक (Admin)",
    postedAt: "2026-09-25T10:00:00.000Z",
    type: "official"
  },
  {
    id: "notif-2",
    title: "लखनऊ ज़िला: मासिक अपराध समीक्षा बैठक सूचना",
    content: "दिनांक 05 अक्टूबर को पुलिस लाइन सभागार में समस्त क्षेत्राधिकारी एवं थाना प्रभारियों की उपस्थिति अनिवार्य है।",
    district: "लखनऊ",
    postedBy: "सुधीर कुमार (Co-Admin, लखनऊ)",
    postedAt: "2026-09-28T14:30:00.000Z",
    type: "district"
  },
  {
    id: "notif-3",
    title: "कानपुर नगर: ट्रैफिक रूट डायवर्जन निर्देश",
    content: "विशिष्ट आयोजन के दृष्टिगत घंटाघर से माल रोड तक भारी वाहनों का प्रवेश 10 बजे तक प्रतिबंधित रहेगा।",
    district: "कानपुर नगर",
    postedBy: "आलोक श्रीवास्तव (Co-Admin, कानपुर)",
    postedAt: "2026-09-29T09:15:00.000Z",
    type: "district"
  }
];

export const initialFeedbacks = [
  {
    id: "feed-1",
    userId: "pol-104",
    userName: "राजेश कुमार यादव (Inspector)",
    district: "लखनऊ",
    phone: "9454401204",
    subject: "थाना हजरतगंज CUG नंबर में तकनीकी समस्या",
    message: "थाना के द्वितीय कॉलिंग नंबर में नेटवर्क समस्या आ रही है, कृपया डायरेक्टरी में अतिरिक्त नंबर जोड़ने की सुविधा दें।",
    status: "open", // 'open' | 'resolved'
    createdAt: "2026-09-26T12:00:00.000Z"
  },
  {
    id: "feed-2",
    userId: "pol-106",
    userName: "राकेश कुमार (Head Constable)",
    district: "कानपुर नगर",
    phone: "9454401301",
    subject: "नई पदस्थापना की जानकारी अपडेट हेतु",
    message: "मेरा स्थानांतरण थाना कोतवाली से चौकी सिविल लाइंस हुआ है, कृपया विवरण अद्यतन करें।",
    status: "resolved",
    createdAt: "2026-09-24T16:40:00.000Z"
  }
];

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

export const OFFICES = [
  "सभी कार्यालय/थाने (All Offices)",
  "एसपी कार्यालय (मुख्यालय)",
  "एसएसपी कार्यालय",
  "अपराध शाखा / क्राइम ब्रांच",
  "साइबर क्राइम सेल",
  "कंट्रोल रूम (112)",
  "ट्रैफिक पुलिस लाइन",
  "थाना हजरतगंज",
  "थाना हजरतगंज सर्द",
  "थाना विभूति खंड",
  "थाना कोतवाली",
  "महिला थाना",
  "थाना लंका",
  "थाना ताजगंज वृत्त",
  "थाना कैंट",
  "थाना कल्याणपुर"
];
