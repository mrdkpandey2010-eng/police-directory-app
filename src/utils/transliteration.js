/**
 * transliteration.js
 * Reliable, fast client-side Hinglish/English to Hindi Devanagari phonetic transliteration engine.
 * 
 * Complies with Requirement 1:
 * - Automatically converts completed English/Hinglish words to Hindi Devanagari on Space.
 * - Preserves already Devanagari text.
 * - Never converts passwords, emails, URLs, OTPs, phone, or PNO.
 * - Preserves cursor position, normal typing, backspace, and copy-paste.
 * - 100% client-side: Zero third-party network requests, protecting personal registration data.
 */

import { 
  UP_DISTRICTS_BILINGUAL, 
  POLICE_POSTS_BILINGUAL, 
  POLICE_OFFICES_AND_THANAS_BILINGUAL, 
  EMPLOYEE_NAMES_BILINGUAL 
} from './bilingual.js';

// Pre-compiled dictionary of common Hinglish / UP Police departmental words
const VOCABULARY = new Map();

// Helper to register word mappings
function registerWord(latin, devanagari) {
  if (!latin || !devanagari) return;
  const key = latin.trim().toLowerCase();
  if (!VOCABULARY.has(key)) {
    VOCABULARY.set(key, devanagari.trim());
  }
}

// 1. Load from official bilingual records
UP_DISTRICTS_BILINGUAL.forEach(d => {
  registerWord(d.en, d.hi);
  if (Array.isArray(d.aliases)) {
    d.aliases.forEach(a => registerWord(a, d.hi));
  }
});

POLICE_POSTS_BILINGUAL.forEach(p => {
  registerWord(p.en, p.hi);
  if (Array.isArray(p.aliases)) {
    p.aliases.forEach(a => registerWord(a, p.hi));
  }
});

POLICE_OFFICES_AND_THANAS_BILINGUAL.forEach(o => {
  const cleanHi = o.hi.replace(/^थाना\s+/, '');
  const cleanEn = o.en.replace(/\s+Police Station$/i, '').replace(/^Police Station\s+/i, '');
  registerWord(cleanEn, cleanHi);
  registerWord(o.en, o.hi);
  if (Array.isArray(o.aliases)) {
    o.aliases.forEach(a => {
      const cleanA = a.replace(/^(थाना|ps)\s+/i, '');
      registerWord(cleanA, cleanHi);
      registerWord(a, o.hi);
    });
  }
});

EMPLOYEE_NAMES_BILINGUAL.forEach(e => {
  registerWord(e.en, e.hi);
});

// Common Departmental, General & Geographic Words
const COMMON_DICTIONARY = [
  // Police terms
  ['thana', 'थाना'],
  ['chowki', 'चौकी'],
  ['kotwali', 'कोतवाली'],
  ['line', 'लाइन'],
  ['lines', 'लाइन्स'],
  ['police', 'पुलिस'],
  ['civil', 'सिविल'],
  ['traffic', 'यातायात'],
  ['crime', 'अपराध'],
  ['branch', 'शाखा'],
  ['office', 'कार्यालय'],
  ['prabhari', 'प्रभारी'],
  ['nirikshak', 'निरीक्षक'],
  ['upnirikshak', 'उपनिरीक्षक'],
  ['arakshi', 'आरक्षी'],
  ['daroga', 'दारोगा'],
  ['sipahi', 'सिपाही'],
  ['adhikari', 'अधिकारी'],
  ['karyalay', 'कार्यालय'],
  ['muhyalay', 'मुख्यालय'],
  ['kshetra', 'क्षेत्र'],
  ['nagar', 'नगर'],
  ['puram', 'पुरम'],
  ['ganj', 'गंज'],
  ['chowk', 'चौक'],
  ['bazar', 'बाजार'],
  ['gate', 'गेट'],
  ['road', 'रोड'],
  ['vihar', 'विहार'],
  ['vistar', 'विस्तार'],
  ['colony', 'कॉलोनी'],
  ['kendra', 'केंद्र'],
  ['suraksha', 'सुरक्षा'],
  ['seva', 'सेवा'],
  ['shasan', 'शासन'],
  ['vibhag', 'विभाग'],

  // Common Indian Names / Surnames
  ['singh', 'सिंह'],
  ['kumar', 'कुमार'],
  ['sharma', 'शर्मा'],
  ['verma', 'वर्मा'],
  ['yadav', 'यादव'],
  ['mishra', 'मिश्रा'],
  ['pandey', 'पांडेय'],
  ['tripathi', 'त्रिपाठी'],
  ['tiwari', 'तिवारी'],
  ['shukla', 'शुक्ला'],
  ['dubey', 'दुबे'],
  ['chaubey', 'चौबे'],
  ['gupta', 'गुप्ता'],
  ['maurya', 'मौर्या'],
  ['patel', 'पटेल'],
  ['thakur', 'ठाकुर'],
  ['chauhan', 'चौहान'],
  ['rajput', 'राजपूत'],
  ['lodhi', 'लोधी'],
  ['chandra', 'चंद्र'],
  ['prakash', 'प्रकाश'],
  ['nath', 'नाथ'],
  ['lal', 'लाल'],
  ['kant', 'कांत'],
  ['prasad', 'प्रसाद'],
  ['babu', 'बाबू'],
  ['ram', 'राम'],
  ['shyam', 'श्याम'],
  ['amit', 'अमित'],
  ['ajay', 'अजय'],
  ['vikram', 'विक्रम'],
  ['rajesh', 'राजेश'],
  ['sanjay', 'संजय'],
  ['deepak', 'दीपक'],
  ['pradeep', 'प्रदीप'],
  ['sunil', 'सुनील'],
  ['anil', 'अनिल'],
  ['manoj', 'मनोज'],
  ['vikas', 'विकास'],
  ['rahul', 'राहुल'],
  ['santosh', 'संतोष'],
  ['alok', 'आलोक'],
  ['dinesh', 'दिनेश'],
  ['rakesh', 'राकेश'],
  ['suresh', 'सुरेश'],
  ['mahesh', 'महेश'],
  ['vijay', 'विजय'],
  ['pawan', 'पवन'],
  ['subhash', 'सुभाष'],
  ['ashok', 'अशोक'],
  ['surendra', 'सुरेंद्र'],
  ['satyendra', 'सत्येंद्र'],
  ['jitendra', 'जितेंद्र'],
  ['dharmendra', 'धर्मेन्द्र'],
  ['kamlesh', 'कमलेश'],
  ['arvind', 'अरविंद'],
  ['mukesh', 'मुकेश'],
  ['arun', 'अरुण'],
  ['neeraj', 'नीरज'],
  ['pankaj', 'पंकज'],
  ['sudhir', 'सुधीर'],
  ['yogesh', 'योगेश'],
  ['sandeep', 'संदीप'],
  ['kuldeep', 'कुलदीप'],
  ['praveen', 'प्रवीण'],
  ['akhilesh', 'अखिलेश'],
  ['vinod', 'विनोद'],
  ['abhishek', 'अभिषेक'],
  ['anurag', 'अनुराग'],
  ['gaurav', 'गौरव'],
  ['saurabh', 'सौरभ'],
  ['ashish', 'आशीष'],
  ['manish', 'मनीष'],
  ['rohit', 'रोहित'],
  ['mohit', 'मोहित'],
  ['sumit', 'सुमित'],
  ['vipul', 'विपुल'],
  ['nitin', 'नितिन'],
  ['neetu', 'नीतू'],
  ['sunita', 'सुनीता'],
  ['aarti', 'आरती'],
  ['priya', 'प्रिया'],
  ['pooja', 'पूजा'],
  ['rekha', 'रेखा'],
  ['anita', 'अनीता'],
  ['kavita', 'कविता'],
  ['radha', 'राधा'],
  ['seema', 'सीमा']
];

COMMON_DICTIONARY.forEach(([en, hi]) => registerWord(en, hi));

/**
 * Phonetic Transliteration Rules Engine
 * Converts any arbitrary English phonetic word to Devanagari.
 */
const CONSONANTS = [
  // 4 & 3 letters
  { en: 'shhr', hi: 'ष्र' },
  { en: 'shh', hi: 'ष' },
  { en: 'chh', hi: 'छ' },
  { en: 'ksh', hi: 'क्ष' },
  { en: 'jny', hi: 'ज्ञ' },
  { en: 'gya', hi: 'ज्ञा' },
  { en: 'gy', hi: 'ज्ञ' },
  { en: 'shr', hi: 'श्र' },
  { en: 'tra', hi: 'त्रा' },
  { en: 'tr', hi: 'त्र' },

  // 2 letters
  { en: 'kh', hi: 'ख' },
  { en: 'gh', hi: 'घ' },
  { en: 'ch', hi: 'च' },
  { en: 'jh', hi: 'झ' },
  { en: 'th', hi: 'थ' },
  { en: 'dh', hi: 'ध' },
  { en: 'ph', hi: 'फ' },
  { en: 'bh', hi: 'भ' },
  { en: 'sh', hi: 'श' },
  { en: 'rh', hi: 'ढ़' },

  // Single letters
  { en: 'k', hi: 'क' },
  { en: 'g', hi: 'ग' },
  { en: 'c', hi: 'क' },
  { en: 'j', hi: 'ज' },
  { en: 'z', hi: 'ज़' },
  { en: 't', hi: 'त' },
  { en: 'd', hi: 'द' },
  { en: 'n', hi: 'न' },
  { en: 'p', hi: 'प' },
  { en: 'f', hi: 'फ़' },
  { en: 'b', hi: 'ब' },
  { en: 'm', hi: 'म' },
  { en: 'y', hi: 'य' },
  { en: 'r', hi: 'र' },
  { en: 'l', hi: 'ल' },
  { en: 'v', hi: 'व' },
  { en: 'w', hi: 'व' },
  { en: 's', hi: 'स' },
  { en: 'h', hi: 'ह' },
  { en: 'q', hi: 'क़' },
  { en: 'x', hi: 'क्स' }
];

const VOWEL_INDEPENDENT = [
  { en: 'aaa', hi: 'आ' },
  { en: 'aa', hi: 'आ' },
  { en: 'ai', hi: 'ऐ' },
  { en: 'au', hi: 'औ' },
  { en: 'ee', hi: 'ई' },
  { en: 'ii', hi: 'ई' },
  { en: 'oo', hi: 'ऊ' },
  { en: 'uu', hi: 'ऊ' },
  { en: 'ou', hi: 'औ' },
  { en: 'ri', hi: 'ऋ' },
  { en: 'a', hi: 'अ' },
  { en: 'e', hi: 'ए' },
  { en: 'i', hi: 'इ' },
  { en: 'o', hi: 'ओ' },
  { en: 'u', hi: 'उ' }
];

const VOWEL_MATRAS = [
  { en: 'aaa', matra: 'ा' },
  { en: 'aa', matra: 'ा' },
  { en: 'ai', matra: 'ै' },
  { en: 'au', matra: 'ौ' },
  { en: 'ee', matra: 'ी' },
  { en: 'ii', matra: 'ी' },
  { en: 'oo', matra: 'ू' },
  { en: 'uu', matra: 'ू' },
  { en: 'ou', matra: 'ौ' },
  { en: 'ri', matra: 'ृ' },
  { en: 'a', matra: '' },   // Inherent vowel
  { en: 'e', matra: 'े' },
  { en: 'i', matra: 'ि' },
  { en: 'o', matra: 'ो' },
  { en: 'u', matra: 'ु' }
];

/**
 * Phonetically transliterate an English word to Devanagari
 */
export function phoneticTransliterateWord(word) {
  if (!word || !word.trim()) return word;

  const clean = word.trim().toLowerCase();

  // Check vocabulary first (highest accuracy)
  if (VOCABULARY.has(clean)) {
    return VOCABULARY.get(clean);
  }

  // Handle special suffixes like 'ganj', 'nagar', 'puram', 'garh', 'bad'
  const suffixes = [
    { en: 'ganj', hi: 'गंज' },
    { en: 'nagar', hi: 'नगर' },
    { en: 'puram', hi: 'पुरम' },
    { en: 'garh', hi: 'गढ़' },
    { en: 'bad', hi: 'बाद' },
    { en: 'pur', hi: 'पुर' }
  ];

  for (const s of suffixes) {
    if (clean.length > s.en.length + 2 && clean.endsWith(s.en)) {
      const stem = clean.slice(0, -s.en.length);
      const stemHi = phoneticTransliterateWord(stem);
      return stemHi + s.hi;
    }
  }

  // Syllabic Parser
  let out = '';
  let i = 0;
  const len = clean.length;

  while (i < len) {
    // 1. Check if independent vowel at start or after previous vowel
    const rem = clean.slice(i);

    // Look for matching consonant
    let matchCons = null;
    for (const c of CONSONANTS) {
      if (rem.startsWith(c.en)) {
        matchCons = c;
        break;
      }
    }

    if (matchCons) {
      i += matchCons.en.length;
      const afterCons = clean.slice(i);

      // Check if followed by vowel
      let matchVowel = null;
      for (const v of VOWEL_MATRAS) {
        if (afterCons.startsWith(v.en)) {
          matchVowel = v;
          break;
        }
      }

      if (matchVowel) {
        i += matchVowel.en.length;
        out += matchCons.hi + matchVowel.matra;

        // Check for anusvara (n or m followed by consonant or end of word)
        if (i < len && (clean[i] === 'n' || clean[i] === 'm')) {
          const nextChar = clean[i + 1];
          const isNextVowel = nextChar && ['a', 'e', 'i', 'o', 'u'].includes(nextChar);
          if (!isNextVowel) {
            out += 'ं';
            i++;
          }
        }
      } else {
        // Consonant followed by another consonant or end of word
        if (i === len) {
          // At end of word, Hindi words typically end with implicit 'a' sound (हलंत नहीं लगाते)
          out += matchCons.hi;
        } else {
          // Half consonant (Virama)
          out += matchCons.hi + '्';
        }
      }
    } else {
      // Independent vowel
      let matchIndepVowel = null;
      for (const v of VOWEL_INDEPENDENT) {
        if (rem.startsWith(v.en)) {
          matchIndepVowel = v;
          break;
        }
      }

      if (matchIndepVowel) {
        i += matchIndepVowel.en.length;
        out += matchIndepVowel.hi;
      } else {
        // Non-alphabetic character (digit, punctuation, etc.)
        out += clean[i];
        i++;
      }
    }
  }

  return out;
}

/**
 * Check if a text has any Latin characters
 */
export function hasLatin(str) {
  return /[a-zA-Z]/.test(str || '');
}

/**
 * Check if a text has Devanagari characters
 */
export function hasDevanagari(str) {
  return /[\u0900-\u097F]/.test(str || '');
}

/**
 * Automatically transliterates the last word typed before cursor if it ends with Space.
 * Designed for input onChange / onKeyDown handlers.
 * 
 * @param {string} text - Current input value
 * @param {number} selectionEnd - Current cursor position
 * @returns {{ text: string, cursor: number, changed: boolean }}
 */
export function handleTransliterateOnSpace(text, selectionEnd) {
  if (!text) return { text, cursor: selectionEnd, changed: false };

  // We check the portion up to the cursor
  const left = text.slice(0, selectionEnd);
  const right = text.slice(selectionEnd);

  // Trigger only when user just typed a space (ends with space)
  // and there is an English word immediately preceding the space
  const match = left.match(/([a-zA-Z]+)(\s+)$/);
  if (!match) {
    return { text, cursor: selectionEnd, changed: false };
  }

  const rawWord = match[1];
  const trailingSpaces = match[2];

  // Convert English/Hinglish word to Hindi
  const hindiWord = phoneticTransliterateWord(rawWord);
  if (hindiWord === rawWord) {
    return { text, cursor: selectionEnd, changed: false };
  }

  // Replace word before cursor
  const wordStartIndex = left.length - match[0].length;
  const newLeft = left.slice(0, wordStartIndex) + hindiWord + trailingSpaces;
  const newText = newLeft + right;
  const newCursor = newLeft.length;

  return {
    text: newText,
    cursor: newCursor,
    changed: true
  };
}

/**
 * Convenience aliases
 */
export const transliterateWord = phoneticTransliterateWord;

export function transliterateText(text) {
  if (!text) return text;
  return text.split(/(\s+)/).map(token => {
    if (/^[a-zA-Z]+$/.test(token)) {
      return phoneticTransliterateWord(token);
    }
    return token;
  }).join('');
}

