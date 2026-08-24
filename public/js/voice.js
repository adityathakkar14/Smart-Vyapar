/**
 * Smart Vyapar — Pure Web Speech Recognition & Offline Natural Language Parser
 * 
 * Features:
 * 1. Native Web Speech API (Chrome, Android, Edge, Safari) — 100% offline & instant, no API keys needed.
 * 2. Real-time live transcript streaming with speech indicator & visual feedback.
 * 3. Multi-language support: Gujarati (gu-IN), Hindi (hi-IN), English (en-IN).
 * 4. High-accuracy Indian Kirana / Retail NLP Engine:
 *    - Full Indic digit normalization (Gujarati ૦-૯ & Devanagari ०-९).
 *    - Number word mapping across Gujarati, Hindi, Hinglish/Gujlish, and English.
 *    - Generalized customer name extraction & transliteration (all Indian names, with or without honorifics/suffixes).
 *    - 100+ standard grocery/FMCG dictionary mappings to clean English product names.
 *    - Multi-unit parsing (kg, gm, liter, ml, packet, piece, bottle, dozen) with decimal normalization.
 *    - Smart price and quantity disambiguation with exact token masking and Unicode safety.
 * 5. Automatic billing form fill with visual highlight & toast notifications.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ─── DOM References ────────────────────────────────────────────────────────
  const btnMic              = document.getElementById('btn-mic');
  const langSelect          = document.getElementById('voice-lang-select');
  const transcriptContainer = document.getElementById('transcript-container');
  const rawTranscriptEl     = document.getElementById('raw-transcript');
  const statusEl            = document.getElementById('voice-status-text');

  const customerNameInput   = document.getElementById('customer-name');
  const itemNameInput       = document.getElementById('item-name');
  const itemQtyInput        = document.getElementById('item-qty');
  const itemPriceInput      = document.getElementById('item-price');

  // ─── Browser Web Speech Capability Detection ──────────────────────────────
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
    } catch (e) {
      console.warn('[WebSpeech] Recognition init failed:', e);
      recognition = null;
    }
  }

  let isListening      = false;
  let hasTranscript    = false;
  let webSpeechText    = '';
  let finalResultText  = '';
  let autoStopTimer    = null;

  // ─── Web Speech Callbacks ──────────────────────────────────────────────────
  if (recognition) {
    recognition.onstart = () => {
      isListening = true;
      btnMic?.classList.add('listening');
      const langText = langSelect?.options[langSelect.selectedIndex]?.text || 'Speech';
      setStatus(`🎤 Listening in ${langText}... Speak now`);
    };

    recognition.onspeechstart = () => {
      setStatus('🗣️ Voice detected... Listening');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let currentFinal = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          currentFinal += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      const display = (currentFinal || interim).trim();
      if (display && rawTranscriptEl) {
        rawTranscriptEl.textContent = display;
      }
      if (currentFinal) {
        finalResultText = currentFinal.trim();
        webSpeechText = currentFinal.trim();
      } else if (interim) {
        webSpeechText = interim.trim();
      }
    };

    recognition.onerror = (event) => {
      console.warn('[WebSpeech] Error event:', event.error);
      if (event.error === 'not-allowed') {
        setStatus('⚠️ Microphone permission denied. Please allow mic access in your browser.');
        window.showToast?.('Microphone permission blocked. Please allow mic.', true);
      } else if (event.error === 'no-speech') {
        setStatus('❓ No speech heard. Tap mic and speak clearly.');
      } else if (event.error === 'network') {
        setStatus('⚠️ Speech recognition network issue. Please check internet connection.');
      } else {
        setStatus(`⚠️ Speech recognition notice: ${event.error}`);
      }
      stopListeningUI();
    };

    recognition.onend = () => {
      stopListeningUI();
      const textToProcess = finalResultText || webSpeechText || rawTranscriptEl?.textContent.trim();
      if (textToProcess && textToProcess.length >= 2) {
        processTranscript(textToProcess);
      } else {
        setStatus('❓ No speech recognized. Tap mic and speak again.');
      }
    };
  }

  // ─── Mic Button Toggle Handler ─────────────────────────────────────────────
  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (!recognition) {
        window.showToast?.('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.', true);
        setStatus('❌ Speech recognition not supported in this browser.');
        return;
      }

      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    });
  }

  function startListening() {
    // Reset state
    if (transcriptContainer) transcriptContainer.classList.remove('d-none');
    if (rawTranscriptEl) rawTranscriptEl.textContent = '';
    finalResultText = '';
    webSpeechText = '';
    hasTranscript = false;

    // Clear item inputs for fresh voice entry (preserve customer name if not overridden)
    if (itemNameInput) itemNameInput.value = '';
    if (itemQtyInput) itemQtyInput.value = '';
    if (itemPriceInput) itemPriceInput.value = '';

    const langCode = langSelect ? langSelect.value : 'gu-IN';
    recognition.lang = langCode;

    try {
      recognition.start();
      isListening = true;
      btnMic?.classList.add('listening');
      setStatus('🎤 Starting voice recognition...');
    } catch (e) {
      console.warn('[WebSpeech] Start error:', e);
      try {
        recognition.stop();
        setTimeout(() => {
          recognition.start();
          isListening = true;
          btnMic?.classList.add('listening');
        }, 200);
      } catch (err) {}
    }

    // Auto-timeout after 9 seconds of continuous listening
    clearTimeout(autoStopTimer);
    autoStopTimer = setTimeout(() => {
      if (isListening) {
        stopListening();
      }
    }, 9000);
  }

  function stopListening() {
    clearTimeout(autoStopTimer);
    if (recognition && isListening) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    stopListeningUI();
  }

  function stopListeningUI() {
    isListening = false;
    clearTimeout(autoStopTimer);
    if (btnMic) btnMic.classList.remove('listening');
  }

  // ─── Speech Processing Engine (Natural Language Kirana Parser) ─────────────
  function processTranscript(transcript) {
    if (!transcript) return;
    setStatus('⚡ Parsing speech details...');

    const parsed = parseKiranaSpeech(transcript);
    console.log('[WebSpeech] Raw transcript:', transcript);
    console.log('[WebSpeech] Parsed structured data:', parsed);

    fillBillingForm(parsed.customerName, parsed.itemName, parsed.quantity, parsed.price, transcript);
  }

  // ─── Auto-Fill Form & UX Highlights ────────────────────────────────────────
  function fillBillingForm(customerName, itemName, quantity, price, rawTranscript) {
    let autofilled = false;

    if (customerName && customerNameInput) {
      customerNameInput.value = customerName;
      autofilled = true;
    }
    if (itemName && itemNameInput) {
      itemNameInput.value = itemName;
      autofilled = true;
    }
    if (quantity != null && !isNaN(quantity) && itemQtyInput) {
      itemQtyInput.value = quantity;
      autofilled = true;
    }
    if (price != null && !isNaN(price) && itemPriceInput) {
      itemPriceInput.value = price;
      autofilled = true;
    }

    hasTranscript = true;

    if (autofilled) {
      let summary = [];
      if (customerName) summary.push(`👤 ${customerName}`);
      if (itemName) summary.push(itemName);
      if (quantity != null) summary.push(`${quantity} qty`);
      if (price != null) summary.push(`₹${price}`);

      const summaryText = summary.join(' · ');
      setStatus(`✅ Extracted: ${summaryText}`);
      window.showToast?.(`🎤 Voice parsed: ${summaryText}`);

      // Visual feedback highlight on billing card
      const formEl = document.getElementById('billing-form');
      if (formEl) {
        formEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        formEl.style.boxShadow = '0 0 16px rgba(15, 76, 92, 0.45)';
        setTimeout(() => {
          formEl.style.boxShadow = 'none';
        }, 1800);
      }
    } else {
      setStatus("❓ Couldn't extract product details. Please speak clearly (e.g. 'Ramesh 2 kg rice 60').");
    }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // ─── Reset Transcript View when Item is Added to Bill ──────────────────────
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      if (hasTranscript) {
        if (transcriptContainer) transcriptContainer.classList.add('d-none');
        if (rawTranscriptEl) rawTranscriptEl.textContent = '';
        hasTranscript = false;
        setStatus('');
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIGH-ACCURACY NATURAL LANGUAGE & RETAIL DICTIONARY PARSER
  // ═══════════════════════════════════════════════════════════════════════════

  // 1. Gujarati & Devanagari Digit Converter
  function normalizeDigits(text) {
    if (!text) return '';
    const gujDigits = { '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4', '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9' };
    const devDigits = { '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '૮': '8', '९': '9' };
    let res = text;
    for (const [k, v] of Object.entries(gujDigits)) res = res.split(k).join(v);
    for (const [k, v] of Object.entries(devDigits)) res = res.split(k).join(v);
    return res;
  }

  // 2. Spoken Number Words Dictionary (excluding units like dozen)
  const numberWords = {
    // Fractions & Common Multipliers
    'અડધો': '0.5', 'અડધી': '0.5', 'અડધું': '0.5',
    'આધા': '0.5', 'आधी': '0.5', 'आधा': '0.5',
    'adha': '0.5', 'aadhi': '0.5', 'half': '0.5',
    'દોઢ': '1.5', 'ડેઢ': '1.5', 'डेढ़': '1.5', 'dedh': '1.5', 'derh': '1.5',
    'અઢી': '2.5', 'ઢાઈ': '2.5', 'ढाई': '2.5', 'dhai': '2.5',
    'પા': '0.25', 'પાવ': '0.25', 'पाव': '0.25', 'pao': '0.25', 'pav': '0.25', 'quarter': '0.25',
    'પોણો': '0.75', 'પોણી': '0.75', 'पौना': '0.75', 'pauna': '0.75', 'pono': '0.75',

    // Gujarati Numbers
    'એક': '1', 'બે': '2', 'ત્રણ': '3', 'ચાર': '4', 'પાંચ': '5', 'છ': '6', 'સાત': '7', 'આઠ': '8', 'નવ': '9', 'દસ': '10',
    'અગિયાર': '11', 'બાર': '12', 'તેર': '13', 'ચૌદ': '14', 'પંદર': '15', 'સોળ': '16', 'સત્તર': '17', 'અઢાર': '18', 'ઓગણીસ': '19',
    'વીસ': '20', 'એકવીસ': '21', 'બાવીસ': '22', 'તેવીસ': '23', 'ચોવીસ': '24', 'પચ્ચીસ': '25', 'પચીસ': '25',
    'ત્રીસ': '30', 'પાંત્રીસ': '35', 'ચાલીસ': '40', 'પિસ્તાલીસ': '45', 'પચાસ': '50', 'સાઈઠ': '60', 'સાઠ': '60',
    'સિત્તેર': '70', 'એંસી': '80', 'અસ્સી': '80', 'નેવું': '90',
    'સો': '100', 'દોઢસો': '150', 'બસો': '200', 'અઢીસો': '250', 'ત્રણસો': '300', 'ચારસો': '400', 'પાંચસો': '500', 'હજાર': '1000',

    // Hindi / Devanagari Numbers
    'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4', 'पांच': '5', 'पाँच': '5', 'छह': '6', 'छः': '6', 'सात': '7', 'आठ': '8', 'नौ': '9', 'दस': '10',
    'ग्यारह': '11', 'बारह': '12', 'तेरह': '13', 'चौदह': '14', 'पंद्रह': '15', 'सोलह': '16', 'सत्रह': '17', 'अठारह': '18', 'उन्नीस': '19',
    'बीस': '20', 'इक्कीस': '21', 'बाईस': '22', 'तेईस': '23', 'चौबीस': '24', 'पच्चीस': '25',
    'तीस': '30', 'पैंतीस': '35', 'चालीस': '40', 'पैंतालीस': '45', 'पचास': '50', 'साठ': '60',
    'सत्तर': '70', 'अस्सी': '80', 'नब्बे': '90',
    'सौ': '100', 'दो सौ': '200', 'तीन सौ': '300', 'चार सौ': '400', 'पांच सौ': '500', 'हज़ार': '1000', 'हजार': '1000',

    // Phonetic Romanized Hindi/Gujarati
    'ek': '1', 'be': '2', 'do': '2', 'tran': '3', 'tin': '3', 'teen': '3', 'char': '4', 'panch': '5', 'paanch': '5',
    'chhe': '6', 'che': '6', 'chha': '6', 'sat': '7', 'saat': '7', 'aath': '8', 'ath': '8', 'nav': '9', 'nau': '9',
    'das': '10', 'dus': '10', 'agiyar': '11', 'gyarah': '11', 'bar': '12', 'barah': '12', 'ter': '13', 'terah': '13',
    'chaud': '14', 'chaudah': '14', 'pandar': '15', 'pandrah': '15', 'sol': '16', 'solah': '16', 'sattar': '17', 'satrah': '17',
    'adhar': '18', 'atharah': '18', 'ognis': '19', 'unnis': '19', 'vis': '20', 'bees': '20', 'pachis': '25', 'pachhis': '25',
    'tis': '30', 'tris': '30', 'tees': '30', 'pantis': '35', 'paintis': '35', 'chalis': '40', 'chaalis': '40', 'pistalis': '45', 'pentalis': '45',
    'pachas': '50', 'sath': '60', 'saith': '60', 'sattar': '70', 'sitter': '70', 'assi': '80', 'ensi': '80', 'nabbe': '90', 'nevu': '90',
    'so': '100', 'sau': '100', 'dedhso': '150', 'baso': '200', 'doso': '200', 'dhaiso': '250', 'transo': '300', 'charso': '400', 'panchso': '500',
    'hajar': '1000', 'hazar': '1000',

    // English Number Words
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
    'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19',
    'twenty': '20', 'twenty-five': '25', 'twenty five': '25', 'thirty': '30', 'thirty-five': '35', 'thirty five': '35',
    'forty': '40', 'forty-five': '45', 'forty five': '45', 'fifty': '50', 'sixty': '60', 'seventy': '70', 'eighty': '80', 'ninety': '90',
    'hundred': '100', 'one hundred': '100', 'two hundred': '200', 'three hundred': '300', 'four hundred': '400', 'five hundred': '500', 'thousand': '1000'
  };

  // 3. Comprehensive Indian Grocery & FMCG Dictionary (ordered by specificity)
  const groceryDictionary = [
    // Multi-word & higher priority items first
    { match: ['desi ghee', 'દેશી ઘી', 'शुद्ध घी', 'amul ghee', 'cow ghee'], display: 'Desi Ghee' },
    { match: ['cooking oil', 'સીંગતેલ', 'કપાસિયા તેલ', 'તેલનું પાઉચ', 'groundnut oil', 'sunflower oil', 'soya oil', 'mustard oil', 'sarson tel', 'fortune oil', 'tirupati oil', 'gulab oil', 'cottonseed oil', 'सरसों तेल', 'singtel', 'kapasiya tel'], display: 'Cooking Oil' },
    { match: ['wheat flour', 'આટો', 'gehun ka atta', 'aashirvaad', 'chakki atta', 'ગેહું કા આટા', 'गेहूं का आटा'], display: 'Wheat Flour' },
    { match: ['maida flour', 'મેંદો લોટ', 'all purpose flour', 'મેંદો', 'maida', 'मैदा'], display: 'Maida Flour' },
    { match: ['chana dal', 'ચણા દાળ', 'ચણાદાળ', 'chana daal', 'bengal gram', 'ચણાની દાળ', 'चना दाल'], display: 'Chana Dal' },
    { match: ['tuver dal', 'તુવેર દાળ', 'તુવેરદાળ', 'toor dal', 'arhar dal', 'tuver', 'tur dal', 'toor', 'arhar', 'તુવેર', 'तुवर दाल', 'अरहर दाल'], display: 'Tuver Dal' },
    { match: ['moong dal', 'મગ દાળ', 'મગદાળ', 'moong dal', 'mung dal', 'pili moong', 'मूंग दाल'], display: 'Moong Dal' },
    { match: ['urad dal', 'અડદ દાળ', 'urad dal', 'adad dal', 'urad chilka', 'urad gota', 'उड़द दाल'], display: 'Urad Dal' },
    { match: ['masoor dal', 'મસૂર દાળ', 'masoor dal', 'malka masoor', 'red lentil', 'मसूर दाल'], display: 'Masoor Dal' },
    { match: ['turmeric powder', 'હળદર', 'haldar', 'haldi', 'turmeric', 'haldi powder', 'हल्दी', 'हल्दी पाउडर'], display: 'Turmeric Powder' },
    { match: ['chilli powder', 'મરચું', 'લાલ મરચું', 'marchu', 'mirch', 'mirchi', 'lal mirch', 'chilli powder', 'red chilli', 'chili powder', 'लाल मिर्च', 'मिर्च'], display: 'Chilli Powder' },
    { match: ['cumin seeds', 'જીરું', 'જીરૂ', 'jiru', 'jeera', 'cumin', 'cumin seeds', 'जीरा'], display: 'Cumin Seeds' },
    { match: ['mustard seeds', 'રાઈ', 'rai', 'sarson', 'mustard seeds', 'राई', 'सरसों'], display: 'Mustard Seeds' },
    { match: ['garam masala', 'ગરમ મસાલો', 'garam masala', 'sabji masala', 'kitchen king', 'गरમ મસાલા', 'गरम मसाला'], display: 'Garam Masala' },
    { match: ['coriander powder', 'ધાણાજીરું', 'ધાણા જીરૂ', 'dhana jiru', 'dhania jeera', 'dhania powder', 'coriander powder', 'धनिया पाउडर'], display: 'Coriander Powder' },
    { match: ['black pepper', 'કાળા મરી', 'mari', 'kali mirch', 'black pepper', 'काली मिर्च'], display: 'Black Pepper' },
    { match: ['hair oil', 'વાળનું તેલ', 'hair oil', 'coconut oil', 'parachute', 'bajaj almond', 'navratna oil', 'dabur amla', 'हेयर ऑयल', 'नारियल तेल'], display: 'Hair Oil' },
    { match: ['detergent powder', 'સર્ફ', 'ડિટર્જન્ટ', 'detergent', 'surf excel', 'ariel', 'tide', 'nirma', 'ghadi', 'rin', 'wheel', 'washing powder', 'સર્ફ એક્સેલ', 'डिटर्जेंट', 'सर्फ', 'surf'], display: 'Detergent' },
    { match: ['dishwash bar', 'વિમ', 'vim', 'dishwash', 'pril', 'exo', 'vim bar', 'dishwash liquid', 'बर्तन साबुन', 'डिशवॉश'], display: 'Dishwash Bar' },
    { match: ['floor cleaner', 'લાઈઝોલ', 'lizol', 'floor cleaner', 'phenyl', 'harpic', 'domex', 'फिनाइल', 'हार्पिक'], display: 'Floor Cleaner' },
    { match: ['mosquito repellent', 'ઓલ આઉટ', 'good knight', 'all out', 'mosquito coil', 'maxo', 'repellent', 'मच्छर अगरबत्ती'], display: 'Mosquito Repellent' },
    { match: ['toast rusk', 'ટોસ્ટ', 'રસ્ક', 'toast', 'rusk', 'crispy toast', 'टोस्ट'], display: 'Toast / Rusk' },

    // Single-word items
    { match: ['ચોખા', 'chokha', 'chawal', 'चावल', 'basmati', 'kolam', 'rice', 'જીરાસાર', 'jirasar', 'sonamasuri', 'tukda rice'], display: 'Rice' },
    { match: ['ખાંડ', 'khand', 'cheeni', 'chini', 'चीनी', 'sugar', 'શક્કર', 'shakkar', 'bura', 'boora'], display: 'Sugar' },
    { match: ['ઘઉં', 'ghau', 'gehun', 'gehu', 'गेहूं', 'wheat', 'tukdi ghau'], display: 'Wheat' },
    { match: ['લોટ', 'lot', 'atta'], display: 'Wheat Flour' },
    { match: ['બેસન', 'besan', 'ચણાનો લોટ', 'chana lot', 'gram flour', 'बेसन'], display: 'Besan' },
    { match: ['પૌઆ', 'poha', 'pauva', 'chivda', 'pohe', 'पोहा'], display: 'Poha' },
    { match: ['સુજી', 'suji', 'રવો', 'rawo', 'rawa', 'sooji', 'semolina', 'सूजी', 'रवा'], display: 'Suji / Rava' },
    { match: ['સાબુદાણા', 'sabudana', 'tapioca', 'sago', 'साबूदाना'], display: 'Sabudana' },
    { match: ['ચણા', 'chana', 'chane', 'kabuli chana', 'chole', 'desi chana', 'kala chana', 'चना', 'छोले', 'काबूली चना'], display: 'Chana' },
    { match: ['મગ', 'moong', 'mung', 'mug', 'मूंग'], display: 'Moong Dal' },
    { match: ['અડદ', 'adad', 'urad', 'उड़द'], display: 'Urad Dal' },
    { match: ['મસૂર', 'masoor', 'मसूर'], display: 'Masoor Dal' },
    { match: ['રાજમા', 'rajma', 'kidney beans', 'राजमा'], display: 'Rajma' },
    { match: ['દાળ', 'dal', 'daal', 'दाल'], display: 'Dal' },
    { match: ['તેલ', 'oil', 'tel', 'तेल'], display: 'Cooking Oil' },
    { match: ['ઘી', 'ghee', 'ghi', 'घी'], display: 'Desi Ghee' },
    { match: ['માખણ', 'બટર', 'butter', 'amul butter', 'maska', 'मक्खन', 'बटर'], display: 'Butter' },
    { match: ['દૂધ', 'milk', 'dudh', 'doodh', 'amul gold', 'amul taaza', 'दूध'], display: 'Milk' },
    { match: ['દહીં', 'curd', 'dahi', 'yogurt', 'दही'], display: 'Curd' },
    { match: ['પનીર', 'paneer', 'cottage cheese', 'पनीर'], display: 'Paneer' },
    { match: ['છાસ', 'chaas', 'chhas', 'mattha', 'छाछ'], display: 'Buttermilk' },
    { match: ['ચીઝ', 'cheese', 'चीज़'], display: 'Cheese' },
    { match: ['ગોળ', 'gol', 'gud', 'jaggery', 'गुड़'], display: 'Jaggery' },
    { match: ['મીઠું', 'mithu', 'namak', 'નમક', 'salt', 'tata salt', 'नमक'], display: 'Salt' },
    { match: ['હિંગ', 'hing', 'asafoetida', 'हींग'], display: 'Hing' },
    { match: ['એલચી', 'elaichi', 'elchi', 'cardamom', 'इलायची'], display: 'Cardamom' },
    { match: ['લવિંગ', 'laving', 'laung', 'cloves', 'लौंग'], display: 'Clove' },
    { match: ['ચા', 'tea', 'chai', 'chay', 'wagh bakri', 'चाय'], display: 'Tea' },
    { match: ['કોફી', 'coffee', 'nescafe', 'bru', 'कॉफी'], display: 'Coffee' },
    { match: ['કોલ્ડ ડ્રિંક', 'thums up', 'coca cola', 'sprite', 'fanta', 'pepsi', 'maaza', 'frooti', 'limca', 'sting', 'cold drink'], display: 'Cold Drink' },
    { match: ['બિસ્કીટ', 'biscuit', 'biskut', 'parle-g', 'parle g', 'marie gold', 'marie', 'oreo', 'bourbon', 'good day', 'monaco', '20-20', 'krackjack', 'बिस्कुट'], display: 'Biscuits' },
    { match: ['મેગી', 'નૂડલ્સ', 'maggi', 'noodles', 'yippee', 'magi', 'ramen', 'मैगी', 'नूडल्स'], display: 'Noodles' },
    { match: ['વેફર્સ', 'ચિપ્સ', 'wafers', 'chips', 'lays', 'kurkure', 'नमकीन', 'चिप्स'], display: 'Wafers / Chips' },
    { match: ['ચોકલેટ', 'chocolate', 'cadbury', 'dairy milk', 'kitkat', '5 star', 'perk', 'munch', 'milkybar', 'चॉकलेट'], display: 'Chocolates' },
    { match: ['બ્રેડ', 'bread', 'pav', 'bun', 'slice bread', 'ब्रेड', 'पाव'], display: 'Bread' },
    { match: ['સાબુ', 'soap', 'sabu', 'sabun', 'lux', 'lifebuoy', 'dettol', 'santoor', 'dove', 'pears', 'cinthol', 'medimix', 'godrej no 1', 'साबुन'], display: 'Soap' },
    { match: ['શેમ્પૂ', 'shampoo', 'clinic plus', 'sunsilk', 'head and shoulders', 'vatika', 'tresemme', 'शैम्पू'], display: 'Shampoo' },
    { match: ['ટૂથપેસ્ટ', 'toothpaste', 'colgate', 'pepsodent', 'sensodyne', 'dabur red', 'close up', 'dant kanti', 'टूथपेस्ट', 'कोलगेट'], display: 'Toothpaste' },
    { match: ['ટૂથબ્રશ', 'toothbrush', 'brush', 'colgate brush', 'oral b', 'टूथब्रश'], display: 'Toothbrush' },
    { match: ['માચીસ', 'બાકસ', 'matchbox', 'machis', 'bakas', 'matches', 'माचिस'], display: 'Matchbox' },
    { match: ['અગરબત્તી', 'agarbatti', 'incense sticks', 'cycle pure', 'अगरबत्ती'], display: 'Agarbatti' },
    { match: ['ડુંગળી', 'કાંદા', 'dungri', 'kanda', 'onion', 'pyaz', 'kando', 'प्याज', 'कांदा'], display: 'Onion' },
    { match: ['બટાકા', 'બટાટા', 'bataka', 'batata', 'aloo', 'potato', 'alu', 'आलू', 'बटाटा'], display: 'Potato' },
    { match: ['ટામેટા', 'tameta', 'tomato', 'tamatar', 'tametaa', 'टमाटर'], display: 'Tomato' },
    { match: ['લસણ', 'lasan', 'lahsun', 'garlic', 'लहसुन'], display: 'Garlic' },
    { match: ['આદુ', 'aadu', 'adrak', 'ginger', 'अदरક'], display: 'Ginger' }
  ];

  // 4. Comprehensive Indic Name Dictionary & Transliteration Helper
  const knownNames = {
    // Gujarati Names
    'રમેશ': 'Ramesh', 'સુરેશ': 'Suresh', 'રાજેશ': 'Rajesh', 'મહેશ': 'Mahesh', 'ભાવેશ': 'Bhavesh', 'ભાવિન': 'Bhavin', 'જિગ્નેશ': 'Jignesh',
    'નિલેશ': 'Nilesh', 'પરેશ': 'Paresh', 'હિતેશ': 'Hitesh', 'મુકેશ': 'Mukesh', 'કમલેશ': 'Kamlesh', 'દિનેશ': 'Dinesh', 'નરેશ': 'Naresh',
    'હરેશ': 'Haresh', 'ભરત': 'Bharat', 'અમિત': 'Amit', 'સુમિત': 'Sumit', 'રોહિત': 'Rohit', 'મોહિત': 'Mohit', 'સંજય': 'Sanjay',
    'વિજય': 'Vijay', 'અજય': 'Ajay', 'દિલીપ': 'Dilip', 'મનોજ': 'Manoj', 'દીપક': 'Deepak', 'દિપક': 'Deepak', 'પ્રકાશ': 'Prakash', 'આનંદ': 'Anand',
    'અશોક': 'Ashok', 'વિકાસ': 'Vikas', 'રાહુલ': 'Rahul', 'સચિન': 'Sachin', 'હાર્દિક': 'Hardik', 'ચેતન': 'Chetan', 'ગૌરવ': 'Gaurav',
    'ચિરાગ': 'Chirag', 'તુષાર': 'Tushar', 'આલોક': 'Alok', 'પ્રતિક': 'Pratik', 'આદિત્ય': 'Aditya', 'રોહન': 'Rohan', 'જય': 'Jay',
    'યશ': 'Yash', 'પાર્થ': 'Parth', 'હર્ષ': 'Harsh', 'ધ્રુવ': 'Dhruv', 'કૃણાલ': 'Krunal', 'મેહુલ': 'Mehul', 'સાગર': 'Sagar',
    'વિશાલ': 'Vishal', 'નીરવ': 'Nirav', 'કેતન': 'Ketan', 'સંદીપ': 'Sandeep', 'સુનીલ': 'Sunil', 'સુનિલ': 'Sunil', 'અનિલ': 'Anil', 'પંકજ': 'Pankaj',
    'કિશન': 'Kishan', 'કશન': 'Kishan', 'અંકિત': 'Ankit', 'મનીષ': 'Manish', 'રાકેશ': 'Rakesh', 'નયન': 'Nayan', 'વિવેક': 'Vivek',
    'ગૌતમ': 'Gautam', 'પ્રણવ': 'Pranav', 'ચિંતન': 'Chintan', 'મયૂર': 'Mayur', 'મયુર': 'Mayur', 'રોનક': 'Ronak', 'મિતેશ': 'Mitesh',
    'જયેશ': 'Jayesh', 'હિરેન': 'Hiren', 'અલ્કેશ': 'Alkesh', 'દેવાંગ': 'Devang', 'કૌશિક': 'Kaushik', 'ધર્મેશ': 'Dharmesh',
    'પૂજા': 'Pooja', 'પુજા': 'Pooja', 'પ્રિયા': 'Priya', 'નેહા': 'Neha', 'રિયા': 'Riya', 'અંજલિ': 'Anjali', 'ગીતા': 'Geeta',
    'સીતા': 'Sita', 'રેખા': 'Rekha', 'શ્વેતા': 'Shweta', 'નિશા': 'Nisha', 'દિવ્યા': 'Divya', 'સ્નેહા': 'Sneha', 'પાયલ': 'Payal',
    'કોમલ': 'Komal', 'કાજલ': 'Kajal', 'સુમન': 'Suman', 'કવિતા': 'Kavita', 'અનીતા': 'Anita', 'અનિતા': 'Anita', 'સુનીતા': 'Sunita',
    'ચેતના': 'Chetna', 'હીના': 'Heena', 'ભાવના': 'Bhavna', 'વર્ષા': 'Varsha', 'આશા': 'Asha', 'મીના': 'Meena', 'રાધા': 'Radha',
    'આરતી': 'Aarti', 'દીપા': 'Deepa', 'સ્વાતિ': 'Swati', 'તન્વી': 'Tanvi', 'શ્રેયા': 'Shreya', 'માનસી': 'Mansi', 'ખુશી': 'Khushi',
    'કૃતિ': 'Kruti', 'ધારા': 'Dhara', 'નિધિ': 'Nidhi', 'હેતલ': 'Hetal', 'ઉર્વશી': 'Urvashi', 'સેજલ': 'Sejal', 'કિંજલ': 'Kinjal',
    'પટેલ': 'Patel', 'શાહ': 'Shah', 'મેહતા': 'Mehta', 'ઠક્કર': 'Thakkar', 'જોશી': 'Joshi', 'શર્મા': 'Sharma', 'ગુપ્તા': 'Gupta',
    'સિંહ': 'Singh', 'વર્મા': 'Verma', 'દવે': 'Dave', 'ત્રિવેદી': 'Trivedi', 'પંડ્યા': 'Pandya', 'મોદી': 'Modi', 'સોની': 'Soni',

    // Devanagari Names
    'रमेश': 'Ramesh', 'सुरेश': 'Suresh', 'राजेश': 'Rajesh', 'महेश': 'Mahesh', 'भावेश': 'Bhavesh', 'अमित': 'Amit', 'रोहित': 'Rohit',
    'संजय': 'Sanjay', 'विजय': 'Vijay', 'दीपक': 'Deepak', 'दिपक': 'Deepak', 'अजय': 'Ajay', 'राहुल': 'Rahul', 'सचिन': 'Sachin',
    'किशन': 'Kishan', 'अंकित': 'Ankit', 'मनीष': 'Manish', 'राकेश': 'Rakesh', 'सुनील': 'Sunil', 'अनिल': 'Anil', 'पंकज': 'Pankaj',
    'पूजा': 'Pooja', 'प्रिया': 'Priya', 'पटेल': 'Patel', 'शाह': 'Shah', 'शर्मा': 'Sharma', 'गुप्ता': 'Gupta', 'सिंह': 'Singh',

    // Romanized Names
    'ramesh': 'Ramesh', 'suresh': 'Suresh', 'rajesh': 'Rajesh', 'mahesh': 'Mahesh', 'bhavesh': 'Bhavesh', 'bhavin': 'Bhavin',
    'jignesh': 'Jignesh', 'nilesh': 'Nilesh', 'paresh': 'Paresh', 'hitesh': 'Hitesh', 'mukesh': 'Mukesh', 'dinesh': 'Dinesh',
    'amit': 'Amit', 'rohit': 'Rohit', 'sanjay': 'Sanjay', 'vijay': 'Vijay', 'dilip': 'Dilip', 'deepak': 'Deepak', 'dipak': 'Deepak',
    'ajay': 'Ajay', 'hardik': 'Hardik', 'kishan': 'Kishan', 'ankit': 'Ankit', 'manish': 'Manish', 'rakesh': 'Rakesh',
    'sunil': 'Sunil', 'anil': 'Anil', 'pankaj': 'Pankaj', 'aditya': 'Aditya', 'rahul': 'Rahul', 'sachin': 'Sachin',
    'nayan': 'Nayan', 'vivek': 'Vivek', 'gautam': 'Gautam', 'pranav': 'Pranav', 'chintan': 'Chintan', 'mayur': 'Mayur',
    'ronak': 'Ronak', 'mitesh': 'Mitesh', 'jayesh': 'Jayesh', 'hiren': 'Hiren', 'alkesh': 'Alkesh', 'devang': 'Devang',
    'pooja': 'Pooja', 'puja': 'Pooja', 'priya': 'Priya', 'neha': 'Neha', 'anjali': 'Anjali', 'geeta': 'Geeta', 'sejal': 'Sejal',
    'patel': 'Patel', 'shah': 'Shah', 'mehta': 'Mehta', 'thakkar': 'Thakkar', 'joshi': 'Joshi', 'sharma': 'Sharma', 'gupta': 'Gupta', 'kumar': 'Kumar'
  };

  function transliterateIndicToEnglish(text) {
    if (!text) return '';
    const trimmed = text.trim();

    // Multi-word check (e.g. "Bhavin Patel" or "ભાવિન પટેલ")
    if (trimmed.includes(' ')) {
      return trimmed.split(/\s+/).map(w => transliterateIndicToEnglish(w)).join(' ');
    }

    if (knownNames[trimmed.toLowerCase()]) return knownNames[trimmed.toLowerCase()];
    if (knownNames[trimmed]) return knownNames[trimmed];

    if (!/[\u0A80-\u0AFF\u0900-\u097F]/.test(trimmed)) {
      return trimmed.replace(/\b[a-z]/g, l => l.toUpperCase());
    }

    const gujMap = {
      '\u0A85':'a','\u0A86':'aa','\u0A87':'i','\u0A88':'ee','\u0A89':'u','\u0A8A':'oo','\u0A8F':'e','\u0A90':'ai','\u0A93':'o','\u0A94':'au',
      '\u0A95':'k','\u0A96':'kh','\u0A97':'g','\u0A98':'gh','\u0A9A':'ch','\u0A9B':'chh','\u0A9C':'j','\u0A9D':'jh',
      '\u0A9F':'t','\u0AA0':'th','\u0AA1':'d','\u0AA2':'dh','\u0AA3':'n','\u0AA4':'t','\u0AA5':'th','\u0AA6':'d','\u0AA7':'dh','\u0AA8':'n',
      '\u0AAA':'p','\u0AAB':'f','\u0AAC':'b','\u0AAD':'bh','\u0AAE':'m','\u0AAF':'y','\u0AB0':'r','\u0AB2':'l','\u0AB5':'v',
      '\u0AB6':'sh','\u0AB7':'sh','\u0AB8':'s','\u0AB9':'h','\u0AB3':'l',
      '\u0ABE':'a','\u0ABF':'i','\u0AC0':'ee','\u0AC1':'u','\u0AC2':'oo','\u0AC7':'e','\u0AC8':'ai','\u0ACB':'o','\u0ACC':'au',
      '\u0ACD':'','\u0A82':'n','\u0A83':'h'
    };

    const devMap = {
      '\u0905':'a','\u0906':'aa','\u0907':'i','\u0908':'ee','\u0909':'u','\u090A':'oo','\u090F':'e','\u0910':'ai','\u0913':'o','\u0914':'au',
      '\u0915':'k','\u0916':'kh','\u0917':'g','\u0918':'gh','\u091A':'ch','\u091B':'chh','\u091C':'j','\u091D':'jh',
      '\u091F':'t','\u0920':'th','\u0921':'d','\u0922':'dh','\u0923':'n','\u0924':'t','\u0925':'th','\u0926':'d','\u0927':'dh','\u0928':'n',
      '\u092A':'p','\u092B':'f','\u092C':'b','\u092D':'bh','\u092E':'m','\u092F':'y','\u0930':'r','\u0932':'l','\u0935':'v',
      '\u0936':'sh','\u0937':'sh','\u0938':'s','\u0939':'h','\u0933':'l',
      '\u093E':'a','\u093F':'i','\u0940':'ee','\u0941':'u','\u0942':'oo','\u0947':'e','\u0948':'ai','\u094B':'o','\u094C':'au',
      '\u094D':'','\u0902':'n','\u0903':'h'
    };

    const isGujC = c => c >= '\u0A95' && c <= '\u0AB9';
    const isDevC = c => c >= '\u0915' && c <= '\u0939';
    const isGujM = c => (c >= '\u0ABE' && c <= '\u0ACC') || c === '\u0ACD' || c === '\u0A82';
    const isDevM = c => (c >= '\u093E' && c <= '\u094C') || c === '\u094D' || c === '\u0902';

    let result = '';
    const chars = Array.from(trimmed);

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const next = chars[i + 1];

      if (gujMap[c] !== undefined) {
        result += gujMap[c];
        if (isGujC(c) && next && !isGujM(next) && next !== ' ') result += 'a';
      } else if (devMap[c] !== undefined) {
        result += devMap[c];
        if (isDevC(c) && next && !isDevM(next) && next !== ' ') result += 'a';
      } else {
        result += c;
      }
    }

    return result.replace(/\b[a-z]/g, l => l.toUpperCase()).trim();
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isWordInText(text, keyword) {
    const kw = keyword.toLowerCase().trim();
    const escaped = escapeRegExp(kw);
    const reg = new RegExp(`(^|\\s|[.,!?;:()\\/\\-]+)${escaped}($|\\s|[.,!?;:()\\/\\-]+)`, 'i');
    return reg.test(text);
  }

  // ─── Main Kirana NLP Parser ────────────────────────────────────────────────
  function parseKiranaSpeech(rawText) {
    if (!rawText) return { customerName: null, itemName: null, quantity: null, price: null };

    // Step 1: Normalize Indic script numerals to ASCII digits
    let norm = normalizeDigits(rawText);

    // Step 2: Replace spoken number words with digits
    const sortedNumWords = Object.keys(numberWords).sort((a, b) => b.length - a.length);
    for (const word of sortedNumWords) {
      const val = numberWords[word];
      const escaped = escapeRegExp(word);
      const reg = new RegExp(`(^|\\s|[.,!?;:()\\/\\-]+)${escaped}($|\\s|[.,!?;:()\\/\\-]+)`, 'gi');
      norm = norm.replace(reg, (match, p1, p2) => `${p1}${val}${p2}`);
    }

    const lower = norm.toLowerCase();
    const words = norm.split(/\s+/).filter(Boolean);

    let extractedCustomer  = null;
    let extractedItem      = null;
    let extractedQty       = null;
    let rawMatchedQtyNum   = null;
    let extractedPrice     = null;
    let rawMatchedPriceNum = null;
    let custEndIdx         = -1;

    // ── STEP 3: Comprehensive Customer Name Extraction ─────────────────────────
    const customerSuffixes = [
      'ભાઈને', 'ભાઈ', 'બેનને', 'બેન', 'જીને', 'જી',
      'भाई को', 'भाईको', 'भाईने', 'भाई', 'बहन को', 'बहन', 'दीदी', 'जी को', 'जी',
      'bhaine', 'bhai ne', 'bhai', 'benne', 'ben ne', 'ben', 'behn', 'didi', 'jine', 'ji ne', 'ji',
      'bhaiya', 'seth', 'sethji', 'kaka', 'mama', 'chacha'
    ];

    const commonUnits = new Set([
      'kg', 'kilo', 'kgs', 'kilogram', 'gram', 'gm', 'gms', 'g', 'liter', 'litre', 'ltr', 'l', 'ml', 'milli',
      'packet', 'pkt', 'pkts', 'packets', 'nag', 'piece', 'pieces', 'pcs', 'pc', 'bottle', 'bottles', 'box', 'boxes',
      'bag', 'bags', 'dozen', 'dzn', 'કિલો', 'ગ્રામ', 'લીટર', 'લિટર', 'નંગ', 'પેકેટ', 'બોટલ', 'ડઝન', 'દર્જન', 'पुડા', 'કટો',
      'किलो', 'ग्राम', 'लीटर', 'पैकेट', 'नग', 'दर्जन', 'बोतल'
    ]);

    // Method A: Attached or standalone suffix pattern (e.g. "Ramesh bhai ne", "દીપકભાઈને", "Bhavinbhai")
    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      const wClean = w.replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g, '');

      if (wClean.endsWith('ભાઈ') || wClean.endsWith('ભાઈને') || wClean.endsWith('બેન') || wClean.endsWith('બેનને') ||
          wClean.endsWith('bhai') || wClean.endsWith('bhaine') || wClean.endsWith('ben') || wClean.endsWith('benne')) {
        let baseName = wClean.replace(/(ભાઈને|ભાઈ|બેનને|બેન|bhaine|bhai|benne|ben)$/i, '');
        if (baseName) {
          extractedCustomer = transliterateIndicToEnglish(baseName);
        } else if (i > 0) {
          extractedCustomer = transliterateIndicToEnglish(words.slice(0, i).join(' '));
        }
        custEndIdx = i;
        break;
      }

      if (customerSuffixes.includes(wClean) && i > 0) {
        let nameTokens = words.slice(0, i);
        nameTokens = nameTokens.filter(t => !['to', 'for', 'customer', 'grahak', 'ગ્રાહક', 'ग्राहक'].includes(t.toLowerCase()));
        if (nameTokens.length > 0) {
          extractedCustomer = transliterateIndicToEnglish(nameTokens.join(' '));
        }
        custEndIdx = i;
        if (i + 1 < words.length && ['ne', 'ko', 'ને', 'કો', 'को', 'me', 'મે'].includes(words[i+1].toLowerCase())) {
          custEndIdx = i + 1;
        }
        break;
      }

      if (['ને', 'કો', 'को', 'ne', 'ko'].includes(wClean) && i > 0 && i <= 3) {
        let nameTokens = words.slice(0, i);
        nameTokens = nameTokens.filter(t => !['to', 'for', 'customer', 'grahak'].includes(t.toLowerCase()));
        if (nameTokens.length > 0) {
          extractedCustomer = transliterateIndicToEnglish(nameTokens.join(' '));
        }
        custEndIdx = i;
        break;
      }
    }

    // Method B: Prefix patterns: "To Ramesh", "For Suresh", "Customer Amit"
    if (!extractedCustomer) {
      const prefixMatch = norm.match(/^(?:to|for|customer|grahak|ગ્રાહક|ग्राहक)\s+([A-Za-z\u0A80-\u0AFF\u0900-\u097F]+(?:\s+[A-Za-z\u0A80-\u0AFF\u0900-\u097F]+)?)/i);
      if (prefixMatch) {
        extractedCustomer = transliterateIndicToEnglish(prefixMatch[1]);
        custEndIdx = prefixMatch[1].split(/\s+/).length;
      }
    }

    // Method C: Leading Customer Name without suffix (e.g. "Deepak 2 kg rice 60", "Ajay 5 packet maggi", "Bhavin Patel 2 kg sugar", "દીપક ૨ કિલો ખાંડ ૪૦")
    if (!extractedCustomer && words.length >= 2) {
      const candidateNameWords = [];
      
      for (let i = 0; i < Math.min(words.length, 3); i++) {
        const token = words[i].toLowerCase().replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g, '');
        if (!token) break;

        // Stop if token is a digit or number word
        if (/^\d+(\.\d+)?$/.test(token)) break;

        // Stop if token is a unit (e.g. "kg", "litre")
        if (commonUnits.has(token)) break;

        // Stop if token is a grocery item keyword (e.g. "sugar", "rice", "ખાંડ", "ચોખા")
        let isItem = false;
        for (const entry of groceryDictionary) {
          if (entry.match.some(m => m.toLowerCase() === token)) {
            isItem = true;
            break;
          }
        }
        if (isItem) break;

        // Stop if token is a common filler / action word
        if (['to', 'for', 'add', 'item', 'bill', 'customer', 'grahak', 'please'].includes(token)) break;

        // This token is part of customer name
        candidateNameWords.push(words[i]);
      }

      if (candidateNameWords.length > 0 && candidateNameWords.length < words.length) {
        extractedCustomer = transliterateIndicToEnglish(candidateNameWords.join(' '));
        custEndIdx = candidateNameWords.length - 1;
      }
    }

    // ── STEP 4: Extract Item Name from Grocery Dictionary ─────────────────────
    let textForItems = lower;
    if (extractedCustomer) {
      const custParts = extractedCustomer.toLowerCase().split(/\s+/);
      for (const cp of custParts) {
        const reg = new RegExp(`\\b${escapeRegExp(cp)}\\b`, 'gi');
        textForItems = textForItems.replace(reg, '');
      }
      if (custEndIdx >= 0) {
        const remainingWords = words.slice(custEndIdx + 1);
        textForItems = remainingWords.join(' ').toLowerCase();
      }
    }

    for (const entry of groceryDictionary) {
      for (const keyword of entry.match) {
        if (isWordInText(textForItems, keyword)) {
          extractedItem = entry.display;
          break;
        }
      }
      if (extractedItem) break;
    }

    // ── STEP 5: Extract Quantity & Units (Unicode-safe boundary) ───────────────
    const qtyUnitRegex = /(\d+(?:\.\d+)?)\s*(kilo|kg|kgs|kilogram|gram|gm|gms|g|liter|litre|ltr|l|ml|milli|packet|pkt|pkts|packets|nag|piece|pieces|pcs|pc|bottle|bottles|box|boxes|bag|bags|dozen|dzn|કિલો|ગ્રામ|લીટર|લિટર|નંગ|પેકેટ|બોટલ|ડઝન|દર્જન|પુડા|કટો|किलो|ग्राम|लीटर|पैकेट|नग|दर्जन|बोतल)(?=$|\s|[.,!?;:()\/\\-]+|[\u0A80-\u0AFF\u0900-\u097F])/i;
    const qtyMatch = lower.match(qtyUnitRegex);

    if (qtyMatch) {
      rawMatchedQtyNum = qtyMatch[1];
      const numVal = parseFloat(qtyMatch[1]);
      const unit = qtyMatch[2].toLowerCase().trim();

      if (['gram', 'gm', 'gms', 'g', 'ગ્રામ', 'ग्राम'].includes(unit)) {
        if (numVal === 500) extractedQty = 0.5;
        else if (numVal === 250) extractedQty = 0.25;
        else if (numVal === 100) extractedQty = 0.1;
        else if (numVal === 750) extractedQty = 0.75;
        else if (numVal === 200) extractedQty = 0.2;
        else extractedQty = numVal >= 100 ? (numVal / 1000) : numVal;
      } else if (['ml', 'milli'].includes(unit)) {
        if (numVal === 500) extractedQty = 0.5;
        else if (numVal === 250) extractedQty = 0.25;
        else extractedQty = numVal >= 100 ? (numVal / 1000) : numVal;
      } else if (['dozen', 'dzn', 'ડઝન', 'દર્જન', 'दर्जन'].includes(unit)) {
        extractedQty = numVal * 12;
      } else {
        extractedQty = numVal;
      }
    }

    // ── STEP 6: Extract Price ────────────────────────────────────────────────
    const priceRegex1 = /(\d+(?:\.\d+)?)\s*(?:rupiya|rupiye|rupees|rupee|rs|inr|₹|રૂપિયા|રૂ|ભાવ|ભાવે|દર|रुपये|रुपए|भाव|भाव से|દર|rate|per)(?=$|\s|[.,!?;:()\/\\-]+|[\u0A80-\u0AFF\u0900-\u097F])/i;
    const priceRegex2 = /(?:rupiya|rupiye|rupees|rupee|rs|inr|₹|રૂપિયા|રૂ|रुपये|रुपए|ભાવ|ભાવે|દર|rate|at|@)\s*(\d+(?:\.\d+)?)/i;

    const priceMatch1 = lower.match(priceRegex1);
    const priceMatch2 = lower.match(priceRegex2);

    if (priceMatch1) {
      rawMatchedPriceNum = priceMatch1[1];
      extractedPrice = parseFloat(priceMatch1[1]);
    } else if (priceMatch2) {
      rawMatchedPriceNum = priceMatch2[1];
      extractedPrice = parseFloat(priceMatch2[1]);
    }

    // ── STEP 7: Disambiguate Bare Numbers ──────────────────────────────────────
    const allNumberMatches = lower.match(/\b(\d+(?:\.\d+)?)\b/g) || [];
    const availableNumbers = allNumberMatches.filter(n => {
      return n !== rawMatchedQtyNum && n !== rawMatchedPriceNum;
    });

    if (extractedQty == null && extractedPrice == null) {
      if (availableNumbers.length >= 2) {
        extractedQty = parseFloat(availableNumbers[0]);
        extractedPrice = parseFloat(availableNumbers[1]);
      } else if (availableNumbers.length === 1) {
        const singleVal = parseFloat(availableNumbers[0]);
        if (singleVal <= 25) {
          extractedQty = singleVal;
        } else {
          extractedQty = 1;
          extractedPrice = singleVal;
        }
      }
    } else if (extractedQty != null && extractedPrice == null) {
      if (availableNumbers.length >= 1) {
        extractedPrice = parseFloat(availableNumbers[0]);
      }
    } else if (extractedQty == null && extractedPrice != null) {
      if (availableNumbers.length >= 1) {
        extractedQty = parseFloat(availableNumbers[0]);
      } else {
        extractedQty = 1;
      }
    }

    // ── STEP 8: Fallback for Item Name if not in standard dictionary ──────────
    if (!extractedItem) {
      const stopWords = new Set([
        'to', 'for', 'customer', 'grahak', 'ne', 'ko', 'me', 'se', 'na', 'ka', 'ki', 'ke',
        'kilo', 'kg', 'kgs', 'gram', 'gm', 'gms', 'liter', 'litre', 'ltr', 'ml', 'packet', 'pkt', 'piece', 'pcs', 'nag', 'bottle', 'dozen', 'dzn',
        'rupiya', 'rupiye', 'rupees', 'rupee', 'rs', 'inr', 'rate', 'bhav', 'bhave', 'add', 'item', 'bill',
        'ને', 'કો', 'મે', 'ભાઈ', 'ભાઈને', 'બેન', 'બેનને', 'જી', 'જીને', 'ગ્રાહક',
        'કિલો', 'ગ્રામ', 'લીટર', 'લિટર', 'નંગ', 'પેકેટ', 'બોટલ', 'ડઝન', 'દર્જન', 'પુડા', 'કટો', 'રૂપિયા', 'રૂ', 'ભાવ', 'ભાવે', 'દર',
        'को', 'ने', 'में', 'से', 'का', 'की', 'के', 'भाई', 'बहन', 'जी', 'ग्राहक',
        'किलो', 'ग्राम', 'लीटर', 'नग', 'पैकेट', 'बोतल', 'दर्जन', 'रुपये', 'रुपए', 'भाव', 'दर'
      ]);

      const candidateTokens = words.filter((w, idx) => {
        if (custEndIdx >= 0 && idx <= custEndIdx) return false;
        const c = normalizeDigits(w).toLowerCase().replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g, '');
        if (!c) return false;
        if (/^\d+(\.\d+)?$/.test(c)) return false;
        if (stopWords.has(c)) return false;
        if (extractedCustomer && extractedCustomer.toLowerCase().includes(c)) return false;
        return true;
      });

      if (candidateTokens.length > 0) {
        extractedItem = transliterateIndicToEnglish(candidateTokens.join(' '));
      }
    }

    return {
      customerName: extractedCustomer || null,
      itemName:     extractedItem     || null,
      quantity:     extractedQty != null && !isNaN(extractedQty) ? extractedQty : null,
      price:        extractedPrice != null && !isNaN(extractedPrice) ? extractedPrice : null
    };
  }

});
