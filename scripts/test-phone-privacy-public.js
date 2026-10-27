import fs from 'fs';
import path from 'path';

console.log('================================================================');
console.log('🧪 PHONE PRIVACY & PUBLIC CROSS-DISTRICT ACCESS TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// Read and extract functions from src/utils/storage.js to avoid browser-specific ESM imports
const storageContent = fs.readFileSync(path.resolve('src/utils/storage.js'), 'utf-8');

// Extract isPhoneExplicitlyHidden
const isPhoneExplicitlyHiddenMatch = storageContent.match(/export const isPhoneExplicitlyHidden = ([\s\S]*?^};)/m);
if (!isPhoneExplicitlyHiddenMatch) {
  console.error('Could not find isPhoneExplicitlyHidden in storage.js');
  process.exit(1);
}
const isPhoneExplicitlyHidden = new Function('return ' + isPhoneExplicitlyHiddenMatch[1].trim())();

// Extract canViewPhoneNumber
const canViewPhoneNumberMatch = storageContent.match(/export const canViewPhoneNumber = ([\s\S]*?^};)/m);
if (!canViewPhoneNumberMatch) {
  console.error('Could not find canViewPhoneNumber in storage.js');
  process.exit(1);
}
// canViewPhoneNumber calls isPhoneExplicitlyHidden internally
const canViewPhoneNumber = new Function('isPhoneExplicitlyHidden', 'return ' + canViewPhoneNumberMatch[1].trim())(isPhoneExplicitlyHidden);

// Mock Officers
const publicOfficerLucknow = {
  id: 'pol-lucknow-1',
  pno: 'PNO10001',
  name: 'राम कुमार',
  district: 'लखनऊ',
  phone: '9876543210',
  isPhoneHidden: false // NO chosen at registration
};

const defaultOfficerVaranasi = {
  id: 'pol-varanasi-1',
  pno: 'PNO10002',
  name: 'सुरेश सिंह',
  district: 'वाराणसी',
  phone: '9876543211'
  // isPhoneHidden undefined -> defaults to NO / public
};

const hiddenOfficerKanpur = {
  id: 'pol-kanpur-1',
  pno: 'PNO10003',
  name: 'अमित वर्मा',
  district: 'कानपुर नगर',
  phone: '9876543212',
  isPhoneHidden: true // YES chosen at registration
};

const hiddenOfficerStringYes = {
  id: 'pol-agra-1',
  pno: 'PNO10004',
  name: 'दिनेश कुमार',
  district: 'आगरा',
  phone: '9876543213',
  isPhoneHidden: 'yes' // Explicit string 'yes'
};

// Mock Viewers
const viewerGorakhpur = {
  id: 'pol-gorakhpur-9',
  pno: 'PNO90001',
  name: 'राजीव यादव',
  district: 'गोरखपुर',
  role: 'user'
};

const viewerLucknowSameDistrict = {
  id: 'pol-lucknow-2',
  pno: 'PNO90002',
  name: 'विकास शर्मा',
  district: 'लखनऊ',
  role: 'user'
};

const viewerKanpurCoAdmin = {
  id: 'coadmin-kanpur',
  pno: 'PNO90003',
  name: 'कानपुर को-एडमिन',
  district: 'कानपुर नगर',
  role: 'co_admin'
};

const viewerSuperAdmin = {
  id: 'super-admin-1',
  pno: '1234',
  name: 'मुख्यालय एडमिन',
  role: 'admin'
};

console.log('▶ Test 1: Helper isPhoneExplicitlyHidden checks');
assert(!isPhoneExplicitlyHidden(publicOfficerLucknow), 'isPhoneHidden: false correctly returns false (NO)');
assert(!isPhoneExplicitlyHidden(defaultOfficerVaranasi), 'isPhoneHidden: undefined correctly returns false (NO)');
assert(!isPhoneExplicitlyHidden({ isPhoneHidden: 'no' }), 'isPhoneHidden: "no" correctly returns false (NO)');
assert(!isPhoneExplicitlyHidden({ isPhoneHidden: 0 }), 'isPhoneHidden: 0 correctly returns false (NO)');
assert(isPhoneExplicitlyHidden(hiddenOfficerKanpur), 'isPhoneHidden: true correctly returns true (YES)');
assert(isPhoneExplicitlyHidden(hiddenOfficerStringYes), 'isPhoneHidden: "yes" correctly returns true (YES)');
assert(isPhoneExplicitlyHidden({ isPhoneHidden: 'हाँ' }), 'isPhoneHidden: "हाँ" correctly returns true (YES)');

console.log('\n▶ Test 2: Officers with isPhoneHidden = NO are 100% PUBLIC across ALL districts');
assert(
  canViewPhoneNumber(viewerGorakhpur, publicOfficerLucknow) === true,
  'Gorakhpur user can directly view Lucknow officer phone without request'
);
assert(
  canViewPhoneNumber(viewerGorakhpur, defaultOfficerVaranasi) === true,
  'Gorakhpur user can directly view Varanasi officer phone without request (undefined = NO)'
);
assert(
  canViewPhoneNumber(viewerLucknowSameDistrict, publicOfficerLucknow) === true,
  'Same district (Lucknow) user can directly view Lucknow officer phone'
);
assert(
  canViewPhoneNumber(null, publicOfficerLucknow) === true,
  'Unauthenticated guest can view public officer phone'
);

console.log('\n▶ Test 3: Officers with isPhoneHidden = YES remain confidential and require permissions');
assert(
  canViewPhoneNumber(viewerGorakhpur, hiddenOfficerKanpur) === false,
  'Cross-district (Gorakhpur) user CANNOT view hidden Kanpur officer without approved permission'
);
assert(
  canViewPhoneNumber(viewerLucknowSameDistrict, hiddenOfficerKanpur) === false,
  'Cross-district (Lucknow) user CANNOT view hidden Kanpur officer without approved permission'
);
assert(
  canViewPhoneNumber(null, hiddenOfficerKanpur) === false,
  'Unauthenticated guest CANNOT view hidden Kanpur officer'
);

console.log('\n▶ Test 4: Special Roles & Approvals for isPhoneHidden = YES');
assert(
  canViewPhoneNumber(viewerSuperAdmin, hiddenOfficerKanpur) === true,
  'Super Admin can view hidden Kanpur officer'
);
assert(
  canViewPhoneNumber(viewerKanpurCoAdmin, hiddenOfficerKanpur) === true,
  'Kanpur Co-Admin can view hidden Kanpur officer in their district'
);
assert(
  canViewPhoneNumber(hiddenOfficerKanpur, hiddenOfficerKanpur) === true,
  'Officer can view their own hidden phone number'
);

// With approved permission
const approvedPerm = [
  {
    id: 'perm-1',
    requesterId: viewerGorakhpur.id,
    targetId: hiddenOfficerKanpur.id,
    status: 'approved'
  }
];
assert(
  canViewPhoneNumber(viewerGorakhpur, hiddenOfficerKanpur, approvedPerm) === true,
  'Cross-district user WITH approved permission can view hidden Kanpur officer'
);

// With pending permission (not approved yet)
const pendingPerm = [
  {
    id: 'perm-2',
    requesterId: viewerGorakhpur.id,
    targetId: hiddenOfficerStringYes.id,
    status: 'pending'
  }
];
assert(
  canViewPhoneNumber(viewerGorakhpur, hiddenOfficerStringYes, pendingPerm) === false,
  'Cross-district user with PENDING permission CANNOT view hidden Agra officer'
);

console.log('\n================================================================');
console.log(`TOTAL RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
