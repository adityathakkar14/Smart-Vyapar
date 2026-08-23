function normalizeDigits(text) {
  const gujaratiDigits = {'૦':'0','૧':'1','૨':'2','૩':'3','૪':'4','૫':'5','૬':'6','૭':'7','૮':'8','૯':'9'};
  const devanagariDigits = {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'};
  
  let normalized = text;
  for (const [g, d] of Object.entries(gujaratiDigits)) {
    normalized = normalized.split(g).join(d);
  }
  for (const [dev, d] of Object.entries(devanagariDigits)) {
    normalized = normalized.split(dev).join(d);
  }
  return normalized;
}

const numberWords = {
  // Gujarati
  'અડધો': '0.5', 'અડધી': '0.5', 'એક': '1', 'બે': '2', 'ત્રણ': '3', 'ચાર': '4', 'પાંચ': '5', 'છ': '6', 'સાત': '7', 'આઠ': '8', 'નવ': '9', 'દસ': '10',
  'અગિયાર': '11', 'બાર': '12', 'તેર': '13', 'ચૌદ': '14', 'પંદર': '15', 'સોળ': '16', 'સત્તર': '17', 'અઢાર': '18', 'ઓગણીસ': '19', 'વીસ': '20',
  'પચ્ચીસ': '25', 'ત્રીસ': '30', 'ચાલીસ': '40', 'પચાસ': '50', 'સાઠ': '60', 'સિત્તેર': '70', 'એંસી': '80', 'નેવું': '90', 'સો': '100', 'બસો': '200', 'પાંચસો': '500',
  // Hindi
  'आधा': '0.5', 'आधी': '0.5', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
  'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19', 'बीस': '20',
  'पच्चीस': '25', 'तीस': '30', 'चालीस': '40', 'पचास': '50', 'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90', 'सौ': '100', 'दो सौ': '200', 'पांच सौ': '500',
  // Hinglish / Gujlish
  'adha': '0.5', 'aadha': '0.5', 'ek': '1', 'be': '2', 'do': '2', 'tran': '3', 'teen': '3', 'tin': '3', 'char': '4', 'chaar': '4',
  'panch': '5', 'paanch': '5', 'chhe': '6', 'chha': '6', 'sat': '7', 'saat': '7', 'aath': '8', 'ath': '8', 'nau': '9', 'nav': '9', 'das': '10',
  'pandar': '15', 'pandrah': '15', 'vis': '20', 'bees': '20', 'pachis': '25', 'pachchis': '25', 'tris': '30', 'tees': '30', 'chalis': '40',
  'pachas': '50', 'so': '100', 'sau': '100',
  // English
  'half': '0.5', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'fifteen': '15', 'twenty': '20', 'twenty five': '25', 'thirty': '30', 'forty': '40', 'fifty': '50', 'hundred': '100'
};

const groceryDictionary = [
  { match: ['ચોખા', 'chokha', 'chawal', 'चावल', 'rice', 'basmati', 'બાસમતી'], display: 'Rice (ચોખા)' },
  { match: ['ખાંડ', 'khand', 'cheeni', 'chini', 'चीनी', 'sugar', 'શક્કર'], display: 'Sugar (ખાંડ)' },
  { match: ['તેલ', 'tel', 'oil', 'singtel', 'સીંગતેલ', 'સરસવ', 'sarson'], display: 'Cooking Oil (તેલ)' },
  { match: ['ઘી', 'ghee', 'ghi', 'घी', 'desighee'], display: 'Ghee (ઘી)' },
  { match: ['ઘઉં', 'ghau', 'gehun', 'gehu', 'गेहूं', 'wheat', 'લોટ', 'lot', 'atta', 'આટો', 'आटा'], display: 'Wheat / Atta (ઘઉંનો લોટ)' },
  { match: ['દાળ', 'dal', 'daal', 'દાલ', 'दाल', 'તુવેર', 'tuver', 'toor', 'arhar', 'અરહર'], display: 'Tuver Dal (તુવેર દાળ)' },
  { match: ['મગ', 'moong', 'mung', 'मूंग'], display: 'Moong (મગ)' },
  { match: ['ચણા', 'chana', 'chane', 'चना', 'chole', 'છોલે'], display: 'Chana (ચણા)' },
  { match: ['અડદ', 'urad', 'udad', 'उड़द'], display: 'Urad Dal (અડદ દાળ)' },
  { match: ['ચા', 'cha', 'chay', 'chai', 'चाय', 'tea', 'પત્તી', 'patti'], display: 'Tea (ચા)' },
  { match: ['કોફી', 'coffee', 'kofi', 'कॉफ़ी'], display: 'Coffee' },
  { match: ['દૂધ', 'dudh', 'doodh', 'दूध', 'milk', 'અમૂલ', 'amul'], display: 'Milk (દૂધ)' },
  { match: ['છાશ', 'chhas', 'chhash', 'chhaas', 'chaas', 'छाछ', 'buttermilk'], display: 'Chhas (છાશ)' },
  { match: ['દહીં', 'dahi', 'curd', 'दही'], display: 'Curd (દહીં)' },
  { match: ['માખણ', 'makhan', 'butter', 'मक्खन'], display: 'Butter (માખણ)' },
  { match: ['પનીર', 'paneer', 'पनीर'], display: 'Paneer' },
  { match: ['મીઠું', 'mithu', 'namak', 'મીઠુ', 'नमक', 'salt', 'ટાટા'], display: 'Salt (મીઠું)' },
  { match: ['હળદર', 'haldar', 'haldi', 'हल्दी', 'turmeric'], display: 'Turmeric (હળદર)' },
  { match: ['મરચું', 'marchu', 'mirchi', 'mirch', 'લાલ મરચું', 'मिर्च', 'chilli'], display: 'Chilli Powder (મરચું)' },
  { match: ['જીરું', 'jiru', 'jeera', 'जीरा', 'cumin'], display: 'Jeera (જીરું)' },
  { match: ['રાઈ', 'rai', 'mustard', 'राई'], display: 'Mustard Seeds (રાઈ)' },
  { match: ['હિંગ', 'hing', 'asafoetida', 'हींग'], display: 'Hing (હિંગ)' },
  { match: ['સાબુ', 'sabu', 'soap', 'साबुन', 'લાઇફબોય', 'lifebuoy', 'dettol', 'ડેટોલ', 'lux', 'લક્સ'], display: 'Soap (સાબુ)' },
  { match: ['સર્ફ', 'surf', 'detergent', 'વોશિંગ પાવડર', 'ariel', 'tide', 'wheel', 'વિલ', 'निरमा', 'nirma', 'નિર્મા'], display: 'Detergent (વોશિંગ પાવડર)' },
  { match: ['શેમ્પૂ', 'shampoo', 'clinic', 'head', 'शैम्पू'], display: 'Shampoo' },
  { match: ['ટૂથપેસ્ટ', 'toothpaste', 'colgate', 'pepsodent', 'કોલગેટ', 'ટુથપેસ્ટ'], display: 'Toothpaste (કોલગેટ)' },
  { match: ['બિસ્કીટ', 'biscuit', 'biskut', 'बिस्कुट', 'parle', 'parleg', 'પાર્લે', 'marie', 'ઓરિયો', 'oreo', 'બિસ્કિટ'], display: 'Biscuits (બિસ્કીટ)' },
  { match: ['મેગી', 'maggi', 'noodles', 'નૂડલ્સ', 'मैगी'], display: 'Maggi Noodles (મેગી)' },
  { match: ['ગોળ', 'gol', 'gud', 'jaggery', 'ગુળ', 'गुड़'], display: 'Jaggery (ગોળ)' },
  { match: ['પૌઆ', 'pauva', 'poha', 'pauwa', 'पोहा'], display: 'Poha (પૌઆ)' },
  { match: ['મેંદો', 'maida', 'मैदा'], display: 'Maida (મેંદો)' },
  { match: ['સુજી', 'suji', 'rawa', 'રવો', 'सूજી'], display: 'Suji / Rava (રવો)' },
  { match: ['માચીસ', 'machis', 'matches', 'બાકસ', 'माचिस', 'matchbox'], display: 'Matchbox (માચીસ)' }
];

function testParse(raw) {
  console.log("INPUT:", raw);
  // 1. Normalize digits
  let norm = normalizeDigits(raw);
  
  // 2. Replace number words by splitting into tokens (Unicode-safe)
  const tokens = norm.split(/\s+/);
  const replacedTokens = tokens.map(tok => {
    const clean = tok.toLowerCase().trim();
    return numberWords[clean] !== undefined ? numberWords[clean] : tok;
  });
  norm = replacedTokens.join(' ');
  
  const lower = norm.toLowerCase();
  
  let parsedCustomer = '';
  let parsedItem = '';
  let parsedQty = '';
  let parsedPrice = '';

  // 1. Extract Customer Name (Unicode-safe)
  // Check for Gujarati/Hindi markers: ને, કો, ભાઈ, ભાઈને, બેન, બેનને, जी, को, to, for
  const words = norm.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (w === 'ને' || w === 'ભાઈને' || w === 'બેનને' || w === 'કો' || w === 'को' || w === 'ne' || w === 'ko') {
      if (i > 0) {
        parsedCustomer = words.slice(0, i).join(' ').replace(/^(to|for|customer|ગ્રાહક|ग्राहक)\s+/i, '');
        break;
      }
    } else if (w.endsWith('ભાઈ') || w.endsWith('બેન') || w.endsWith('જી') || w.endsWith('ji') || w.endsWith('bhai')) {
      if (i === 0 || (i === 1 && /^(to|for|customer|ગ્રાહક|ग्राहक)$/i.test(words[0]))) {
        parsedCustomer = words[i];
        break;
      }
    }
  }

  // If starts with "to <name>" or "for <name>" in English
  if (!parsedCustomer && /^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i.test(norm)) {
    const match = norm.match(/^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i);
    if (match) parsedCustomer = match[1];
  }

  // 2. Extract Quantity & Unit
  const qtyPattern = /(\d+(?:\.\d+)?)\s*(kilo|kg|k\.g|કિલો|કિ\.ગ્રા|કિગ્રા|કિ|gram|gm|g|ગ્રામ|ગ્રા|liter|litre|l|ltr|લીટર|લી|મિ\.લી|ml|nag|piece|pcs|pc|નંગ|પેકેટ|packet|pkt|डबल|ડઝન|dozen|dzn|pack|packet|બોટલ|bottle)?/i;
  
  // Look for explicit number with unit first
  const explicitQtyPattern = /(\d+(?:\.\d+)?)\s*(kilo|kg|k\.g|કિલો|કિ\.ગ્રા|કિગ્રા|કિ|gram|gm|g|ગ્રામ|ગ્રા|liter|litre|l|ltr|લીટર|લી|મિ\.લી|ml|nag|piece|pcs|pc|નંગ|પેકેટ|packet|pkt|डबल|ડઝન|dozen|dzn|pack|packet|બોટલ|bottle)\b/i;
  const eqm = lower.match(explicitQtyPattern);
  if (eqm) {
    parsedQty = eqm[1];
  }

  // 3. Extract Price
  const priceKeywordsRegex = /(\d+(?:\.\d+)?)\s*(?:rupiya|rupees|rs|₹|રૂપિયા|રૂ|रुपये|रुपया|ભાવે|લેખે|દર|rate|રૂપિયાના)\b/i;
  const pm = lower.match(priceKeywordsRegex);
  if (pm) {
    parsedPrice = pm[1];
  }

  // 4. Extract Item
  for (const entry of groceryDictionary) {
    for (const kw of entry.match) {
      if (lower.includes(kw.toLowerCase())) {
        parsedItem = entry.display;
        break;
      }
    }
    if (parsedItem) break;
  }

  // 5. Fallbacks for numbers if units were omitted
  const allNums = lower.match(/(\d+(?:\.\d+)?)/g) || [];
  if (!parsedQty && !parsedPrice) {
    if (allNums.length >= 2) {
      parsedQty = allNums[0];
      parsedPrice = allNums[1];
    } else if (allNums.length === 1) {
      if (parseFloat(allNums[0]) <= 25) parsedQty = allNums[0];
      else parsedPrice = allNums[0];
    }
  } else if (!parsedQty && parsedPrice) {
    const remaining = allNums.filter(n => n !== parsedPrice);
    if (remaining.length > 0) parsedQty = remaining[0];
  } else if (parsedQty && !parsedPrice) {
    const remaining = allNums.filter(n => n !== parsedQty);
    if (remaining.length > 0) parsedPrice = remaining[0];
  }

  // Capitalize customer name
  if (parsedCustomer) {
    parsedCustomer = parsedCustomer.charAt(0).toUpperCase() + parsedCustomer.slice(1);
  }

  console.log("RESULT => Customer:", parsedCustomer, "| Item:", parsedItem, "| Qty:", parsedQty, "| Price:", parsedPrice);
  console.log("-----------------------------------------");
}

testParse("રમેશભાઈ ને ૫ કિલો ચોખા ૫૦ રૂપિયા");
testParse("સુરેશ ને ૨ લીટર તેલ ૨૫૦ રૂપિયા");
testParse("રમેશ को ५ किलो चावल ५० रुपये");
testParse("Ramesh ne 5 kg sugar 45 rs");
testParse("બે કિલો ખાંડ ચાલીસ રૂપિયા");
testParse("To Priya 3 kg wheat flour 120 rupees");
testParse("૧૦ પેકેટ પાર્લે બિસ્કીટ ૧૦૦ રૂ");
