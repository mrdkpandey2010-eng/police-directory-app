import { phoneticTransliterateWord, handleTransliterateOnSpace } from '../src/utils/transliteration.js';

const tests = [
  'amit', 'kumar', 'singh', 'thana', 'hazratganj', 'lucknow', 
  'kotwali', 'daroga', 'vikram', 'sharma', 'varanasi', 'gorakhpur'
];

console.log('Testing Word Transliteration:');
tests.forEach(t => console.log(`  ${t} -> ${phoneticTransliterateWord(t)}`));

console.log('\nTesting On-Space typing transliteration:');
const step1 = handleTransliterateOnSpace('amit ', 5);
console.log('  "amit " ->', JSON.stringify(step1));

const step2 = handleTransliterateOnSpace(step1.text + 'kumar ', step1.text.length + 6);
console.log('  + "kumar " ->', JSON.stringify(step2));

const step3 = handleTransliterateOnSpace(step2.text + 'singh ', step2.text.length + 6);
console.log('  + "singh " ->', JSON.stringify(step3));

console.log('\nTesting Devanagari text remains unchanged:');
const hindiTest = handleTransliterateOnSpace('अजय कुमार ', 10);
console.log('  "अजय कुमार " ->', JSON.stringify(hindiTest));
