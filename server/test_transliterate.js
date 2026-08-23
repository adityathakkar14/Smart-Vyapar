// Indic to English Transliterator
function transliterateIndicToEnglish(text) {
  if (!text) return '';
  if (!/[\u0A80-\u0AFF\u0900-\u097F]/.test(text)) {
    return text.replace(/\b\w/g, l => l.toUpperCase()).trim();
  }

  // Pre-replace common name suffixes & surnames
  let t = text
    .replace(/ભાઈ/g, 'bhai')
    .replace(/બેન/g, 'ben')
    .replace(/જી/g, 'ji')
    .replace(/ભાઈને/g, 'bhai')
    .replace(/બેનને/g, 'ben')
    .replace(/ભાઈ/g, 'bhai')
    .replace(/भाई/g, 'bhai')
    .replace(/जी/g, 'ji')
    .replace(/કુમાર/g, 'kumar')
    .replace(/કુમારી/g, 'kumari')
    .replace(/પટેલ/g, 'patel')
    .replace(/શાહ/g, 'shah')
    .replace(/ઠક્કર/g, 'thakkar')
    .replace(/જોશી/g, 'joshi')
    .replace(/મેહતા/g, 'mehta')
    .replace(/શર્મા/g, 'sharma')
    .replace(/વર્મા/g, 'verma')
    .replace(/સિંહ/g, 'singh')
    .replace(/ગુપ્તા/g, 'gupta');

  // Gujarati mapping
  const gujMap = {
    '\u0A85': 'a', '\u0A86': 'aa', '\u0A87': 'i', '\u0A88': 'i', '\u0A89': 'u', '\u0A8A': 'u', '\u0A8B': 'ri',
    '\u0A8F': 'e', '\u0A90': 'ai', '\u0A93': 'o', '\u0A94': 'au',
    '\u0A95': 'k', '\u0A96': 'kh', '\u0A97': 'g', '\u0A98': 'gh', '\u0A99': 'ng',
    '\u0A9A': 'ch', '\u0A9B': 'chh', '\u0A9C': 'j', '\u0A9D': 'jh', '\u0A9E': 'ny',
    '\u0A9F': 't', '\u0AA0': 'th', '\u0AA1': 'd', '\u0AA2': 'dh', '\u0AA3': 'n',
    '\u0AA4': 't', '\u0AA5': 'th', '\u0AA6': 'd', '\u0AA7': 'dh', '\u0AA8': 'n',
    '\u0AAA': 'p', '\u0AAB': 'f', '\u0AAC': 'b', '\u0AAD': 'bh', '\u0AAE': 'm',
    '\u0AAF': 'y', '\u0AB0': 'r', '\u0AB2': 'l', '\u0AB3': 'l', '\u0AB5': 'v',
    '\u0AB6': 'sh', '\u0AB7': 'sh', '\u0AB8': 's', '\u0AB9': 'h',
    '\u0ABE': 'a', '\u0ABF': 'i', '\u0AC0': 'i', '\u0AC1': 'u', '\u0AC2': 'u',
    '\u0AC3': 'ri', '\u0AC5': 'e', '\u0AC7': 'e', '\u0AC8': 'ai', '\u0AC9': 'o',
    '\u0ACB': 'o', '\u0ACC': 'au', '\u0ACD': '', '\u0A82': 'n', '\u0A83': 'h'
  };

  // Devanagari mapping
  const devMap = {
    '\u0905': 'a', '\u0906': 'aa', '\u0907': 'i', '\u0908': 'i', '\u0909': 'u', '\u090A': 'u', '\u090B': 'ri',
    '\u090F': 'e', '\u0910': 'ai', '\u0913': 'o', '\u0914': 'au',
    '\u0915': 'k', '\u0916': 'kh', '\u0917': 'g', '\u0918': 'gh', '\u0919': 'ng',
    '\u091A': 'ch', '\u091B': 'chh', '\u091C': 'j', '\u091D': 'jh', '\u091E': 'ny',
    '\u091F': 't', '\u0920': 'th', '\u0921': 'd', '\u0922': 'dh', '\u0923': 'n',
    '\u0924': 't', '\u0925': 'th', '\u0926': 'd', '\u0927': 'dh', '\u0928': 'n',
    '\u092A': 'p', '\u092B': 'f', '\u092C': 'b', '\u092D': 'bh', '\u092E': 'm',
    '\u092F': 'y', '\u0930': 'r', '\u0932': 'l', '\u0933': 'l', '\u0935': 'v',
    '\u0936': 'sh', '\u0937': 'sh', '\u0938': 's', '\u0939': 'h',
    '\u093E': 'a', '\u093F': 'i', '\u0940': 'i', '\u0941': 'u', '\u0942': 'u',
    '\u0943': 'ri', '\u0947': 'e', '\u0948': 'ai', '\u094B': 'o', '\u094C': 'au',
    '\u094D': '', '\u0902': 'n', '\u0903': 'h'
  };

  const isGujConsonant = (c) => c >= '\u0A95' && c <= '\u0AB9';
  const isDevConsonant = (c) => c >= '\u0915' && c <= '\u0939';
  const isGujMatra = (c) => (c >= '\u0ABE' && c <= '\u0ACC') || c === '\u0ACD' || c === '\u0A82';
  const isDevMatra = (c) => (c >= '\u093E' && c <= '\u094C') || c === '\u094D' || c === '\u0902';

  let result = '';
  const chars = Array.from(t);

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];

    if (gujMap[c] !== undefined) {
      result += gujMap[c];
      if (isGujConsonant(c) && next && !isGujMatra(next) && next !== ' ') {
        result += 'a';
      }
    } else if (devMap[c] !== undefined) {
      result += devMap[c];
      if (isDevConsonant(c) && next && !isDevMatra(next) && next !== ' ') {
        result += 'a';
      }
    } else {
      result += c;
    }
  }

  // Capitalize every word
  return result.replace(/\b\w/g, l => l.toUpperCase()).trim();
}

console.log("Transliteration Tests:");
console.log("રમેશભાઈ ->", transliterateIndicToEnglish("રમેશભાઈ"));
console.log("સુરેશ ->", transliterateIndicToEnglish("સુરેશ"));
console.log("પૂજા ->", transliterateIndicToEnglish("પૂજા"));
console.log("રાજેશ કુમાર ->", transliterateIndicToEnglish("રાજેશ કુમાર"));
console.log("રમેશ ભાઈ ->", transliterateIndicToEnglish("રમેશ ભાઈ"));
console.log("અમિત પટેલ ->", transliterateIndicToEnglish("અમિત પટેલ"));
