/**
 * Smart Vyapar — Universal Voice Engine (iOS, Android, Chrome, Safari, Edge)
 * Supports:
 * 1. Web Speech API (Chrome, Android, Edge, Desktop)
 * 2. MediaRecorder Audio Stream Fallback (iOS Safari, iPhone, iPad, Firefox)
 * 3. Google Gemini AI NLP Extraction (100% English billing details)
 */
document.addEventListener('DOMContentLoaded', () => {

  // ─── DOM References ──────────────────────────────────────────────────────
  const btnMic              = document.getElementById('btn-mic');
  const langSelect          = document.getElementById('voice-lang-select');
  const transcriptContainer  = document.getElementById('transcript-container');
  const rawTranscriptEl     = document.getElementById('raw-transcript');
  const statusEl            = document.getElementById('voice-status-text');

  const customerNameInput   = document.getElementById('customer-name');
  const itemNameInput       = document.getElementById('item-name');
  const itemQtyInput        = document.getElementById('item-qty');
  const itemPriceInput      = document.getElementById('item-price');

  // ─── Browser Capability Detection ─────────────────────────────────────────
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
    } catch (e) {
      console.warn('[Voice] SpeechRecognition constructor error:', e);
      recognition = null;
    }
  }

  let isListening       = false;
  let hasTranscript     = false;
  let mediaRecorder     = null;
  let audioChunks       = [];
  let webSpeechText     = '';
  let recordingTimer    = null;

  // ─── Mic Button Click Handler (Universal) ─────────────────────────────────
  btnMic.addEventListener('click', async () => {
    if (isListening) {
      stopAllListening();
      return;
    }

    // Clear previous transcript and previous inputs on new recording
    transcriptContainer.classList.remove('d-none');
    rawTranscriptEl.textContent = '';
    setStatus('🎤 Listening... Speak naturally');
    hasTranscript = false;
    webSpeechText = '';
    audioChunks = [];

    // Automatically clear previous item inputs for fresh input
    if (itemNameInput) itemNameInput.value = '';
    if (itemQtyInput) itemQtyInput.value = '';
    if (itemPriceInput) itemPriceInput.value = '';

    isListening = true;
    btnMic.classList.add('listening');

    // 1. Try Web Speech API (if supported on this device/browser)
    if (recognition) {
      recognition.lang = langSelect.value;
      try {
        recognition.start();
      } catch (e) {
        console.warn('[Voice] Web Speech start notice:', e);
      }
    }

    // 2. Start MediaRecorder (for iOS Safari audio stream / Groq fallback)
    await startMediaRecorder();

    // Auto-stop after 8 seconds of continuous recording if user doesn't tap again
    clearTimeout(recordingTimer);
    recordingTimer = setTimeout(() => {
      if (isListening) stopAllListening();
    }, 8000);
  });

  // ─── MediaRecorder Audio Capture ──────────────────────────────────────────
  async function startMediaRecorder() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMime();
      const options = mimeType ? { mimeType } : {};
      
      mediaRecorder = new MediaRecorder(stream, options);
      audioChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunks.push(e.data);
        }
      };

      mediaRecorder.start(250);
    } catch (e) {
      console.warn('[Voice] Audio recording error:', e.message);
      mediaRecorder = null;
    }
  }

  function getSupportedAudioMime() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/wav'];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  function stopMediaRecorder() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
        mediaRecorder.stream?.getTracks().forEach(t => t.stop());
      } catch (e) {}
    }
  }

  // ─── Web Speech Recognition Callbacks ─────────────────────────────────────
  if (recognition) {
    recognition.onstart = () => {
      const langName = langSelect.options[langSelect.selectedIndex].text;
      setStatus(`🎤 Listening (${langName})... Speak now`);
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (const result of event.results) {
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      rawTranscriptEl.textContent = (final || interim).trim();
      if (final) webSpeechText = final.trim();
    };

    recognition.onerror = (event) => {
      console.warn('[Voice] SpeechRecognition status:', event.error);
      if (event.error === 'not-allowed') {
        setStatus('⚠️ Microphone permission required.');
      }
    };

    recognition.onend = () => {
      if (isListening) {
        stopAllListening();
      }
    };
  }

  // ─── Stop Listening & Process Pipeline ────────────────────────────────────
  async function stopAllListening() {
    clearTimeout(recordingTimer);
    isListening = false;
    btnMic.classList.remove('listening');

    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    stopMediaRecorder();

    // Give MediaRecorder a moment to flush final data chunk
    setTimeout(async () => {
      const transcript = webSpeechText || rawTranscriptEl.textContent.trim();
      await processSpeech(transcript);
    }, 300);
  }

  // ─── Speech Processing Engine ─────────────────────────────────────────────
  async function processSpeech(transcriptText) {
    setStatus('⏳ Processing with AI...');

    let finalTranscript = transcriptText;

    // If Web Speech didn't capture text (e.g. on iOS Safari), transcribe audio chunks with Groq Whisper
    if ((!finalTranscript || finalTranscript.length < 2) && audioChunks.length > 0) {
      setStatus('🔊 Transcribing voice audio...');
      const audioBlob = new Blob(audioChunks, {
        type: mediaRecorder?.mimeType || 'audio/mp4'
      });
      const groqTranscript = await SmartVyaparAI.transcribeAudio(audioBlob, langSelect.value);
      if (groqTranscript) {
        finalTranscript = groqTranscript;
        rawTranscriptEl.textContent = groqTranscript;
      }
    }

    if (!finalTranscript) {
      setStatus('❓ No speech heard. Tap mic and speak clearly.');
      return;
    }

    rawTranscriptEl.textContent = finalTranscript;

    // LAYER 3: Google Gemini AI extraction
    setStatus('🧠 Gemini is understanding your speech...');
    const result = await SmartVyaparAI.extractWithGemini(finalTranscript);
    if (result) {
      fillForm(result.customerName, result.itemName, result.quantity, result.price);
      setStatus('✅ Done! Details filled in English.');
      return;
    }

    // FALLBACK: Offline regex parser
    setStatus('⚙️ Using offline parser...');
    const fallback = parseWithRegex(finalTranscript);
    fillForm(fallback.customerName, fallback.itemName, fallback.quantity, fallback.price);
    setStatus('⚙️ Parsed offline');
  }

  // ─── Form Auto-Fill ───────────────────────────────────────────────────────
  function fillForm(customerName, itemName, quantity, price) {
    let autofilled = false;

    if (customerName) {
      customerNameInput.value = customerName;
      autofilled = true;
    }
    if (itemName) {
      itemNameInput.value = itemName;
      autofilled = true;
    }
    if (quantity != null && !isNaN(quantity)) {
      itemQtyInput.value = quantity;
      autofilled = true;
    }
    if (price != null && !isNaN(price)) {
      itemPriceInput.value = price;
      autofilled = true;
    }

    hasTranscript = true;

    if (autofilled) {
      window.showToast?.('🎤 Voice input parsed in English!');
      const formEl = document.getElementById('billing-form');
      if (formEl) {
        formEl.style.transition = 'box-shadow 0.3s ease';
        formEl.style.boxShadow = '0 0 15px rgba(15, 76, 92, 0.5)';
        setTimeout(() => { formEl.style.boxShadow = 'none'; }, 1800);
      }
    } else {
      setStatus("❓ Couldn't extract product details. Please try speaking again.");
    }
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  // ─── Hide transcript when user adds item ─────────────────────────────────
  const btnAddItem = document.getElementById('btn-add-item');
  if (btnAddItem) {
    btnAddItem.addEventListener('click', () => {
      if (hasTranscript) {
        transcriptContainer.classList.add('d-none');
        rawTranscriptEl.textContent = '';
        hasTranscript = false;
        setStatus('');
      }
    }, true);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK: Local Regex / NLP Parser (offline mode)
  // ═══════════════════════════════════════════════════════════════════════════

  function normalizeDigits(text) {
    const guj = {'૦':'0','૧':'1','૨':'2','૩':'3','૪':'4','૫':'5','૬':'6','૭':'7','૮':'8','૯':'9'};
    const dev = {'०':'0','१':'1','२':'2','३':'3','४':'4','५':'5','६':'6','७':'7','८':'8','९':'9'};
    let r = text;
    for (const [k,v] of Object.entries(guj)) r = r.split(k).join(v);
    for (const [k,v] of Object.entries(dev)) r = r.split(k).join(v);
    return r;
  }

  function transliterateToEnglish(text) {
    if (!text) return '';
    if (!/[\u0A80-\u0AFF\u0900-\u097F]/.test(text)) {
      return text.replace(/\b\w/g, l => l.toUpperCase()).trim();
    }
    let t = text
      .replace(/ભાઈને|ભાઈ|भाई/g, 'bhai').replace(/બેનને|બેન|बहन/g, 'ben').replace(/જીને|જી|जी/g, 'ji')
      .replace(/રમેશ/g,'ramesh').replace(/સુરેશ/g,'suresh').replace(/રાજેશ/g,'rajesh')
      .replace(/મહેશ/g,'mahesh').replace(/જિગ્નેશ|જીગ્નેશ/g,'jignesh').replace(/ભાવેશ/g,'bhavesh')
      .replace(/પૂજા|પુજા/g,'pooja').replace(/અમિત/g,'amit').replace(/રોહિત/g,'rohit')
      .replace(/સંજય/g,'sanjay').replace(/વિજય/g,'vijay').replace(/દિલીપ/g,'dilip')
      .replace(/કુમાર/g,'kumar').replace(/પટેલ/g,'patel').replace(/શાહ/g,'shah')
      .replace(/ઠક્કર/g,'thakkar').replace(/જોશી/g,'joshi').replace(/મેહતા/g,'mehta')
      .replace(/શર્મા/g,'sharma').replace(/ગુપ્તા/g,'gupta').replace(/સિંહ/g,'singh');
    const gujMap = {'\u0A85':'a','\u0A86':'aa','\u0A87':'i','\u0A88':'i','\u0A89':'u','\u0A8A':'u','\u0A93':'o','\u0A94':'au','\u0A95':'k','\u0A96':'kh','\u0A97':'g','\u0A98':'gh','\u0A9A':'ch','\u0A9C':'j','\u0A9F':'t','\u0AA0':'th','\u0AA4':'t','\u0AA5':'th','\u0AA6':'d','\u0AA7':'dh','\u0AA8':'n','\u0AAA':'p','\u0AAC':'b','\u0AAD':'bh','\u0AAE':'m','\u0AAF':'y','\u0AB0':'r','\u0AB2':'l','\u0AB5':'v','\u0AB6':'sh','\u0AB8':'s','\u0AB9':'h','\u0ABE':'a','\u0ABF':'i','\u0AC0':'i','\u0AC1':'u','\u0AC2':'u','\u0AC7':'e','\u0AC8':'ai','\u0ACB':'o','\u0ACC':'au','\u0ACD':'','\u0A82':'n'};
    const devMap = {'\u0915':'k','\u0916':'kh','\u0917':'g','\u091A':'ch','\u091C':'j','\u0924':'t','\u0925':'th','\u0926':'d','\u0927':'dh','\u0928':'n','\u092A':'p','\u092C':'b','\u092D':'bh','\u092E':'m','\u092F':'y','\u0930':'r','\u0932':'l','\u0935':'v','\u0936':'sh','\u0938':'s','\u0939':'h','\u093E':'a','\u093F':'i','\u0940':'i','\u0941':'u','\u0942':'u','\u0947':'e','\u0948':'ai','\u094B':'o','\u094C':'au','\u094D':'','\u0902':'n'};
    const isGujC = c => c >= '\u0A95' && c <= '\u0AB9';
    const isDevC = c => c >= '\u0915' && c <= '\u0939';
    const isGujM = c => (c >= '\u0ABE' && c <= '\u0ACC') || c === '\u0ACD' || c === '\u0A82';
    const isDevM = c => (c >= '\u093E' && c <= '\u094C') || c === '\u094D' || c === '\u0902';
    let result = '';
    const chars = Array.from(t);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i], next = chars[i+1];
      if (gujMap[c] !== undefined) { result += gujMap[c]; if (isGujC(c) && next && !isGujM(next) && next !== ' ') result += 'a'; }
      else if (devMap[c] !== undefined) { result += devMap[c]; if (isDevC(c) && next && !isDevM(next) && next !== ' ') result += 'a'; }
      else result += c;
    }
    return result.replace(/\b\w/g, l => l.toUpperCase()).trim();
  }

  const numberWords = {
    'અડધો':'0.5','અડધી':'0.5','એક':'1','બે':'2','ત્રણ':'3','ચાર':'4','પાંચ':'5','છ':'6','સાત':'7','આઠ':'8','નવ':'9','દસ':'10','પંદર':'15','વીસ':'20','પચ્ચીસ':'25','ત્રીસ':'30','ચાલીસ':'40','પચાસ':'50','સો':'100','બસો':'200','પાંચસો':'500',
    'आधा':'0.5','एक':'1','दो':'2','तीन':'3','चार':'4','पांच':'5','छह':'6','सात':'7','आठ':'8','नौ':'9','दस':'10','पंद्रह':'15','बीस':'20','तीस':'30','चालीस':'40','पचास':'50','सौ':'100',
    'ek':'1','be':'2','do':'2','tran':'3','teen':'3','char':'4','panch':'5','chhe':'6','sat':'7','aath':'8','nav':'9','das':'10','pandar':'15','vis':'20','tis':'30','chalis':'40','pachas':'50','so':'100','sau':'100',
    'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10','fifteen':'15','twenty':'20','thirty':'30','forty':'40','fifty':'50','hundred':'100'
  };

  const groceryDict = [
    {match:['ચોખા','chokha','chawal','चावल','rice','basmati','kolam','કોલમ'],display:'Rice'},
    {match:['ખાંડ','khand','cheeni','chini','चीनी','sugar','શક્કર'],display:'Sugar'},
    {match:['તેલ','tel','oil','singtel','સીંગતેલ','kapasiya','sunflower'],display:'Cooking Oil'},
    {match:['ઘી','ghee','ghi','घी'],display:'Desi Ghee'},
    {match:['ઘઉં','ghau','gehun','gehu','गेहूं','wheat','લોટ','lot','atta','આટો','आटा'],display:'Wheat Flour'},
    {match:['તુવેરદાળ','tuver','toor','arhar','tuverdal'],display:'Tuver Dal'},
    {match:['દાળ','dal','daal','दाल'],display:'Dal'},
    {match:['મગ','moong','mung','मूंग'],display:'Moong Dal'},
    {match:['ચણા','chana','chane','चना','chole','besan'],display:'Chana'},
    {match:['ચા','chai','chay','चाय','tea','wagh bakri','waghbakri'],display:'Tea'},
    {match:['કોફી','coffee','kofi','कॉफी','nescafe'],display:'Coffee'},
    {match:['દૂધ','dudh','doodh','दूध','milk','amul'],display:'Milk'},
    {match:['દહીં','dahi','curd','दही'],display:'Curd'},
    {match:['પનીર','paneer','पनीर'],display:'Paneer'},
    {match:['મીઠું','mithu','namak','नमक','salt'],display:'Salt'},
    {match:['હળદર','haldar','haldi','हल्दी','turmeric'],display:'Turmeric Powder'},
    {match:['મરચું','marchu','mirchi','mirch','मिर्च','chilli'],display:'Chilli Powder'},
    {match:['જીરું','jiru','jeera','जीરા','cumin'],display:'Cumin Seeds'},
    {match:['ગરમ મસાલો','garam masala','masala','मसाला'],display:'Garam Masala'},
    {match:['સાબુ','sabu','soap','साबुन','lifebuoy','dettol','lux','santoor'],display:'Soap'},
    {match:['સર્ફ','surf','detergent','ariel','tide','nirma','ghadi'],display:'Detergent'},
    {match:['ટૂથપેસ્ટ','toothpaste','colgate','pepsodent'],display:'Toothpaste'},
    {match:['બિસ્કીટ','biscuit','biskut','बिस्कुट','parle','marie','oreo'],display:'Biscuits'},
    {match:['મેગી','maggi','noodles','magi','yippee'],display:'Noodles'},
    {match:['ગોળ','gol','gud','jaggery'],display:'Jaggery'},
    {match:['પૌઆ','pauva','poha'],display:'Poha'},
    {match:['સુજી','suji','rawa','रवा'],display:'Suji/Rava'},
    {match:['માચીસ','machis','matchbox'],display:'Matchbox'},
    {match:['મેંદો','maida'],display:'Maida Flour'},
    {match:['shampoo','शैम्पू','dove','sunsilk'],display:'Shampoo'}
  ];

  function parseWithRegex(transcript) {
    let norm = normalizeDigits(transcript);
    const tokens = norm.split(/\s+/);
    norm = tokens.map(t => { const c=t.toLowerCase().trim(); return numberWords[c]||t; }).join(' ');
    const lower = norm.toLowerCase();
    const words = norm.split(/\s+/);

    let rawCustomer='', parsedItem='', parsedQty='', parsedPrice='';

    for (let i=0; i<words.length; i++) {
      const w = words[i].toLowerCase();
      if (['ને','ભાઈને','બેનને','કો','को','ne','ko'].includes(w) && i>0) {
        rawCustomer = words.slice(0,i).join(' ').replace(/^(to|for|customer)\s+/i,'');
        break;
      }
      if ((w.endsWith('ભાઈ')||w.endsWith('બેન')||w.endsWith('bhai')||w.endsWith('ben')) && i<=1) {
        rawCustomer = words[i]; break;
      }
    }
    if (!rawCustomer && /^(?:to|for)\s+(\S+)/i.test(norm)) {
      rawCustomer = norm.match(/^(?:to|for)\s+(\S+)/i)?.[1] || '';
    }

    const parsedCustomer = transliterateToEnglish(rawCustomer);

    const qm = lower.match(/(\d+(?:\.\d+)?)\s*(kilo|kg|liter|litre|gram|gm|ltr|ml|nag|piece|pcs|packet|pkt|bottle|dozen|dzn|કિલો|ગ્રામ|લીટર|નંગ|પેકેટ|ડઝન)\b/i);
    if (qm) parsedQty = qm[1];

    const pm = lower.match(/(\d+(?:\.\d+)?)\s*(?:rupiya|rupees|rs|₹|રૂપિયા|रुपये|ભાવે|rate)\b/i);
    if (pm) parsedPrice = pm[1];

    for (const entry of groceryDict) {
      if (entry.match.some(kw => lower.includes(kw.toLowerCase()))) { parsedItem = entry.display; break; }
    }

    const allNums = lower.match(/(\d+(?:\.\d+)?)/g) || [];
    if (!parsedQty && !parsedPrice) {
      if (allNums.length >= 2) { parsedQty = allNums[0]; parsedPrice = allNums[1]; }
      else if (allNums.length === 1) { (parseFloat(allNums[0])<=25 ? (parsedQty=allNums[0]) : (parsedPrice=allNums[0])); }
    } else if (!parsedQty && parsedPrice) {
      const r = allNums.filter(n=>n!==parsedPrice); if (r.length) parsedQty=r[0];
    } else if (parsedQty && !parsedPrice) {
      const r = allNums.filter(n=>n!==parsedQty); if (r.length) parsedPrice=r[0];
    }

    if (!parsedItem) {
      const stopWords = new Set(['to','for','ne','ko','kilo','kg','gram','gm','liter','rs','rupees','rupiya','ને','કો','ભાઈ','ભાઈને','બેન','બેનને','જી','કિલો','ગ્રામ','લીટર','નંગ','પેકેટ','ડઝન','રૂપિયા','रुपये','को','जी']);
      const cands = words.filter(w => {
        const c = normalizeDigits(w).toLowerCase().replace(/^[^\w\u0A80-\u0AFF\u0900-\u097F]+|[^\w\u0A80-\u0AFF\u0900-\u097F]+$/g,'');
        const isCust = rawCustomer && rawCustomer.toLowerCase().includes(c);
        return c && !c.match(/^\d+(\.\d+)?$/) && !stopWords.has(c) && !isCust;
      });
      if (cands.length) parsedItem = transliterateToEnglish(cands.join(' '));
    }

    return {
      customerName: parsedCustomer || null,
      itemName: parsedItem || null,
      quantity: parsedQty ? parseFloat(parsedQty) : null,
      price: parsedPrice ? parseFloat(parsedPrice) : null
    };
  }

});
