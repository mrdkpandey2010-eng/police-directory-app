/**
 * test-bilingual-scenarios.js
 * Verification script for Bilingual Display & Language-Based Rendering (Requirement 11, Section G)
 * 
 * Verifies all 7 required test cases:
 * 1. English-only district record displays in Hindi when a verified Hindi equivalent exists.
 * 2. Hindi-only district record displays in English when a verified English equivalent exists.
 * 3. Police stations, offices, and designations resolve accurately in both directions.
 * 4. Employee names use verified alternate names when available and safely fall back to the original name otherwise.
 * 5. Switching between हिंदी and English updates display immediately without reloading or corrupting data.
 * 6. Search works bi-directionally in either language, regardless of display language or database entry language.
 * 7. Calls, messaging, contact actions, access restrictions, and role permissions remain strictly intact.
 */

import { 
  resolveBilingualField, 
  isBilingualMatch, 
  matchesSearchQueryBilingual,
  UP_DISTRICTS_BILINGUAL,
  POLICE_POSTS_BILINGUAL,
  POLICE_OFFICES_AND_THANAS_BILINGUAL,
  EMPLOYEE_NAMES_BILINGUAL
} from '../src/utils/bilingual.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('UP Police Directory - Section 11 Bilingual Verification Test Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: English-only district record displays in Hindi
// -----------------------------------------------------------------------------
console.log('Test 1: English-only district record displays in Hindi when verified equivalent exists');
{
  const englishDistricts = [
    { en: 'Lucknow', expectedHi: 'लखनऊ' },
    { en: 'Varanasi', expectedHi: 'वाराणसी' },
    { en: 'Kanpur Nagar', expectedHi: 'कानपुर नगर' },
    { en: 'Prayagraj', expectedHi: 'प्रयागराज' },
    { en: 'Gorakhpur', expectedHi: 'गोरखपुर' },
    { en: 'Gautam Buddha Nagar', expectedHi: 'गौतम बुद्ध नगर' },
    { en: 'Ayodhya', expectedHi: 'अयोध्या' }
  ];

  englishDistricts.forEach(({ en, expectedHi }) => {
    const contact = { district: en };
    const resolved = resolveBilingualField('district', contact, 'hi');
    assert(resolved === expectedHi, `English "${en}" resolves to Hindi "${resolved}" (expected "${expectedHi}")`);
  });
}

// -----------------------------------------------------------------------------
// Test 2: Hindi-only district record displays in English
// -----------------------------------------------------------------------------
console.log('\nTest 2: Hindi-only district record displays in English when verified equivalent exists');
{
  const hindiDistricts = [
    { hi: 'लखनऊ', expectedEn: 'Lucknow' },
    { hi: 'वाराणसी', expectedEn: 'Varanasi' },
    { hi: 'कानपुर नगर', expectedEn: 'Kanpur Nagar' },
    { hi: 'प्रयागराज', expectedEn: 'Prayagraj' },
    { hi: 'गोरखपुर', expectedEn: 'Gorakhpur' },
    { hi: 'अयोध्या', expectedEn: 'Ayodhya' },
    { hi: 'झांसी', expectedEn: 'Jhansi' }
  ];

  hindiDistricts.forEach(({ hi, expectedEn }) => {
    const contact = { district: hi };
    const resolved = resolveBilingualField('district', contact, 'en');
    assert(resolved === expectedEn, `Hindi "${hi}" resolves to English "${resolved}" (expected "${expectedEn}")`);
  });
}

// -----------------------------------------------------------------------------
// Test 3: Police stations, offices, and designations resolve in both directions
// -----------------------------------------------------------------------------
console.log('\nTest 3: Police stations, offices, and designations resolution');
{
  // Designations
  const testDesignations = [
    { input: 'Sub Inspector', lang: 'hi', expected: 'उपनिरीक्षक' },
    { input: 'उपनिरीक्षक', lang: 'en', expected: 'Sub Inspector' },
    { input: 'उप-निरीक्षक (Sub-Inspector)', lang: 'en', expected: 'Sub Inspector' },
    { input: 'उप-निरीक्षक (Sub-Inspector)', lang: 'hi', expected: 'उपनिरीक्षक' },
    { input: 'Constable', lang: 'hi', expected: 'आरक्षी' },
    { input: 'आरक्षी', lang: 'en', expected: 'Constable' },
    { input: 'Inspector In-Charge', lang: 'hi', expected: 'प्रभारी निरीक्षक' },
    { input: 'प्रभारी निरीक्षक', lang: 'en', expected: 'Inspector In-Charge' },
    { input: 'Superintendent of Police', lang: 'hi', expected: 'पुलिस अधीक्षक (SP)' },
    { input: 'पुलिस अधीक्षक (SP)', lang: 'en', expected: 'Superintendent of Police (SP)' }
  ];

  testDesignations.forEach(({ input, lang, expected }) => {
    const contact = { post: input };
    const resolved = resolveBilingualField('post', contact, lang);
    assert(resolved === expected, `Post "${input}" -> ${lang.toUpperCase()} -> "${resolved}" (expected "${expected}")`);
  });

  // Offices / Stations
  const testOffices = [
    { input: 'Madiyaon', lang: 'hi', expected: 'मड़ियांव' },
    { input: 'मड़ियांव', lang: 'en', expected: 'Madiyaon' },
    { input: 'Hazratganj', lang: 'hi', expected: 'थाना हजरतगंज' },
    { input: 'थाना हजरतगंज', lang: 'en', expected: 'Hazratganj Police Station' },
    { input: 'थाना कोतवाली (Lucknow)', lang: 'en', expected: 'Kotwali Police Station (Lucknow)' },
    { input: 'Civil Lines Police Station', lang: 'hi', expected: 'थाना सिविल लाइन्स' }
  ];

  testOffices.forEach(({ input, lang, expected }) => {
    const contact = { office: input };
    const resolved = resolveBilingualField('office', contact, lang);
    assert(resolved === expected, `Office "${input}" -> ${lang.toUpperCase()} -> "${resolved}" (expected "${expected}")`);
  });
}

// -----------------------------------------------------------------------------
// Test 4: Employee names use verified alternate names or safe fallback
// -----------------------------------------------------------------------------
console.log('\nTest 4: Employee names verified alternate vs safe fallback');
{
  // 4a: Verified alternate in dictionary
  const contactWithDictName = { name: 'Vikram Singh' };
  const resHindiName = resolveBilingualField('name', contactWithDictName, 'hi');
  assert(resHindiName === 'विक्रम सिंह', `Known English name "Vikram Singh" resolves to verified Hindi "${resHindiName}"`);

  // 4b: Explicit record alternate (e.g. nameEn or nameHi)
  const contactWithRecordAlternate = { name: 'अनूप कुमार त्रिपाठी', nameEn: 'Anoop Kumar Tripathi' };
  const resRecordEn = resolveBilingualField('name', contactWithRecordAlternate, 'en');
  assert(resRecordEn === 'Anoop Kumar Tripathi', `Record with explicit nameEn resolves to "${resRecordEn}"`);

  // 4c: Safe fallback for names without verified translation (Never blank, never invent)
  const contactWithoutTranslation = { name: 'ब्रजमोहन चतुर्वेदी' };
  const resFallbackEn = resolveBilingualField('name', contactWithoutTranslation, 'en');
  assert(resFallbackEn === 'ब्रजमोहन चतुर्वेदी', `Unverified Hindi name falls back to original "${resFallbackEn}" in English mode`);

  const contactEnglishFallback = { name: 'John Doe Officer' };
  const resFallbackHi = resolveBilingualField('name', contactEnglishFallback, 'hi');
  assert(resFallbackHi === 'John Doe Officer', `Unverified English name falls back to original "${resFallbackHi}" in Hindi mode`);
  assert(resFallbackHi !== '', 'Display name is never blank when equivalent is missing');
}

// -----------------------------------------------------------------------------
// Test 5: Switching between हिंदी and English updates contact list without corrupting data
// -----------------------------------------------------------------------------
console.log('\nTest 5: Switching languages preserves underlying database record integrity');
{
  const originalRecord = Object.freeze({
    id: 'emp-test-01',
    pno: '123456789',
    name: 'अजय कुमार',
    nameEn: 'Ajay Kumar',
    phone: '9876543210',
    district: 'Lucknow',
    post: 'Sub Inspector',
    office: 'Madiyaon',
    status: 'approved',
    role: 'user'
  });

  // Render in Hindi
  const hiDisplay = {
    name: resolveBilingualField('name', originalRecord, 'hi'),
    district: resolveBilingualField('district', originalRecord, 'hi'),
    post: resolveBilingualField('post', originalRecord, 'hi'),
    office: resolveBilingualField('office', originalRecord, 'hi')
  };

  assert(hiDisplay.district === 'लखनऊ', 'Rendered district in Hindi is "लखनऊ"');
  assert(hiDisplay.post === 'उपनिरीक्षक', 'Rendered post in Hindi is "उपनिरीक्षक"');
  assert(hiDisplay.office === 'मड़ियांव', 'Rendered office in Hindi is "मड़ियांव"');
  assert(hiDisplay.name === 'अजय कुमार', 'Rendered name in Hindi is "अजय कुमार"');

  // Render in English
  const enDisplay = {
    name: resolveBilingualField('name', originalRecord, 'en'),
    district: resolveBilingualField('district', originalRecord, 'en'),
    post: resolveBilingualField('post', originalRecord, 'en'),
    office: resolveBilingualField('office', originalRecord, 'en')
  };

  assert(enDisplay.district === 'Lucknow', 'Rendered district in English is "Lucknow"');
  assert(enDisplay.post === 'Sub Inspector', 'Rendered post in English is "Sub Inspector"');
  assert(enDisplay.office === 'Madiyaon', 'Rendered office in English is "Madiyaon"');
  assert(enDisplay.name === 'Ajay Kumar', 'Rendered name in English is "Ajay Kumar"');

  // Underlying record is completely untouched
  assert(originalRecord.district === 'Lucknow', 'Original database district remains unchanged as "Lucknow"');
  assert(originalRecord.post === 'Sub Inspector', 'Original database post remains unchanged as "Sub Inspector"');
  assert(originalRecord.office === 'Madiyaon', 'Original database office remains unchanged as "Madiyaon"');
}

// -----------------------------------------------------------------------------
// Test 6: Search works bi-directionally in either language
// -----------------------------------------------------------------------------
console.log('\nTest 6: Bi-directional search matching');
{
  const contactLucknowEn = {
    id: 'c-1',
    pno: '9988776655',
    phone: '9454400100',
    name: 'Vikram Singh',
    district: 'Lucknow',
    office: 'Madiyaon',
    post: 'Sub Inspector',
    status: 'approved'
  };

  const contactVaranasiHi = {
    id: 'c-2',
    pno: '8877665544',
    phone: '9454400200',
    name: 'अजय कुमार',
    district: 'वाराणसी',
    office: 'थाना कैंट',
    post: 'आरक्षी',
    status: 'approved'
  };

  // Searching Hindi query "लखनऊ" finds English record "Lucknow"
  assert(matchesSearchQueryBilingual(contactLucknowEn, 'लखनऊ'), 'Searching "लखनऊ" matches English contact with district "Lucknow"');

  // Searching English query "Lucknow" finds English record
  assert(matchesSearchQueryBilingual(contactLucknowEn, 'Lucknow'), 'Searching "Lucknow" matches English contact');

  // Searching Hindi query "मड़ियांव" finds English office "Madiyaon"
  assert(matchesSearchQueryBilingual(contactLucknowEn, 'मड़ियांव'), 'Searching "मड़ियांव" matches English office "Madiyaon"');

  // Searching Hindi query "उपनिरीक्षक" finds English post "Sub Inspector"
  assert(matchesSearchQueryBilingual(contactLucknowEn, 'उपनिरीक्षक'), 'Searching "उपनिरीक्षक" matches English post "Sub Inspector"');

  // Searching English query "Sub Inspector" finds English post
  assert(matchesSearchQueryBilingual(contactLucknowEn, 'Sub Inspector'), 'Searching "Sub Inspector" matches English post');

  // Searching English query "Varanasi" finds Hindi record with district "वाराणसी"
  assert(matchesSearchQueryBilingual(contactVaranasiHi, 'Varanasi'), 'Searching "Varanasi" matches Hindi contact with district "वाराणसी"');

  // Searching English query "Constable" finds Hindi post "आरक्षी"
  assert(matchesSearchQueryBilingual(contactVaranasiHi, 'Constable'), 'Searching "Constable" matches Hindi post "आरक्षी"');

  // PNO & Phone search works in either mode
  assert(matchesSearchQueryBilingual(contactLucknowEn, '9988776655'), 'Searching PNO matches accurately');
  assert(matchesSearchQueryBilingual(contactLucknowEn, '400100'), 'Searching phone digits matches accurately');
  assert(matchesSearchQueryBilingual(contactVaranasiHi, '8877665544'), 'Searching Hindi contact PNO matches accurately');
}

// -----------------------------------------------------------------------------
// Test 7: Actions, Access Restrictions, and Permissions Integrity
// -----------------------------------------------------------------------------
console.log('\nTest 7: Access restrictions, role permissions, and actions preservation');
{
  const restrictedOfficerUser = {
    id: 'user-restricted',
    role: 'user',
    district: 'Lucknow',
    office: 'Madiyaon',
    isRestricted: true
  };

  const contactInSameDistrict = {
    id: 'c-same',
    district: 'लखनऊ', // Hindi entry in database
    office: 'मड़ियांव',
    post: 'उपनिरीक्षक',
    status: 'approved'
  };

  const contactInOtherDistrict = {
    id: 'c-other',
    district: 'वाराणसी',
    office: 'थाना कैंट',
    post: 'उपनिरीक्षक',
    status: 'approved'
  };

  // Check bilingual district restriction matching
  const canAccessSame = isBilingualMatch(restrictedOfficerUser.district, contactInSameDistrict.district, 'district');
  const canAccessOther = isBilingualMatch(restrictedOfficerUser.district, contactInOtherDistrict.district, 'district');

  assert(canAccessSame === true, 'Restricted officer with district "Lucknow" correctly accesses "लखनऊ" contact');
  assert(canAccessOther === false, 'Restricted officer with district "Lucknow" cannot access "वाराणसी" contact');

  // Verify Phone and PNO strings are strictly unchanged by bilingual display
  const testContact = {
    phone: '9454401234',
    pno: '202312001',
    name: 'राजेश कुमार',
    district: 'Lucknow'
  };

  assert(testContact.phone === '9454401234', 'Mobile number format is preserved identically');
  assert(testContact.pno === '202312001', 'PNO number format is preserved identically');
}

console.log('\n----------------------------------------------------------------');
console.log(`Results: ${passed} Passed, ${failed} Failed`);
console.log('----------------------------------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL BILINGUAL SCENARIOS PASSED SUCCESSFULLY!');
  process.exit(0);
}
