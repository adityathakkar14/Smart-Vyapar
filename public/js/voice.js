document.addEventListener('DOMContentLoaded', () => {
  const btnMic = document.getElementById('btn-mic');
  const langSelect = document.getElementById('voice-lang-select');
  const transcriptContainer = document.getElementById('transcript-container');
  const rawTranscriptEl = document.getElementById('raw-transcript');
  
  // Form fields
  const customerNameInput = document.getElementById('customer-name');
  const itemNameInput = document.getElementById('item-name');
  const itemQtyInput = document.getElementById('item-qty');
  const itemPriceInput = document.getElementById('item-price');

  // Check for speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    btnMic.disabled = true;
    window.showToast?.('Speech Recognition is not supported in this browser. Please use Chrome/Edge.', true);
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  let isListening = false;

  btnMic.addEventListener('click', () => {
    if (isListening) {
      if (recognition) recognition.stop();
      return;
    }

    if (recognition) {
      recognition.lang = langSelect.value;
      try {
        recognition.start();
      } catch (e) {
        console.warn("Recognition already started:", e);
      }
    }
  });

  recognition.onstart = () => {
    isListening = true;
    btnMic.classList.add('listening');
    transcriptContainer.classList.remove('d-none');
    const selectedLangName = langSelect.options[langSelect.selectedIndex].text;
    rawTranscriptEl.textContent = `Listening (${selectedLangName})... Speak naturally.`;
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    rawTranscriptEl.textContent = transcript;
    
    // Parse multilingual input into English billing details
    parseBillingSentence(transcript);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    window.showToast?.(`Voice Error: ${event.error}. Please try speaking again.`, true);
    stopListening();
  };

  recognition.onend = () => {
    stopListening();
  };

  function stopListening() {
    isListening = false;
    btnMic.classList.remove('listening');
    setTimeout(() => {
      transcriptContainer.classList.add('d-none');
    }, 6000);
  }

  // =========================================================================
  // MULTILINGUAL TO ENGLISH TRANSLITERATION & PARSING ENGINE
  // =========================================================================

  // 1. Gujarati & Devanagari Digits Normalization (૦-૯, ०-९ -> 0-9)
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

  // 2. Indic Script (Gujarati & Hindi) to English Transliterator
  function transliterateToEnglish(text) {
    if (!text) return '';
    // If text is already standard English Latin characters
    if (!/[\u0A80-\u0AFF\u0900-\u097F]/.test(text)) {
      return text.replace(/\b\w/g, l => l.toUpperCase()).trim();
    }

    // Pre-replace common names, suffixes & relationships
    let t = text
      .replace(/ભાઈને|ભાઈ|भाई/g, 'bhai')
      .replace(/બેનને|બેન|बहन/g, 'ben')
      .replace(/જીને|જી|जी/g, 'ji')
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
      .replace(/ગુપ્તા/g, 'gupta')
      .replace(/પ્રવીણ|પ્રવિણ/g, 'pravin')
      .replace(/રમેશ/g, 'ramesh')
      .replace(/સુરેશ/g, 'suresh')
      .replace(/રાજેશ/g, 'rajesh')
      .replace(/મહેશ/g, 'mahesh')
      .replace(/જિગ્નેશ|જીગ્નેશ/g, 'jignesh')
      .replace(/હરેશ/g, 'haresh')
      .replace(/ભાવેશ/g, 'bhavesh')
      .replace(/દિલીપ/g, 'dilip')
      .replace(/વિજય/g, 'vijay')
      .replace(/પૂજા|પુજા/g, 'pooja')
      .replace(/અનિલ/g, 'anil')
      .replace(/સુનિલ/g, 'sunil')
      .replace(/અમિત/g, 'amit')
      .replace(/રોહિત/g, 'rohit')
      .replace(/સંજય/g, 'sanjay')
      .replace(/અજય/g, 'ajay');

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

    result = result
      .replace(/abha/g, 'bha')
      .replace(/aben/g, 'ben')
      .replace(/aji/g, 'ji');

    return result.replace(/\b\w/g, l => l.toUpperCase()).trim();
  }

  // 3. Spoken Number Words Map
  const numberWords = {
    // Gujarati Spoken Numbers
    'અડધો': '0.5', 'અડધી': '0.5', 'એક': '1', 'બે': '2', 'ત્રણ': '3', 'ચાર': '4', 'પાંચ': '5', 'છ': '6', 'સાત': '7', 'આઠ': '8', 'નવ': '9', 'દસ': '10',
    'અગિયાર': '11', 'બાર': '12', 'તેર': '13', 'ચૌદ': '14', 'પંદર': '15', 'સોળ': '16', 'સત્તર': '17', 'અઢાર': '18', 'ઓગણીસ': '19', 'વીસ': '20',
    'પચ્ચીસ': '25', 'ત્રીસ': '30', 'ચાલીસ': '40', 'પચાસ': '50', 'સાઠ': '60', 'સિત્તેર': '70', 'એંસી': '80', 'નેવું': '90', 'સો': '100', 'બસો': '200', 'પાંચસો': '500',
    // Hindi Spoken Numbers
    'आधा': '0.5', 'आधी': '0.5', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
    'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19', 'बीस': '20',
    'पच्चीस': '25', 'तीस': '30', 'चालीस': '40', 'पचास': '50', 'साठ': '60', 'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90', 'सौ': '100', 'दो सौ': '200', 'पांच सौ': '500',
    // Hinglish & Gujlish Words
    'adha': '0.5', 'aadha': '0.5', 'ek': '1', 'be': '2', 'do': '2', 'tran': '3', 'teen': '3', 'tin': '3', 'char': '4', 'chaar': '4',
    'panch': '5', 'paanch': '5', 'chhe': '6', 'chha': '6', 'sat': '7', 'saat': '7', 'aath': '8', 'ath': '8', 'nau': '9', 'nav': '9', 'das': '10',
    'pandar': '15', 'pandrah': '15', 'vis': '20', 'bees': '20', 'pachis': '25', 'pachchis': '25', 'tris': '30', 'tees': '30', 'chalis': '40',
    'pachas': '50', 'so': '100', 'sau': '100',
    // English Words
    'half': '0.5', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'fifteen': '15', 'twenty': '20', 'twenty five': '25', 'thirty': '30', 'forty': '40', 'fifty': '50', 'hundred': '100'
  };

  // 4. Indian Grocery Vocabulary to Pure English Items
  const groceryDictionary = [
    { match: ['ચોખા', 'chokha', 'chawal', 'चावल', 'rice', 'basmati', 'બાસમતી', 'કોલમ', 'kolam'], display: 'Rice' },
    { match: ['ખાંડ', 'khand', 'cheeni', 'chini', 'चीनी', 'sugar', 'શક્કર', 'બૂરું'], display: 'Sugar' },
    { match: ['તેલ', 'tel', 'oil', 'singtel', 'સીંગતેલ', 'સરસવ', 'sarson', 'કપાસિયા', 'kapasiya', 'sunflower'], display: 'Cooking Oil' },
    { match: ['ઘી', 'ghee', 'ghi', 'घी', 'desighee', 'અમૂલ ઘી'], display: 'Desi Ghee' },
    { match: ['ઘઉં', 'ghau', 'gehun', 'gehu', 'गेहूं', 'wheat', 'લોટ', 'lot', 'atta', 'આટો', 'आटा', 'મેંદો', 'maida'], display: 'Wheat Flour (Atta)' },
    { match: ['દાળ', 'dal', 'daal', 'દાલ', 'दाल', 'તુવેર', 'tuver', 'toor', 'arhar', 'અરહર', 'તુવેરદાળ'], display: 'Tuver Dal' },
    { match: ['મગ', 'moong', 'mung', 'मूंग', 'મગદાળ'], display: 'Moong Dal' },
    { match: ['ચણા', 'chana', 'chane', 'चना', 'chole', 'છોલે', 'ચણાદાળ', 'બેસન', 'besan'], display: 'Chana Dal' },
    { match: ['અડદ', 'urad', 'udad', 'उड़द', 'અડદદાળ'], display: 'Urad Dal' },
    { match: ['ચા', 'cha', 'chay', 'chai', 'चाय', 'tea', 'પત્તી', 'patti', 'વાઘ બકરી', 'wagh bakri'], display: 'Tea' },
    { match: ['કોફી', 'coffee', 'kofi', 'कॉफ़ी', 'nescafe', 'નેસ્કાફે'], display: 'Coffee' },
    { match: ['દૂધ', 'dudh', 'doodh', 'दूध', 'milk', 'અમૂલ', 'amul'], display: 'Milk' },
    { match: ['છાશ', 'chhas', 'chhash', 'chhaas', 'chaas', 'छाछ', 'buttermilk'], display: 'Buttermilk (Chhas)' },
    { match: ['દહીં', 'dahi', 'curd', 'दही'], display: 'Curd' },
    { match: ['માખણ', 'makhan', 'butter', 'मक्खन'], display: 'Butter' },
    { match: ['પનીર', 'paneer', 'पनीर'], display: 'Paneer' },
    { match: ['મીઠું', 'mithu', 'namak', 'મીઠુ', 'नमक', 'salt', 'ટાટા સોલ્ટ'], display: 'Salt' },
    { match: ['હળદર', 'haldar', 'haldi', 'हल्दी', 'turmeric'], display: 'Turmeric Powder' },
    { match: ['મરચું', 'marchu', 'mirchi', 'mirch', 'લાલ મરચું', 'मिर्च', 'chilli'], display: 'Chilli Powder' },
    { match: ['જીરું', 'jiru', 'jeera', 'जीरा', 'cumin'], display: 'Cumin Seeds (Jeera)' },
    { match: ['રાઈ', 'rai', 'mustard', 'राई'], display: 'Mustard Seeds' },
    { match: ['હિંગ', 'hing', 'asafoetida', 'हींग'], display: 'Asafoetida (Hing)' },
    { match: ['ગરમ મસાલો', 'garam masala', 'मसाला', 'મસાલો'], display: 'Garam Masala' },
    { match: ['સાબુ', 'sabu', 'soap', 'साबुन', 'લાઇફબોય', 'lifebuoy', 'dettol', 'ડેટોલ', 'lux', 'લક્સ', 'santoor'], display: 'Bathing Soap' },
    { match: ['સર્ફ', 'surf', 'detergent', 'વોશિંગ પાવડર', 'ariel', 'tide', 'wheel', 'વિલ', 'निरमा', 'nirma', 'નિર્મા', 'ઘડી', 'ghadi'], display: 'Washing Powder (Detergent)' },
    { match: ['શેમ્પૂ', 'shampoo', 'clinic', 'head', 'शैम्पू', 'ડવ', 'dove', 'sunsilk'], display: 'Shampoo' },
    { match: ['ટૂથપેસ્ટ', 'toothpaste', 'colgate', 'pepsodent', 'કોલગેટ', 'ટુથપેસ્ટ', 'દંતકાંતિ', 'dant kanti'], display: 'Toothpaste' },
    { match: ['બિસ્કીટ', 'biscuit', 'biskut', 'बिस्कुट', 'parle', 'parleg', 'પાર્લે', 'marie', 'ઓરિયો', 'oreo', 'બિસ્કિટ', 'ગ્લુકોઝ', 'good day'], display: 'Biscuits' },
    { match: ['મેગી', 'maggi', 'noodles', 'નૂડલ્સ', 'मैगी', 'યપ્પી', 'yippee'], display: 'Maggi Noodles' },
    { match: ['ગોળ', 'gol', 'gud', 'jaggery', 'ગુળ', 'गुड़'], display: 'Jaggery (Gud)' },
    { match: ['પૌઆ', 'pauva', 'poha', 'pauwa', 'पोहा'], display: 'Poha' },
    { match: ['મેંદો', 'maida', 'मैदा'], display: 'Maida Flour' },
    { match: ['સુજી', 'suji', 'rawa', 'રવો', 'सूજી'], display: 'Suji / Rava' },
    { match: ['માચીસ', 'machis', 'matches', 'બાકસ', 'माचिस', 'matchbox'], display: 'Matchbox' }
  ];

  function parseBillingSentence(transcript) {
    // Step 1: Normalize Gujarati & Devanagari numerals
    let norm = normalizeDigits(transcript);
    
    // Step 2: Replace spoken number words with standard digits
    const tokens = norm.split(/\s+/);
    const replacedTokens = tokens.map(tok => {
      const clean = tok.toLowerCase().trim();
      return numberWords[clean] !== undefined ? numberWords[clean] : tok;
    });
    norm = replacedTokens.join(' ');
    
    const lower = norm.toLowerCase();
    
    let rawCustomer = '';
    let parsedItem = '';
    let parsedQty = '';
    let parsedPrice = '';

    // Step 3: Extract Customer Name (Unicode-safe for Gujarati, Hindi, English)
    const words = norm.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (w === 'ને' || w === 'ભાઈને' || w === 'બેનને' || w === 'કો' || w === 'को' || w === 'ne' || w === 'ko') {
        if (i > 0) {
          rawCustomer = words.slice(0, i).join(' ').replace(/^(to|for|customer|ગ્રાહક|ग्राहक)\s+/i, '');
          break;
        }
      } else if (w.endsWith('ભાઈ') || w.endsWith('બેન') || w.endsWith('જી') || w.endsWith('ji') || w.endsWith('bhai') || w.endsWith('ben')) {
        if (i === 0 || (i === 1 && /^(to|for|customer|ગ્રાહક|ग्राहक)$/i.test(words[0]))) {
          rawCustomer = words[i];
          break;
        }
      }
    }

    // Fallback: English "to <Name>" or "for <Name>"
    if (!rawCustomer && /^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i.test(norm)) {
      const match = norm.match(/^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i);
      if (match) rawCustomer = match[1];
    }

    // Convert Customer Name into Pure English (Latin Characters)
    const parsedCustomer = transliterateToEnglish(rawCustomer);

    // Step 4: Extract Quantity & Explicit Unit
    const explicitQtyPattern = /(\d+(?:\.\d+)?)\s*(kilo|kg|k\.g|કિલો|કિ\.ગ્રા|કિગ્રા|કિ|gram|gm|g|ગ્રામ|ગ્રા|liter|litre|l|ltr|લીટર|લી|મિ\.લી|ml|nag|piece|pcs|pc|નંગ|પેકેટ|packet|pkt|ડઝન|dozen|dzn|pack|packet|બોટલ|bottle)\b/i;
    const eqm = lower.match(explicitQtyPattern);
    if (eqm) {
      parsedQty = eqm[1];
    }

    // Step 5: Extract Price (Matching Rupees / ₹ / ભાવ / દર / લેખે)
    const priceKeywordsRegex = /(\d+(?:\.\d+)?)\s*(?:rupiya|rupees|rs|₹|રૂપિયા|રૂ|रुपये|रुपया|ભાવે|લેખે|દર|rate|રૂપિયાના|રૂપિયાનું)\b/i;
    const pm = lower.match(priceKeywordsRegex);
    if (pm) {
      parsedPrice = pm[1];
    }

    // Step 6: Extract Item from Multilingual Dictionary (Mapped to Pure English)
    for (const entry of groceryDictionary) {
      for (const kw of entry.match) {
        if (lower.includes(kw.toLowerCase())) {
          parsedItem = entry.display;
          break;
        }
      }
      if (parsedItem) break;
    }

    // Step 7: Fallbacks for numbers if units were omitted
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

    // Step 8: Dynamic Fallback for custom products not in dictionary (Transliterated to English)
    if (!parsedItem) {
      const stopWords = new Set([
        'to', 'for', 'customer', 'ne', 'ko', 'kilo', 'kg', 'k.g', 'gram', 'gm', 'g', 'liter', 'litre', 'l', 'ltr',
        'ml', 'nag', 'piece', 'pcs', 'pc', 'packet', 'pkt', 'box', 'bottle', 'pack', 'dozen', 'dzn',
        'rs', 'rupees', 'rupiya', 'inr', 'rate', 'price',
        'ને', 'કો', 'ભાઈ', 'ભાઈને', 'બેન', 'બેનને', 'જી',
        'કિલો', 'કિ.ગ્રા', 'ગ્રામ', 'લીટર', 'નંગ', 'પેકેટ', 'બોટલ', 'ડઝન',
        'રૂપિયા', 'રૂ', 'ભાવે', 'લેખે', 'દર', 'ભાવ', 'રૂપિયાના', 'રૂપિયાનું',
        'को', 'जी', 'किलो', 'ग्राम', 'लीटर', 'नग', 'पैकेट', 'बोतल', 'दर्जन', 'रुपये', 'रुपया', 'के'
      ]);

      const candidateWords = words.filter(w => {
        const clean = normalizeDigits(w).toLowerCase().replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g, '');
        const isCust = rawCustomer && (clean === rawCustomer.toLowerCase() || rawCustomer.toLowerCase().includes(clean));
        return clean && !clean.match(/^\d+(\.\d+)?$/) && !stopWords.has(clean) && !isCust;
      });

      if (candidateWords.length > 0) {
        parsedItem = transliterateToEnglish(candidateWords.join(' '));
      }
    }

    console.log(`[Voice NLP] Original Spoken: "${transcript}"`);
    console.log(`[Voice NLP] -> Customer (English): "${parsedCustomer}", Item (English): "${parsedItem}", Qty: "${parsedQty}", Price: "${parsedPrice}"`);

    // Step 9: Auto-fill Form with Visual Feedback
    let autofilled = false;
    
    if (parsedCustomer && !customerNameInput.value) {
      customerNameInput.value = parsedCustomer;
      autofilled = true;
    }
    if (parsedItem) {
      itemNameInput.value = parsedItem;
      autofilled = true;
    }
    if (parsedQty) {
      itemQtyInput.value = parsedQty;
      autofilled = true;
    }
    if (parsedPrice) {
      itemPriceInput.value = parsedPrice;
      autofilled = true;
    }

    if (autofilled) {
      window.showToast?.('🎤 Voice input parsed & written in English!');
      const formEl = document.getElementById('billing-form');
      if (formEl) {
        formEl.style.transition = 'box-shadow 0.3s ease-in-out';
        formEl.style.boxShadow = '0 0 15px rgba(243, 114, 44, 0.6)';
        setTimeout(() => {
          formEl.style.boxShadow = 'none';
        }, 1800);
      }
    } else {
      window.showToast?.("Couldn't extract items from speech. Please try speaking clearly or enter manually.", true);
    }
  }
});
