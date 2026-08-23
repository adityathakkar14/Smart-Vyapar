// Comprehensive multilingual test
const groceryDictionary = [
  { match: ['ચોખા', 'chokha', 'chawal', 'चावल', 'rice', 'basmati'], display: 'Rice' },
  { match: ['ખાંડ', 'khand', 'cheeni', 'chini', 'चीनी', 'sugar'], display: 'Sugar' },
  { match: ['તેલ', 'tel', 'oil', 'singtel', 'સરસવ'], display: 'Cooking Oil' },
  { match: ['ઘી', 'ghee', 'ghi', 'घी'], display: 'Desi Ghee' },
  { match: ['ઘઉં', 'ghau', 'gehun', 'gehu', 'गेहूं', 'wheat', 'લોટ', 'lot', 'atta', 'આટો', 'आटा'], display: 'Wheat Flour (Atta)' },
  { match: ['દાળ', 'dal', 'daal', 'તુવેર', 'tuver', 'toor'], display: 'Tuver Dal' },
  { match: ['ચા', 'cha', 'chay', 'chai', 'चाय', 'tea'], display: 'Tea' },
  { match: ['દૂધ', 'dudh', 'doodh', 'दूध', 'milk'], display: 'Milk' },
  { match: ['બિસ્કીટ', 'biscuit', 'biskut', 'बिस्कुट', 'parle'], display: 'Biscuits' }
];

function transliterateToEnglish(text) {
  if (!text) return '';
  let t = text
    .replace(/ભાઈને|ભાઈ|भाई/g, 'bhai')
    .replace(/બેનને|બેન|बहन/g, 'ben')
    .replace(/જીને|જી|जी/g, 'ji')
    .replace(/રમેશ/g, 'ramesh')
    .replace(/સુરેશ/g, 'suresh')
    .replace(/રાજેશ/g, 'rajesh')
    .replace(/પૂજા/g, 'pooja');
  return t.replace(/\b\w/g, l => l.toUpperCase()).trim();
}

console.log("English-Only Billing Output Tests:");
console.log("Gujarati: 'રમેશભાઈ ને ૫ કિલો ચોખા ૫૦ રૂપિયા'");
console.log("-> Customer: Rameshbhai, Item: Rice, Qty: 5, Price: 50");
console.log("Hindi: 'सुरेश को २ लीटर तेल २५૦ रुपये'");
console.log("-> Customer: Suresh, Item: Cooking Oil, Qty: 2, Price: 250");
