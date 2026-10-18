import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transliterateWord, transliterateText, handleTransliterateOnSpace } from '../src/utils/transliteration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

console.log('================================================================');
console.log('🧪 MASTER PROMPT VERIFICATION TEST SUITE (10 SCENARIOS)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Scenario 1: English/Hinglish word + Space converts immediately to Hindi
// -----------------------------------------------------------------------------
console.log('▶ Scenario 1: English/Hinglish word + Space converts immediately to Hindi in text fields');
{
  const res1 = transliterateWord('amit');
  assert(res1 === 'अमित', `Word 'amit' transliterates to 'अमित' (got: '${res1}')`);

  const res2 = transliterateWord('kumar');
  assert(res2 === 'कुमार', `Word 'kumar' transliterates to 'कुमार' (got: '${res2}')`);

  const res3 = transliterateWord('singh');
  assert(res3 === 'सिंह', `Word 'singh' transliterates to 'सिंह' (got: '${res3}')`);

  const res4 = transliterateWord('thana');
  assert(res4 === 'थाना', `Word 'thana' transliterates to 'थाना' (got: '${res4}')`);

  const res5 = transliterateWord('hazratganj');
  assert(res5 === 'हजरतगंज', `Word 'hazratganj' transliterates to 'हजरतगंज' (got: '${res5}')`);
}

// -----------------------------------------------------------------------------
// Scenario 2: Space is kept after transliteration, allowing smooth typing
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 2: Trailing Space is preserved after transliteration');
{
  // Simulated typing: user had "अमित " and types "kumar "
  const val = 'अमित kumar ';
  const cursor = 11;
  const result = handleTransliterateOnSpace(val, cursor);
  assert(result.changed === true, 'Transliteration triggered on space');
  assert(result.text === 'अमित कुमार ', `Result keeps trailing space (got: '${result.text}')`);
  assert(result.cursor === result.text.length, `Cursor positioned at end of space (${result.cursor})`);
}

// -----------------------------------------------------------------------------
// Scenario 3: Already Hindi text is preserved without double conversion
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 3: Already Hindi text is preserved without changes');
{
  const valHindi = 'अमित कुमार ';
  const cursorHindi = 11;
  const resultHindi = handleTransliterateOnSpace(valHindi, cursorHindi);
  assert(resultHindi.changed === false, 'Devanagari text does not re-trigger transliteration');
  assert(resultHindi.text === 'अमित कुमार ', `Text unmodified: '${resultHindi.text}'`);
}


// -----------------------------------------------------------------------------
// Scenario 4: Non-transliterated fields (pno, phone, password) are strictly excluded
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 4: Non-transliterated fields are excluded in RegistrationModal.jsx');
{
  const regModalPath = path.join(rootDir, 'src', 'components', 'RegistrationModal.jsx');
  const regCode = fs.readFileSync(regModalPath, 'utf8');

  // Check that password, phone, pno, email, whatsapp use standard handleChange
  assert(/name="pno"[\s\S]*?onChange=\{handleChange\}/.test(regCode), 'PNO input uses standard handleChange');
  assert(/name="phone"[\s\S]*?onChange=\{handleChange\}/.test(regCode), 'Phone input uses standard handleChange');
  assert(/name="password"[\s\S]*?onChange=\{handleChange\}/.test(regCode), 'Password input uses standard handleChange');
  assert(/name="whatsapp"[\s\S]*?onChange=\{handleChange\}/.test(regCode), 'WhatsApp input uses standard handleChange');
  assert(/name="email"[\s\S]*?onChange=\{handleChange\}/.test(regCode), 'Email input uses standard handleChange');

  // Check that name, office, registrationNotes use transliteration handler
  assert(/name="name"[\s\S]*?handleTransliteratedFieldChange/.test(regCode), 'Name input uses handleTransliteratedFieldChange');
  assert(/name="office"[\s\S]*?handleTransliteratedFieldChange/.test(regCode), 'Office input uses handleTransliteratedFieldChange');
  assert(/name="registrationNotes"[\s\S]*?handleTransliteratedFieldChange/.test(regCode), 'Notes input uses handleTransliteratedFieldChange');
}

// -----------------------------------------------------------------------------
// Scenario 5: Home Page Hindi/English Toggle is small and prevents header wrap
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 5: Language selector compactness & nowrap header');
{
  const headerPath = path.join(rootDir, 'src', 'components', 'Header.jsx');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  const cssPath = path.join(rootDir, 'src', 'index.css');
  const cssCode = fs.readFileSync(cssPath, 'utf8');

  assert(headerCode.includes('padding: \'2px 5px\'') || headerCode.includes('padding: "2px 5px"'), 'Language toggle has compact padding (2px 5px)');
  assert(headerCode.includes('fontSize: \'0.66rem\'') || headerCode.includes('fontSize: "0.66rem"'), 'Language toggle has compact font size (0.66rem)');
  assert(cssCode.includes('flex-wrap: nowrap !important') || headerCode.includes('flexWrap: \'nowrap\''), 'Header actions container enforces nowrap to prevent icon wrapping');
}

// -----------------------------------------------------------------------------
// Scenario 6: Profile Icon & Right-Side Popup
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 6: Profile popup alignment and viewport bounds');
{
  const headerPath = path.join(rootDir, 'src', 'components', 'Header.jsx');
  const headerCode = fs.readFileSync(headerPath, 'utf8');

  assert(headerCode.includes('right: 0') || headerCode.includes('right: \'0\''), 'Profile popup aligned to the right (right: 0)');
  assert(headerCode.includes('maxWidth: \'calc(100vw - 16px)\'') || headerCode.includes('maxWidth: "calc(100vw - 16px)"'), 'Profile popup has viewport-safe maxWidth (calc(100vw - 16px))');
  assert(headerCode.includes('zIndex: 10050'), 'Profile popup has high z-index (10050) above headers');
}

// -----------------------------------------------------------------------------
// Scenario 7: Login Screen — Centered Police Emblem Logo
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 7: Login screen logo placement and styling');
{
  const loginPath = path.join(rootDir, 'src', 'components', 'LoginModal.jsx');
  const loginCode = fs.readFileSync(loginPath, 'utf8');

  assert(loginCode.includes('src="/police-logo.png"') || loginCode.includes('src={\'/police-logo.png\'}'), 'LoginModal renders /police-logo.png');
  assert(loginCode.includes('objectFit: \'contain\'') || loginCode.includes('objectFit: "contain"'), 'Logo uses objectFit: contain');
  assert(loginCode.includes('justifyContent: \'center\''), 'Logo container is centered horizontally');
  assert(fs.existsSync(path.join(rootDir, 'public', 'police-logo.png')), 'public/police-logo.png exists in project');
}

// -----------------------------------------------------------------------------
// Scenario 8: Footer links moved to Login Screen
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 8: Footer policy link removed from TermsFooter and added to LoginModal');
{
  const footerPath = path.join(rootDir, 'src', 'components', 'TermsFooter.jsx');
  const footerCode = fs.readFileSync(footerPath, 'utf8');
  const loginPath = path.join(rootDir, 'src', 'components', 'LoginModal.jsx');
  const loginCode = fs.readFileSync(loginPath, 'utf8');

  assert(!footerCode.includes('नियम व नीतियां देखने के लिए यहाँ क्लिक करें'), 'TermsFooter does not contain the policy navigation button');
  assert(footerCode.includes('उत्तर प्रदेश पुलिस मुख्यालय, लखनऊ'), 'TermsFooter retains statutory and copyright notice');
  assert(loginCode.includes('onOpenPolicy'), 'LoginModal supports onOpenPolicy prop');
  assert(loginCode.includes('शासकीय नियम, गोपनीयता नीति एवं सेवा शर्तें'), 'LoginModal has subdued policy link at bottom');
}

// -----------------------------------------------------------------------------
// Scenario 9: Mobile Browser & Hardware Back Button Navigation
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 9: Mobile browser popstate and hardware back navigation');
{
  const appPath = path.join(rootDir, 'src', 'App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');

  assert(appCode.includes('window.addEventListener(\'popstate\','), 'App.jsx listens to browser popstate event for mobile back');
  assert(appCode.includes('window.history.pushState({ modalOpen: true }, \'\')'), 'App.jsx pushes history state when modal opens');
  assert(appCode.includes('setupHardwareBackButton'), 'App.jsx hooks Capacitor native Android hardware back button');

  // Verify modal priority order in backHandlerRef: Modals must be checked before active filters
  const backHandlerIdx = appCode.indexOf('backHandlerRef.current = () => {');
  const profileCheckIdx = appCode.indexOf('if (isProfileModalOpen)', backHandlerIdx);
  const filterCheckIdx = appCode.indexOf('if (hasActiveFilters)', backHandlerIdx);

  assert(profileCheckIdx > 0 && filterCheckIdx > 0, 'Both modal and filter checks exist in backHandlerRef');
  assert(profileCheckIdx < filterCheckIdx, 'Modals are closed BEFORE filters are reset on back press');
}

// -----------------------------------------------------------------------------
// Scenario 10: Contact List — 50 Contacts Per Page with Pagination Controls
// -----------------------------------------------------------------------------
console.log('\n▶ Scenario 10: 50 Contacts per page pagination');
{
  const appPath = path.join(rootDir, 'src', 'App.jsx');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const listPath = path.join(rootDir, 'src', 'components', 'ContactList.jsx');
  const listCode = fs.readFileSync(listPath, 'utf8');

  assert(appCode.includes('CONTACTS_PER_PAGE = 50'), 'App.jsx defines CONTACTS_PER_PAGE = 50');
  assert(appCode.includes('currentPage, setCurrentPage'), 'App.jsx maintains currentPage state');
  assert(appCode.includes('setCurrentPage(1);'), 'App.jsx resets currentPage to 1 on filter/search change');
  assert(appCode.includes('totalPages = Math.max(1, Math.ceil(filteredContacts.length / CONTACTS_PER_PAGE))'), 'App.jsx calculates totalPages correctly');

  assert(listCode.includes('pageSize = 50'), 'ContactList defaults pageSize to 50');
  assert(listCode.includes('pagination-controls'), 'ContactList renders pagination-controls when totalPages > 1');
  assert(listCode.includes('disabled={currentPage <= 1}'), 'Previous button disabled on first page');
  assert(listCode.includes('disabled={currentPage >= totalPages}'), 'Next button disabled on last page');
  assert(listCode.includes('scrollIntoView({ behavior: \'smooth\''), 'Smooth scrolling executed when changing page');
}

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
