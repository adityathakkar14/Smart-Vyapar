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
    rawTranscriptEl.textContent = `Listening in ${selectedLangName}...`;
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    rawTranscriptEl.textContent = transcript;
    
    // Parse the multilingual transcript
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
  // MULTILINGUAL NATURAL LANGUAGE PARSING ENGINE (GUJARATI, HINDI, ENGLISH)
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

  // 2. Multilingual Spoken Number Words Map
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

  // 3. Indian Grocery Vocabulary Dictionary
  const groceryDictionary = [
    { match: ['ચોખા', 'chokha', 'chawal', 'चावल', 'rice', 'basmati', 'બાસમતી', 'કોલમ', 'kolam'], display: 'Rice (ચોખા)' },
    { match: ['ખાંડ', 'khand', 'cheeni', 'chini', 'चीनी', 'sugar', 'શક્કર', 'બૂરું'], display: 'Sugar (ખાંડ)' },
    { match: ['તેલ', 'tel', 'oil', 'singtel', 'સીંગતેલ', 'સરસવ', 'sarson', 'કપાસિયા', 'kapasiya', 'sunflower'], display: 'Cooking Oil (તેલ)' },
    { match: ['ઘી', 'ghee', 'ghi', 'घी', 'desighee', 'અમૂલ ઘી'], display: 'Ghee (ઘી)' },
    { match: ['ઘઉં', 'ghau', 'gehun', 'gehu', 'गेहूं', 'wheat', 'લોટ', 'lot', 'atta', 'આટો', 'आटा', 'મેંદો', 'maida'], display: 'Wheat / Atta (ઘઉંનો લોટ)' },
    { match: ['દાળ', 'dal', 'daal', 'દાલ', 'दाल', 'તુવેર', 'tuver', 'toor', 'arhar', 'અરહર', 'તુવેરદાળ'], display: 'Tuver Dal (તુવેર દાળ)' },
    { match: ['મગ', 'moong', 'mung', 'मूंग', 'મગદાળ'], display: 'Moong Dal (મગ)' },
    { match: ['ચણા', 'chana', 'chane', 'चना', 'chole', 'છોલે', 'ચણાદાળ', 'બેસન', 'besan'], display: 'Chana / Besan (ચણા)' },
    { match: ['અડદ', 'urad', 'udad', 'उड़द', 'અડદદાળ'], display: 'Urad Dal (અડદ દાળ)' },
    { match: ['ચા', 'cha', 'chay', 'chai', 'चाय', 'tea', 'પત્તી', 'patti', 'વાઘ બકરી', 'wagh bakri'], display: 'Tea (ચા)' },
    { match: ['કોફી', 'coffee', 'kofi', 'कॉफ़ी', 'nescafe', 'નેસ્કાફે'], display: 'Coffee (કોફી)' },
    { match: ['દૂધ', 'dudh', 'doodh', 'दूध', 'milk', 'અમૂલ', 'amul'], display: 'Milk (દૂધ)' },
    { match: ['છાશ', 'chhas', 'chhash', 'chhaas', 'chaas', 'छाछ', 'buttermilk'], display: 'Chhas (છાશ)' },
    { match: ['દહીં', 'dahi', 'curd', 'दही'], display: 'Curd (દહીં)' },
    { match: ['માખણ', 'makhan', 'butter', 'मक्खन'], display: 'Butter (માખણ)' },
    { match: ['પનીર', 'paneer', 'पनीर'], display: 'Paneer (પનીર)' },
    { match: ['મીઠું', 'mithu', 'namak', 'મીઠુ', 'नमक', 'salt', 'ટાટા સોલ્ટ'], display: 'Salt (મીઠું)' },
    { match: ['હળદર', 'haldar', 'haldi', 'हल्दी', 'turmeric'], display: 'Turmeric (હળદર)' },
    { match: ['મરચું', 'marchu', 'mirchi', 'mirch', 'લાલ મરચું', 'मिर्च', 'chilli'], display: 'Chilli Powder (મરચું)' },
    { match: ['જીરું', 'jiru', 'jeera', 'जीरा', 'cumin'], display: 'Jeera (જીરું)' },
    { match: ['રાઈ', 'rai', 'mustard', 'राई'], display: 'Mustard Seeds (રાઈ)' },
    { match: ['હિંગ', 'hing', 'asafoetida', 'हींग'], display: 'Hing (હિંગ)' },
    { match: ['ગરમ મસાલો', 'garam masala', 'मसाला', 'મસાલો'], display: 'Garam Masala (ગરમ મસાલો)' },
    { match: ['સાબુ', 'sabu', 'soap', 'साबुन', 'લાઇફબોય', 'lifebuoy', 'dettol', 'ડેટોલ', 'lux', 'લક્સ', 'santoor'], display: 'Soap (સાબુ)' },
    { match: ['સર્ફ', 'surf', 'detergent', 'વોશિંગ પાવડર', 'ariel', 'tide', 'wheel', 'વિલ', 'निरमा', 'nirma', 'નિર્મા', 'ઘડી', 'ghadi'], display: 'Detergent (વોશિંગ પાવડર)' },
    { match: ['શેમ્પૂ', 'shampoo', 'clinic', 'head', 'शैम्पू', 'ડવ', 'dove', 'sunsilk'], display: 'Shampoo (શેમ્પૂ)' },
    { match: ['ટૂથપેસ્ટ', 'toothpaste', 'colgate', 'pepsodent', 'કોલગેટ', 'ટુથપેસ્ટ', 'દંતકાંતિ', 'dant kanti'], display: 'Toothpaste (કોલગેટ)' },
    { match: ['બિસ્કીટ', 'biscuit', 'biskut', 'बिस्कुट', 'parle', 'parleg', 'પાર્લે', 'marie', 'ઓરિયો', 'oreo', 'બિસ્કિટ', 'ગ્લુકોઝ', 'good day'], display: 'Biscuits (બિસ્કીટ)' },
    { match: ['મેગી', 'maggi', 'noodles', 'નૂડલ્સ', 'मैगी', 'યપ્પી', 'yippee'], display: 'Maggi Noodles (મેગી)' },
    { match: ['ગોળ', 'gol', 'gud', 'jaggery', 'ગુળ', 'गुड़'], display: 'Jaggery (ગોળ)' },
    { match: ['પૌઆ', 'pauva', 'poha', 'pauwa', 'पोहा'], display: 'Poha (પૌઆ)' },
    { match: ['મેંદો', 'maida', 'मैदा'], display: 'Maida (મેંદો)' },
    { match: ['સુજી', 'suji', 'rawa', 'રવો', 'सूजी'], display: 'Suji / Rava (રવો)' },
    { match: ['માચીસ', 'machis', 'matches', 'બાકસ', 'माचिस', 'matchbox'], display: 'Matchbox (બાકસ)' }
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
    
    let parsedCustomer = '';
    let parsedItem = '';
    let parsedQty = '';
    let parsedPrice = '';

    // Step 3: Extract Customer Name (Unicode-safe for Gujarati, Hindi, English)
    const words = norm.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (w === 'ને' || w === 'ભાઈને' || w === 'બેનને' || w === 'કો' || w === 'को' || w === 'ne' || w === 'ko') {
        if (i > 0) {
          parsedCustomer = words.slice(0, i).join(' ').replace(/^(to|for|customer|ગ્રાહક|ग्राहक)\s+/i, '');
          break;
        }
      } else if (w.endsWith('ભાઈ') || w.endsWith('બેન') || w.endsWith('જી') || w.endsWith('ji') || w.endsWith('bhai') || w.endsWith('ben')) {
        if (i === 0 || (i === 1 && /^(to|for|customer|ગ્રાહક|ग्राहक)$/i.test(words[0]))) {
          parsedCustomer = words[i];
          break;
        }
      }
    }

    // Fallback: English "to <Name>" or "for <Name>"
    if (!parsedCustomer && /^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i.test(norm)) {
      const match = norm.match(/^(?:to|for)\s+([a-zA-Z\u0A80-\u0AFF\u0900-\u097F]+)/i);
      if (match) parsedCustomer = match[1];
    }

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

    // Step 6: Extract Item from Multilingual Dictionary
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

    // Step 8: Dynamic Fallback for custom groceries not in dictionary
    if (!parsedItem) {
      // Filter out numbers, customer, and unit words
      const stopWords = ['to', 'for', 'ne', 'ko', 'kilo', 'kg', 'liter', 'rs', 'rupees', 'rupiya', 'ને', 'કો', 'કિલો', 'લીટર', 'રૂપિયા', 'રૂ'];
      const candidateWords = words.filter(w => {
        const cw = w.toLowerCase();
        return !cw.match(/\d/) && !stopWords.includes(cw) && cw !== (parsedCustomer || '').toLowerCase();
      });
      if (candidateWords.length > 0) {
        parsedItem = candidateWords.join(' ');
      }
    }

    // Capitalize Customer Name
    if (parsedCustomer) {
      parsedCustomer = parsedCustomer.charAt(0).toUpperCase() + parsedCustomer.slice(1);
    }

    console.log(`[Voice NLP] Parsed Transcript: "${transcript}"`);
    console.log(`[Voice NLP] -> Customer: "${parsedCustomer}", Item: "${parsedItem}", Qty: "${parsedQty}", Price: "${parsedPrice}"`);

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
      window.showToast?.('🎤 Voice input parsed successfully! Review details & add.');
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
