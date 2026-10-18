/**
 * UP Police Directory App - Bilingual Engine (Hindi & English)
 * 
 * Implements:
 * - 4-Tier Resolution Priority:
 *   1. Exact value available in selected language
 *   2. Verified alternate-language value from existing record (nameEn/nameHi, etc.)
 *   3. Verified bilingual alias / reference dictionary
 *   4. Original database value as safe fallback (never blank, never unverified transliteration)
 * - Bidirectional Search & Filter matching across all 75 UP Districts, standard Posts, and Police Stations
 */

// Helper to check character scripts
export const hasDevanagari = (str) => /[\u0900-\u097F]/.test(str || '');
export const hasLatin = (str) => /[a-zA-Z]/.test(str || '');

export const normalizeKey = (str) => {
  if (!str) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\(\)\/\-,\.]/g, ' ')
    .replace(/\s+/g, ' ');
};

// 1. ALL 75 OFFICIAL UTTAR PRADESH DISTRICTS (Bilingual Master Reference)
export const UP_DISTRICTS_BILINGUAL = [
  { hi: 'सभी ज़िले (All Districts)', en: 'All Districts', aliases: ['सभी ज़िले', 'all districts', 'all'] },
  { hi: 'अयोध्या', en: 'Ayodhya', aliases: ['faizabad', 'faizabad (ayodhya)'] },
  { hi: 'अंबेडकर नगर', en: 'Ambedkar Nagar', aliases: ['ambedkarnagar'] },
  { hi: 'अमेठी', en: 'Amethi', aliases: ['csm nagar'] },
  { hi: 'अमरोहा', en: 'Amroha', aliases: ['jyotiba phule nagar'] },
  { hi: 'आगरा', en: 'Agra' },
  { hi: 'आजमगढ़', en: 'Azamgarh' },
  { hi: 'अलीगढ़', en: 'Aligarh' },
  { hi: 'इटावा', en: 'Etawah' },
  { hi: 'उन्नाव', en: 'Unnao' },
  { hi: 'एटा', en: 'Etah' },
  { hi: 'औरैया', en: 'Auraiya' },
  { hi: 'कन्नौज', en: 'Kannauj' },
  { hi: 'कानपुर देहात', en: 'Kanpur Dehat', aliases: ['ramabai nagar'] },
  { hi: 'कानपुर नगर', en: 'Kanpur Nagar', aliases: ['kanpur'] },
  { hi: 'कासगंज', en: 'Kasganj', aliases: ['kanshiram nagar'] },
  { hi: 'कुशीनगर', en: 'Kushinagar', aliases: ['padrauna'] },
  { hi: 'कौशाम्बी', en: 'Kaushambi' },
  { hi: 'गाजीपुर', en: 'Ghazipur' },
  { hi: 'गाजियाबाद', en: 'Ghaziabad' },
  { hi: 'गोरखपुर', en: 'Gorakhpur' },
  { hi: 'गोंडा', en: 'Gonda' },
  { hi: 'गौतम बुद्ध नगर', en: 'Gautam Buddha Nagar', aliases: ['noida', 'greater noida', 'gautam budh nagar', 'gb nagar'] },
  { hi: 'चंदौली', en: 'Chandauli' },
  { hi: 'चित्रकूट', en: 'Chitrakoot' },
  { hi: 'जालौन', en: 'Jalaun', aliases: ['orai'] },
  { hi: 'जौनपुर', en: 'Jaunpur' },
  { hi: 'झांसी', en: 'Jhansi' },
  { hi: 'देवरिया', en: 'Deoria' },
  { hi: 'पीलीभीत', en: 'Pilibhit' },
  { hi: 'प्रतापगढ़', en: 'Pratapgarh' },
  { hi: 'प्रयागराज', en: 'Prayagraj', aliases: ['allahabad', 'ilhabad'] },
  { hi: 'फतेहपुर', en: 'Fatehpur' },
  { hi: 'फर्रुखाबाद', en: 'Farrukhabad', aliases: ['fatehgarh'] },
  { hi: 'फिरोजाबाद', en: 'Firozabad' },
  { hi: 'बलरामपुर', en: 'Balrampur' },
  { hi: 'बलिया', en: 'Ballia' },
  { hi: 'बस्ती', en: 'Basti' },
  { hi: 'बहराइच', en: 'Bahraich' },
  { hi: 'बांदा', en: 'Banda' },
  { hi: 'बागपत', en: 'Baghpat' },
  { hi: 'बाराबंकी', en: 'Barabanki' },
  { hi: 'बरेली', en: 'Bareilly' },
  { hi: 'बिजनौर', en: 'Bijnor' },
  { hi: 'बुलंदशहर', en: 'Bulandshahr' },
  { hi: 'बदायूं', en: 'Budaun', aliases: ['badayun'] },
  { hi: 'महोबा', en: 'Mahoba' },
  { hi: 'मथुरा', en: 'Mathura' },
  { hi: 'महाराजगंज', en: 'Maharajganj' },
  { hi: 'मऊ', en: 'Mau', aliases: ['maunath bhanjan'] },
  { hi: 'मीरजापुर', en: 'Mirzapur' },
  { hi: 'मुजफ्फरनगर', en: 'Muzaffarnagar' },
  { hi: 'मुरादाबाद', en: 'Moradabad' },
  { hi: 'मेरठ', en: 'Meerut' },
  { hi: 'मैनपुरी', en: 'Mainpuri' },
  { hi: 'रामपुर', en: 'Rampur' },
  { hi: 'रायबरेली', en: 'Rae Bareli', aliases: ['raebareli'] },
  { hi: 'लखनऊ', en: 'Lucknow' },
  { hi: 'लखीमपुर खीरी', en: 'Lakhimpur Kheri', aliases: ['kheri', 'lakhimpur'] },
  { hi: 'ललितपुर', en: 'Lalitpur' },
  { hi: 'वाराणसी', en: 'Varanasi', aliases: ['kashi', 'banaras', 'benares'] },
  { hi: 'शामली', en: 'Shamli', aliases: ['prabuddh nagar'] },
  { hi: 'शाहजहांपुर', en: 'Shahjahanpur' },
  { hi: 'श्रावस्ती', en: 'Shravasti' },
  { hi: 'संभल', en: 'Sambhal', aliases: ['bhim nagar'] },
  { hi: 'संत कबीर नगर', en: 'Sant Kabir Nagar', aliases: ['khalilabad'] },
  { hi: 'भदोही (संत रविदास नगर)', en: 'Bhadohi (Sant Ravidas Nagar)', aliases: ['bhadohi', 'sant ravidas nagar'] },
  { hi: 'सहारनपुर', en: 'Saharanpur' },
  { hi: 'सिद्धार्थनगर', en: 'Siddharthnagar', aliases: ['naugarh'] },
  { hi: 'सीतापुर', en: 'Sitapur' },
  { hi: 'सोनभद्र', en: 'Sonbhadra', aliases: ['robertsganj'] },
  { hi: 'सुल्तानपुर', en: 'Sultanpur' },
  { hi: 'हरदोई', en: 'Hardoi' },
  { hi: 'हाथरस', en: 'Hathras', aliases: ['mahamaya nagar'] },
  { hi: 'हापुड़', en: 'Hapur', aliases: ['panchsheel nagar'] },
  { hi: 'हमीरपुर', en: 'Hamirpur' }
];

// 2. OFFICIAL POLICE DESIGNATIONS (Bilingual Master Reference)
export const POLICE_POSTS_BILINGUAL = [
  { hi: 'सभी पद (All Posts)', en: 'All Posts', aliases: ['सभी पद', 'all posts', 'all'] },
  { hi: 'पुलिस महानिदेशक (DGP)', en: 'Director General of Police (DGP)', aliases: ['dgp', 'dg police', 'director general of police', 'पुलिस महानिदेशक'] },
  { hi: 'अपर पुलिस महानिदेशक (ADG)', en: 'Additional Director General of Police (ADG)', aliases: ['adg', 'adgp', 'अपर पुलिस महानिदेशक'] },
  { hi: 'पुलिस महानिरीक्षक (IG)', en: 'Inspector General of Police (IG)', aliases: ['ig', 'igp', 'पुलिस महानिरीक्षक'] },
  { hi: 'पुलिस उप-महानिरीक्षक (DIG)', en: 'Deputy Inspector General of Police (DIG)', aliases: ['dig', 'digp', 'पुलिस उप-महानिरीक्षक', 'पुलिस उपमहानिरीक्षक'] },
  { hi: 'वरिष्ठ पुलिस अधीक्षक (SSP)', en: 'Senior Superintendent of Police (SSP)', aliases: ['ssp', 'वरिष्ठ पुलिस अधीक्षक'] },
  { hi: 'पुलिस अधीक्षक (SP)', en: 'Superintendent of Police (SP)', aliases: ['sp', 'superintendent of police', 'पुलिस अधीक्षक', 'police adheekshak', 'police superintendent'] },
  { hi: 'अपर पुलिस अधीक्षक (ASP)', en: 'Additional Superintendent of Police (ASP)', aliases: ['asp', 'अपर पुलिस अधीक्षक'] },
  { hi: 'क्षेत्राधिकारी (DSP/CO)', en: 'Deputy Superintendent of Police (DSP/CO)', aliases: ['dsp', 'co', 'circle officer', 'क्षेत्राधिकारी', 'डीएसपी', 'सीओ', 'पुलिस उपाधीक्षक', 'police upadheekshak'] },
  { hi: 'प्रभारी निरीक्षक', en: 'Inspector In-Charge', aliases: ['sho', 'inspector in-charge', 'inspector in charge', 'प्रभारी निरीक्षक (Inspector/SHO)', 'प्रभारी निरीक्षक (Inspector In-Charge)', 'थाना प्रभारी', 'inspector', 'निरीक्षक', 'Inspector In-Charge (SHO)', 'inspector in-charge (sho)'] },
  { hi: 'उपनिरीक्षक', en: 'Sub Inspector', aliases: ['sub inspector', 'sub-inspector', 'si', 'उप-निरीक्षक', 'उप-निरीक्षक (Sub-Inspector)', 'उप निरीक्षक', 'दारोगा', 'सब इंस्पेक्टर', 'Sub-Inspector (SI)', 'sub-inspector (si)'] },
  { hi: 'मुख्य आरक्षी', en: 'Head Constable', aliases: ['head constable', 'hc', 'मुख्य आरक्षी (Head Constable)', 'हेड कांस्टेबल', 'दीवान जी', 'head constable (hc)'] },
  { hi: 'आरक्षी', en: 'Constable', aliases: ['constable', 'const', 'आरक्षी (Constable)', 'सिपाही', 'कांस्टेबल'] }
];

// 3. OFFICIAL POLICE STATIONS & OFFICES (Bilingual Master Reference)
export const POLICE_OFFICES_AND_THANAS_BILINGUAL = [
  { hi: 'सभी कार्यालय/थाने (All Offices)', en: 'All Offices / Police Stations', aliases: ['सभी थाने', 'all offices', 'all stations', 'सभी कार्यालय'] },
  { hi: 'थाना कोतवाली', en: 'Kotwali Police Station', aliases: ['kotwali', 'कोतवाली', 'city kotwali', 'कोतवाली (kotwali / city)', 'kotwali (city)'] },
  { hi: 'थाना सिविल लाइन्स', en: 'Civil Lines Police Station', aliases: ['civil lines', 'थाना सिविल लाइन्स', 'सिविल लाइन्स', 'सिविल लाइन्स (civil lines)', 'civil lines police station'] },
  { hi: 'महिला थाना', en: 'Women Police Station', aliases: ['women police station', 'mahila thana', 'महिला थाना (women police station)'] },
  { hi: 'यातायात पुलिस लाइन', en: 'Traffic Police Line', aliases: ['traffic police', 'traffic police line', 'यातायात पुलिस', 'यातायात पुलिस (traffic police line)'] },
  { hi: 'पुलिस अधीक्षक कार्यालय', en: 'SP Office', aliases: ['sp office', 'police adheekshak karyalay', 'पुलिस अधीक्षक कार्यालय', 'पुलिस अधीक्षक कार्यालय (sp office)'] },
  { hi: 'अपराध शाखा / सर्विलांस', en: 'Crime Branch & SOG', aliases: ['crime branch', 'sog', 'अपराध शाखा', 'सर्विलांस', 'अपराध शाखा / सर्विलांस (crime branch & sog)'] },
  
  // Specific Thanas in Lucknow & across UP
  { hi: 'मड़ियांव', en: 'Madiyaon', aliases: ['madiyaon (verified official spelling)', 'madiyao'] },
  { hi: 'थाना हजरतगंज', en: 'Hazratganj Police Station', aliases: ['hazratganj', 'ps hazratganj', 'हजरतगंज'] },
  { hi: 'थाना मड़ियांव', en: 'Madiyaon Police Station', aliases: ['ps madiyaon', 'थाना मड़ियांव'] },
  { hi: 'थाना गोमती नगर', en: 'Gomti Nagar Police Station', aliases: ['gomti nagar', 'ps gomti nagar', 'गोमती नगर'] },
  { hi: 'थाना गोमती नगर विस्तार', en: 'Gomti Nagar Vistar Police Station', aliases: ['gomti nagar vistar', 'गोमती नगर विस्तार'] },
  { hi: 'थाना आशियाना', en: 'Ashiyana Police Station', aliases: ['ashiyana', 'ps ashiyana', 'आशियाना'] },
  { hi: 'थाना अलीगंज', en: 'Aliganj Police Station', aliases: ['aliganj', 'ps aliganj', 'अलीगंज'] },
  { hi: 'थाना इंदिरानगर', en: 'Indira Nagar Police Station', aliases: ['indira nagar', 'indiranagar', 'इंदिरानगर'] },
  { hi: 'थाना कैसरबाग', en: 'Kaiserbagh Police Station', aliases: ['kaiserbagh', 'कैसरबाग'] },
  { hi: 'थाना आलमबाग', en: 'Alambagh Police Station', aliases: ['alambagh', 'आलमबाग'] },
  { hi: 'थाना तालकटोरा', en: 'Talkatora Police Station', aliases: ['talkatora', 'तालकटोरा'] },
  { hi: 'थाना मानक नगर', en: 'Manak Nagar Police Station', aliases: ['manak nagar', 'मानक नगर'] },
  { hi: 'थाना कृष्णा नगर', en: 'Krishna Nagar Police Station', aliases: ['krishna nagar', 'कृष्णा नगर'] },
  { hi: 'थाना सरोजिनी नगर', en: 'Sarojini Nagar Police Station', aliases: ['sarojini nagar', 'सरोजिनी नगर'] },
  { hi: 'थाना बंथरा', en: 'Banthra Police Station', aliases: ['banthra', 'बंथरा'] },
  { hi: 'थाना पीजीआई', en: 'PGI Police Station', aliases: ['pgi', 'थाना एसजीपीजीआई', 'पीजीआई'] },
  { hi: 'थाना मोहनलालगंज', en: 'Mohanlalganj Police Station', aliases: ['mohanlalganj', 'मोहनलालगंज'] },
  { hi: 'थाना गोसाईंगंज', en: 'Gosainganj Police Station', aliases: ['gosainganj', 'गोसाईंगंज'] },
  { hi: 'थाना सुशांत गोल्फ सिटी', en: 'Sushant Golf City Police Station', aliases: ['sushant golf city', 'सुशांत गोल्फ सिटी'] },
  { hi: 'थाना चिनहट', en: 'Chinhat Police Station', aliases: ['chinhat', 'चिनहट'] },
  { hi: 'थाना बीबीडी', en: 'BBD Police Station', aliases: ['bbd', 'बीबीडी'] },
  { hi: 'थाना विकासनगर', en: 'Vikas Nagar Police Station', aliases: ['vikas nagar', 'विकासनगर'] },
  { hi: 'थाना जानकीपुरम', en: 'Jankipuram Police Station', aliases: ['jankipuram', 'जानकीपुरम'] },
  { hi: 'थाना गुडंबा', en: 'Gudamba Police Station', aliases: ['gudamba', 'गुडंबा'] },
  { hi: 'थाना मलिहाबाद', en: 'Malihabad Police Station', aliases: ['malihabad', 'मलिहाबाद'] },
  { hi: 'थाना रहीमाबाद', en: 'Rahimabad Police Station', aliases: ['rahimabad', 'रहीमाबाद'] },
  { hi: 'थाना काकोरी', en: 'Kakori Police Station', aliases: ['kakori', 'काकोरी'] },
  { hi: 'थाना सआदतगंज', en: 'Saadatganj Police Station', aliases: ['saadatganj', 'सआदतगंज'] },
  { hi: 'थाना चौक', en: 'Chowk Police Station', aliases: ['chowk', 'चौक'] },
  { hi: 'थाना ठाकुरगंज', en: 'Thakurganj Police Station', aliases: ['thakurganj', 'ठाकुरगंज'] },
  { hi: 'थाना वजीरगंज', en: 'Wazirganj Police Station', aliases: ['wazirganj', 'वजीरगंज'] },
  { hi: 'थाना बाजारखाला', en: 'Bazarkhala Police Station', aliases: ['bazarkhala', 'बाजारखाला'] },
  { hi: 'थाना नाका हिंडोला', en: 'Naka Hindola Police Station', aliases: ['naka hindola', 'नाका हिंडोला'] },
  { hi: 'थाना हुसैनगंज', en: 'Hussainganj Police Station', aliases: ['hussainganj', 'हुसैनगंज'] },
  { hi: 'थाना सरोसा भरोसा', en: 'Sarosa Bharosa Police Station', aliases: ['sarosa bharosa', 'सरोसा भरोसा'] },

  // Stations in other districts
  { hi: 'थाना कोतवाली (कानपुर)', en: 'Kotwali Police Station (Kanpur)', aliases: ['kotwali kanpur', 'थाना कोतवाली कानपुर'] },
  { hi: 'थाना कर्नलगंज', en: 'Colonelganj Police Station', aliases: ['colonelganj', 'कर्नलगंज'] },
  { hi: 'थाना कैंट', en: 'Cantt Police Station', aliases: ['cantt', 'केंट', 'कैंट'] },
  { hi: 'थाना चकेरी', en: 'Chakeri Police Station', aliases: ['chakeri', 'चकेरी'] },
  { hi: 'थाना कल्याणपुर', en: 'Kalyanpur Police Station', aliases: ['kalyanpur', 'कल्याणपुर'] },
  { hi: 'थाना सिगरा', en: 'Sigra Police Station', aliases: ['sigra', 'सिगरा'] },
  { hi: 'थाना भेलूपुर', en: 'Bhelupur Police Station', aliases: ['bhelupur', 'भेलूपुर'] },
  { hi: 'थाना दशाश्वमेध', en: 'Dashashwamedh Police Station', aliases: ['dashashwamedh', 'दशाश्वमेध'] },
  { hi: 'थाना कैंट (वाराणसी)', en: 'Cantt Police Station (Varanasi)', aliases: ['cantt varanasi'] },
  { hi: 'थाना सिविल लाइन्स (प्रयागराज)', en: 'Civil Lines Police Station (Prayagraj)', aliases: ['civil lines prayagraj'] },
  { hi: 'थाना कोतवाली (प्रयागराज)', en: 'Kotwali Police Station (Prayagraj)', aliases: ['kotwali prayagraj'] },
  { hi: 'थाना धूमनगंज', en: 'Dhoomanganj Police Station', aliases: ['dhoomanganj', 'धूमनगंज'] },
  { hi: 'थाना ताजगंज', en: 'Tajganj Police Station', aliases: ['tajganj', 'ताजगंज'] },
  { hi: 'थाना हरीपर्वत', en: 'Hariparwat Police Station', aliases: ['hariparwat', 'हरीपर्वत'] },
  { hi: 'थाना रकाबगंज', en: 'Rakabganj Police Station', aliases: ['rakabganj', 'रकाबगंज'] },
  { hi: 'थाना कोतवाली (गोरखपुर)', en: 'Kotwali Police Station (Gorakhpur)', aliases: ['kotwali gorakhpur'] },
  { hi: 'थाना कैंट (गोरखपुर)', en: 'Cantt Police Station (Gorakhpur)', aliases: ['cantt gorakhpur'] },
  { hi: 'थाना शाहपुर', en: 'Shahpur Police Station', aliases: ['shahpur', 'शाहपुर'] },
  { hi: 'थाना कविनगर', en: 'Kavi Nagar Police Station', aliases: ['kavi nagar', 'कविनगर'] },
  { hi: 'थाना सिहानी गेट', en: 'Sihani Gate Police Station', aliases: ['sihani gate', 'सिहानी गेट'] },
  { hi: 'थाना साहिबाबाद', en: 'Sahibabad Police Station', aliases: ['sahibabad', 'साहिबाबाद'] },
  { hi: 'थाना इंदिरापुरम', en: 'Indirapuram Police Station', aliases: ['indirapuram', 'इंदिरापुरम'] },
  { hi: 'थाना सेक्टर 20 नोएडा', en: 'Sector 20 Noida Police Station', aliases: ['sector 20 noida', 'सेक्टर 20 नोएडा'] },
  { hi: 'थाना सेक्टर 24 नोएडा', en: 'Sector 24 Noida Police Station', aliases: ['sector 24 noida', 'सेक्टर 24 नोएडा'] },
  { hi: 'थाना सेक्टर 39 नोएडा', en: 'Sector 39 Noida Police Station', aliases: ['sector 39 noida', 'सेक्टर 39 नोएडा'] },
  { hi: 'थाना सेक्टर 58 नोएडा', en: 'Sector 58 Noida Police Station', aliases: ['sector 58 noida', 'सेक्टर 58 नोएडा'] },
  { hi: 'थाना बिसरख', en: 'Bisrakh Police Station', aliases: ['bisrakh', 'बिसरख'] },
  { hi: 'थाना सूरजपुर', en: 'Surajpur Police Station', aliases: ['surajpur', 'सूरजपुर'] },
  { hi: 'थाना कासना', en: 'Kasna Police Station', aliases: ['kasna', 'कासना'] },
  { hi: 'थाना नॉलेज पार्क', en: 'Knowledge Park Police Station', aliases: ['knowledge park', 'नॉलेज पार्क'] }
];

// 4. VERIFIED EMPLOYEE NAME DIRECTORY
export const EMPLOYEE_NAMES_BILINGUAL = [
  { hi: 'विक्रम सिंह', en: 'Vikram Singh' },
  { hi: 'अजय कुमार', en: 'Ajay Kumar' },
  { hi: 'राजेश कुमार', en: 'Rajesh Kumar' },
  { hi: 'अमित कुमार', en: 'Amit Kumar' },
  { hi: 'अनूप कुमार त्रिपाठी', en: 'Anoop Kumar Tripathi' },
  { hi: 'अजय कुमार सिंह', en: 'Ajay Kumar Singh' },
  { hi: 'विक्रम राठौर', en: 'Vikram Rathore' },
  { hi: 'संजय यादव', en: 'Sanjay Yadav' },
  { hi: 'राजेश शर्मा', en: 'Rajesh Sharma' },
  { hi: 'अमित वर्मा', en: 'Amit Verma' },
  { hi: 'प्रदीप कुमार', en: 'Pradeep Kumar' },
  { hi: 'दीपक सिंह', en: 'Deepak Singh' },
  { hi: 'सुनील कुमार', en: 'Sunil Kumar' },
  { hi: 'मनोज कुमार', en: 'Manoj Kumar' },
  { hi: 'विकास कुमार', en: 'Vikas Kumar' },
  { hi: 'राहुल सिंह', en: 'Rahul Singh' },
  { hi: 'संतोष कुमार', en: 'Santosh Kumar' },
  { hi: 'अनिल कुमार', en: 'Anil Kumar' },
  { hi: 'आलोक कुमार', en: 'Alok Kumar' },
  { hi: 'दिनेश कुमार', en: 'Dinesh Kumar' },
  { hi: 'राकेश कुमार', en: 'Rakesh Kumar' },
  { hi: 'सुरेश कुमार', en: 'Suresh Kumar' },
  { hi: 'महेश कुमार', en: 'Mahesh Kumar' },
  { hi: 'विजय कुमार', en: 'Vijay Kumar' },
  { hi: 'पवन कुमार', en: 'Pawan Kumar' },
  { hi: 'सुभाष चंद्र', en: 'Subhash Chandra' },
  { hi: 'अशोक कुमार', en: 'Ashok Kumar' },
  { hi: 'सुरेंद्र कुमार', en: 'Surendra Kumar' },
  { hi: 'सत्येंद्र सिंह', en: 'Satyendra Singh' },
  { hi: 'जितेंद्र कुमार', en: 'Jitendra Kumar' },
  { hi: 'धर्मेन्द्र कुमार', en: 'Dharmendra Kumar' },
  { hi: 'कमलेश कुमार', en: 'Kamlesh Kumar' },
  { hi: 'राम प्रकाश', en: 'Ram Prakash' },
  { hi: 'अरविंद कुमार', en: 'Arvind Kumar' },
  { hi: 'मुकेश कुमार', en: 'Mukesh Kumar' },
  { hi: 'अरुण कुमार', en: 'Arun Kumar' },
  { hi: 'नीरज कुमार', en: 'Neeraj Kumar' },
  { hi: 'पंकज कुमार', en: 'Pankaj Kumar' },
  { hi: 'सुधीर कुमार', en: 'Sudhir Kumar' },
  { hi: 'योगेश कुमार', en: 'Yogesh Kumar' },
  { hi: 'संदीप कुमार', en: 'Sandeep Kumar' },
  { hi: 'कुलदीप सिंह', en: 'Kuldeep Singh' },
  { hi: 'प्रवीण कुमार', en: 'Praveen Kumar' },
  { hi: 'अखिलेश कुमार', en: 'Akhilesh Kumar' },
  { hi: 'विनोद कुमार', en: 'Vinod Kumar' },
  { hi: 'नीतू सिंह', en: 'Neetu Singh' },
  { hi: 'सुनीता यादव', en: 'Sunita Yadav' },
  { hi: 'आरती शर्मा', en: 'Aarti Sharma' },
  { hi: 'प्रिया सिंह', en: 'Priya Singh' },
  { hi: 'पूजा वर्मा', en: 'Pooja Verma' }
];

// Build optimized lookup map
const buildLookupIndex = (entries) => {
  const map = new Map();
  for (const item of entries) {
    if (item.hi) {
      const k1 = normalizeKey(item.hi);
      const k2 = String(item.hi).trim().toLowerCase();
      if (!map.has(k1)) map.set(k1, item);
      if (!map.has(k2)) map.set(k2, item);
    }
    if (item.en) {
      const k1 = normalizeKey(item.en);
      const k2 = String(item.en).trim().toLowerCase();
      if (!map.has(k1)) map.set(k1, item);
      if (!map.has(k2)) map.set(k2, item);
    }
    if (Array.isArray(item.aliases)) {
      for (const al of item.aliases) {
        const k1 = normalizeKey(al);
        const k2 = String(al).trim().toLowerCase();
        if (!map.has(k1)) map.set(k1, item);
        if (!map.has(k2)) map.set(k2, item);
      }
    }
  }
  return map;
};

const districtLookupMap = buildLookupIndex(UP_DISTRICTS_BILINGUAL);
const postLookupMap = buildLookupIndex(POLICE_POSTS_BILINGUAL);
const officeLookupMap = buildLookupIndex(POLICE_OFFICES_AND_THANAS_BILINGUAL);
const employeeLookupMap = buildLookupIndex(EMPLOYEE_NAMES_BILINGUAL);

/**
 * 4-Tier Resolution Priority Engine
 * Priority 1: Exact value already available in selected language
 * Priority 2: Verified alternate-language value from existing record (nameEn, districtEn, etc.)
 * Priority 3: Verified bilingual alias / reference dictionary
 * Priority 4: Original database value as safe fallback (never blank, never unverified transliteration)
 * 
 * @param {string} fieldName - 'name' | 'district' | 'post' | 'office'
 * @param {object|string} contactOrValue - contact object or string value
 * @param {'hi'|'en'} targetLang - 'hi' or 'en'
 * @returns {string} - Resolved bilingual display string
 */
export function resolveBilingualField(fieldName, contactOrValue, targetLang = 'hi') {
  if (!contactOrValue) return '';

  let rawValue = '';
  let contactObj = null;

  if (typeof contactOrValue === 'object') {
    contactObj = contactOrValue;
    rawValue = contactObj[fieldName] || '';
  } else {
    rawValue = String(contactOrValue);
  }

  const rawTrimmed = rawValue.trim();
  if (!rawTrimmed) return '';

  const isTargetEnglish = targetLang === 'en';
  const isTargetHindi = targetLang === 'hi';

  // Priority 1: Exact value available in selected language
  // (If raw database value is already purely in the selected script and not a bilingual composite)
  const isExactSingleScriptTarget = 
    (isTargetEnglish && hasLatin(rawTrimmed) && !hasDevanagari(rawTrimmed)) ||
    (isTargetHindi && hasDevanagari(rawTrimmed) && !hasLatin(rawTrimmed));

  if (isExactSingleScriptTarget) {
    return rawTrimmed;
  }

  // Priority 2: Verified alternate-language value from existing record
  if (contactObj) {
    if (isTargetEnglish) {
      const explicitEn = 
        contactObj[`${fieldName}En`] || 
        contactObj[`${fieldName}_en`] || 
        (fieldName === 'name' ? contactObj.name_english : null);
      if (explicitEn && typeof explicitEn === 'string' && explicitEn.trim()) {
        return explicitEn.trim();
      }
    } else if (isTargetHindi) {
      const explicitHi = 
        contactObj[`${fieldName}Hi`] || 
        contactObj[`${fieldName}_hi`] || 
        (fieldName === 'name' ? contactObj.name_hindi : null);
      if (explicitHi && typeof explicitHi === 'string' && explicitHi.trim()) {
        return explicitHi.trim();
      }
    }
  }

  // Priority 3: Verified bilingual alias / reference table
  let tableMatch = null;
  const normKey = normalizeKey(rawTrimmed);
  const directKey = rawTrimmed.toLowerCase();

  if (fieldName === 'district') {
    tableMatch = districtLookupMap.get(normKey) || districtLookupMap.get(directKey);
  } else if (fieldName === 'post') {
    tableMatch = postLookupMap.get(normKey) || postLookupMap.get(directKey);
  } else if (fieldName === 'office') {
    tableMatch = officeLookupMap.get(normKey) || officeLookupMap.get(directKey);

    // Dynamic Police Station prefix/suffix parsing if not directly in map
    if (!tableMatch) {
      // Check for parenthetical district e.g. "थाना कोतवाली (Lucknow)" or "Kotwali Police Station (Lucknow)"
      const parenMatch = rawTrimmed.match(/^(.+?)\s*\((.+?)\)$/);
      if (parenMatch) {
        const basePart = parenMatch[1].trim();
        const distPart = parenMatch[2].trim();
        const resolvedBase = resolveBilingualField('office', basePart, targetLang);
        const resolvedDist = resolveBilingualField('district', distPart, targetLang);
        if (resolvedBase) {
          return `${resolvedBase} (${resolvedDist})`;
        }
      }

      if (isTargetEnglish && rawTrimmed.startsWith('थाना ')) {
        const stationSubName = rawTrimmed.slice(5).trim();
        const subMatch = 
          officeLookupMap.get(normalizeKey(stationSubName)) || 
          districtLookupMap.get(normalizeKey(stationSubName));
        if (subMatch && subMatch.en) {
          return subMatch.en.includes('Police Station') ? subMatch.en : `${subMatch.en} Police Station`;
        }
      } else if (isTargetHindi) {
        if (/ police station$/i.test(rawTrimmed)) {
          const stationSubName = rawTrimmed.replace(/ police station$/i, '').trim();
          const subMatch = 
            officeLookupMap.get(normalizeKey(stationSubName)) || 
            districtLookupMap.get(normalizeKey(stationSubName));
          if (subMatch && subMatch.hi) {
            return subMatch.hi.startsWith('थाना ') ? subMatch.hi : `थाना ${subMatch.hi}`;
          }
        } else if (/^ps /i.test(rawTrimmed)) {
          const stationSubName = rawTrimmed.replace(/^ps /i, '').trim();
          const subMatch = 
            officeLookupMap.get(normalizeKey(stationSubName)) || 
            districtLookupMap.get(normalizeKey(stationSubName));
          if (subMatch && subMatch.hi) {
            return subMatch.hi.startsWith('थाना ') ? subMatch.hi : `थाना ${subMatch.hi}`;
          }
        }
      }
    }
  } else if (fieldName === 'name') {
    tableMatch = employeeLookupMap.get(normKey) || employeeLookupMap.get(directKey);
  }

  if (tableMatch) {
    if (isTargetEnglish && tableMatch.en) {
      return tableMatch.en;
    }
    if (isTargetHindi && tableMatch.hi) {
      return tableMatch.hi;
    }
  }

  // Priority 4: Original database value as safe fallback
  // (Never display blank, never invent unverified transliteration)
  return rawTrimmed;
}

/**
 * Check if two values refer to the same entity across Hindi and English
 * E.g., isBilingualMatch("Lucknow", "लखनऊ", "district") === true
 */
export function isBilingualMatch(val1, val2, fieldType = 'district') {
  if (!val1 && !val2) return true;
  if (!val1 || !val2) return false;

  const s1 = String(val1).trim().toLowerCase();
  const s2 = String(val2).trim().toLowerCase();
  if (s1 === s2) return true;

  const n1 = normalizeKey(val1);
  const n2 = normalizeKey(val2);
  if (n1 === n2) return true;

  // Resolve both to Hindi and compare
  const hi1 = resolveBilingualField(fieldType, val1, 'hi');
  const hi2 = resolveBilingualField(fieldType, val2, 'hi');
  if (hi1 && hi2 && normalizeKey(hi1) === normalizeKey(hi2)) return true;

  // Resolve both to English and compare
  const en1 = resolveBilingualField(fieldType, val1, 'en');
  const en2 = resolveBilingualField(fieldType, val2, 'en');
  if (en1 && en2 && normalizeKey(en1) === normalizeKey(en2)) return true;

  return false;
}

/**
 * Bidirectional Hindi-English Search Matcher
 * Matches query in either English or Hindi against all contact fields
 */
export function matchesSearchQueryBilingual(contact, query) {
  if (!query || !String(query).trim()) return true;

  const q = String(query).toLowerCase().trim();
  const cleanQueryDigits = q.replace(/\D/g, '');
  const cleanPhoneDigits = (contact.phone || '').replace(/\D/g, '');

  // PNO or phone matching
  if ((contact.pno || '').toLowerCase().includes(q)) return true;
  if (cleanQueryDigits.length >= 3 && cleanPhoneDigits.includes(cleanQueryDigits)) return true;
  if ((contact.phone || '').toLowerCase().includes(q)) return true;

  // Resolve contact fields in both Hindi and English
  const nameHi = resolveBilingualField('name', contact, 'hi').toLowerCase();
  const nameEn = resolveBilingualField('name', contact, 'en').toLowerCase();
  const distHi = resolveBilingualField('district', contact, 'hi').toLowerCase();
  const distEn = resolveBilingualField('district', contact, 'en').toLowerCase();
  const postHi = resolveBilingualField('post', contact, 'hi').toLowerCase();
  const postEn = resolveBilingualField('post', contact, 'en').toLowerCase();
  const offHi = resolveBilingualField('office', contact, 'hi').toLowerCase();
  const offEn = resolveBilingualField('office', contact, 'en').toLowerCase();

  const rawName = (contact.name || '').toLowerCase();
  const rawDist = (contact.district || '').toLowerCase();
  const rawPost = (contact.post || '').toLowerCase();
  const rawOff = (contact.office || '').toLowerCase();

  return (
    nameHi.includes(q) || nameEn.includes(q) || rawName.includes(q) ||
    distHi.includes(q) || distEn.includes(q) || rawDist.includes(q) ||
    postHi.includes(q) || postEn.includes(q) || rawPost.includes(q) ||
    offHi.includes(q) || offEn.includes(q) || rawOff.includes(q)
  );
}

// User display language persistence key
export const DISPLAY_LANG_STORAGE_KEY = 'up_police_display_language';

export function getStoredDisplayLanguage() {
  try {
    const saved = localStorage.getItem(DISPLAY_LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') return saved;
  } catch (e) {
    // ignore
  }
  return 'hi'; // Default Hindi
}

export function saveStoredDisplayLanguage(lang) {
  try {
    if (lang === 'en' || lang === 'hi') {
      localStorage.setItem(DISPLAY_LANG_STORAGE_KEY, lang);
    }
  } catch (e) {
    // ignore
  }
}
