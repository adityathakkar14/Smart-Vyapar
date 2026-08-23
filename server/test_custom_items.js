function testCustomItems(sentence) {
  console.log("Testing:", sentence);
  // simulate step 8
  const stopWords = new Set([
    'to', 'for', 'customer', 'ne', 'ko', 'kilo', 'kg', 'k.g', 'gram', 'gm', 'g', 'liter', 'litre', 'l', 'ltr',
    'ml', 'nag', 'piece', 'pcs', 'pc', 'packet', 'pkt', 'box', 'bottle', 'pack', 'dozen', 'dzn',
    'rs', 'rupees', 'rupiya', 'inr', 'rate', 'price',
    'ને', 'કો', 'ભાઈ', 'ભાઈને', 'બેન', 'બેનને', 'જી',
    'કિલો', 'કિ.ગ્રા', 'ગ્રામ', 'લીટર', 'નંગ', 'પેકેટ', 'બોટલ', 'ડઝન',
    'રૂપિયા', 'રૂ', 'ભાવે', 'લેખે', 'દર', 'ભાવ', 'રૂપિયાના', 'રૂપિયાનું',
    'को', 'जी', 'किलो', 'ग्राम', 'लीटर', 'नग', 'पैकेट', 'बोतल', 'दर्जन', 'रुपये', 'रुपया', 'के'
  ]);

  const words = sentence.split(/\s+/);
  const candidateWords = words.filter(w => {
    const clean = w.toLowerCase().replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g, '');
    return clean && !clean.match(/^\d+$/) && !stopWords.has(clean.toLowerCase());
  });

  const parsedItem = candidateWords.join(' ');
  console.log("Extracted Custom Item:", parsedItem);
  console.log("----------------------------");
}

testCustomItems("2 packet Cadbury Dairy Milk 150 rupiya");
testCustomItems("5 nag Dettol Handwash 200 rs");
testCustomItems("૨ બોટલ થમ્સ અપ ૧૦૦ રૂપિયા");
testCustomItems("3 piece Classmate Notebook 180 rs");
testCustomItems("૧૦ પેકેટ બાલાજી વેફર્સ ૫૦ રૂપિયા");
