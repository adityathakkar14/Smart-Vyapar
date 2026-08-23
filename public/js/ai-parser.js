/**
 * Smart Vyapar — AI Voice Parser
 * Dual Architecture:
 * 1. Server-side proxy (/server/api/ai_parse.php & /api/ai_parse) using Hostinger .env key
 * 2. Direct client-side Gemini Multimodal Audio & Text Extraction
 */
const SmartVyaparAI = (() => {

  const SERVER_ENDPOINTS = [
    '/server/api/ai_parse.php',
    '../server/api/ai_parse.php',
    '/api/ai_parse'
  ];

  const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/audio/transcriptions';
  const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  const GEMINI_MODELS  = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash'
  ];

  const DEFAULT_GEMINI_KEY = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';

  function getGeminiKey() {
    return (localStorage.getItem('sv_gemini_key') || '').trim() || DEFAULT_GEMINI_KEY;
  }
  function getGroqKey() {
    return (localStorage.getItem('sv_groq_key') || '').trim();
  }

  // Convert Blob to Base64 helper
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ─── Direct Audio to Gemini AI (Listens in Gujarati/Hindi/English natively) ──
  async function extractAudioWithGemini(audioBlob, mimeType = 'audio/webm') {
    if (!audioBlob || audioBlob.size < 1000) return null;

    try {
      const base64Audio = await blobToBase64(audioBlob);

      // 1. Try server endpoint first
      for (const endpoint of SERVER_ENDPOINTS) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: mimeType || 'audio/webm',
              apiKey: getGeminiKey()
            }),
            signal: controller.signal
          });
          clearTimeout(timeout);

          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              console.log('[AI Audio] Server extracted from raw audio:', json.data);
              return json.data;
            }
          }
        } catch (e) {}
      }

      // 2. Direct client-side Gemini Multimodal call
      return directAudioCallToGemini(base64Audio, mimeType);

    } catch (e) {
      console.warn('[AI Audio] Error:', e.message);
      return null;
    }
  }

  async function directAudioCallToGemini(base64Audio, mimeType, modelIndex = 0) {
    const geminiKey = getGeminiKey();
    if (!geminiKey || modelIndex >= GEMINI_MODELS.length) return null;

    const model = GEMINI_MODELS[modelIndex];
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`;

    const prompt = `You are a billing assistant for an Indian retail/grocery store.
Listen to this voice audio spoken in Gujarati, Hindi, or English.
Extract structured billing details and return ONLY valid JSON:
{
  "customerName": "English name or null",
  "itemName": "English grocery/product name or null",
  "quantity": number or null,
  "price": number or null,
  "transcription": "Spoken text in original language"
}
Rules:
1. customerName: English Latin letters (e.g. Ramesh, Suresh, Pooja).
2. itemName: Translate/standardize to English (e.g. Rice, Sugar, Cooking Oil, Wheat Flour, Soap).
3. quantity: Numeric only.
4. price: Numeric only in rupees.`;

    const body = {
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json'
      }
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 404 || res.status === 400) {
        return directAudioCallToGemini(base64Audio, mimeType, modelIndex + 1);
      }

      if (!res.ok) return null;

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) return null;

      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        customerName: parsed.customerName ? String(parsed.customerName).trim() : null,
        itemName: parsed.itemName ? String(parsed.itemName).trim() : null,
        quantity: parsed.quantity != null && !isNaN(parsed.quantity) ? parseFloat(parsed.quantity) : null,
        price: parsed.price != null && !isNaN(parsed.price) ? parseFloat(parsed.price) : null,
        transcription: parsed.transcription || ''
      };

    } catch (e) {
      return null;
    }
  }

  // ─── Text Transcript to Gemini AI ─────────────────────────────────────────
  async function extractWithGemini(transcript) {
    if (!transcript) return null;

    // Try server endpoint first
    for (const endpoint of SERVER_ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            apiKey: getGeminiKey()
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            return json.data;
          }
        }
      } catch (err) {}
    }

    // Direct client fallback
    return extractDirectWithGemini(transcript);
  }

  async function extractDirectWithGemini(transcript, modelIndex = 0) {
    const geminiKey = getGeminiKey();
    if (!geminiKey || modelIndex >= GEMINI_MODELS.length) return null;

    const model = GEMINI_MODELS[modelIndex];
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`;

    const prompt = `You are a billing assistant for an Indian retail/grocery store.
Extract structured billing details from this spoken text into JSON.

Spoken input: "${transcript}"

Return ONLY valid JSON (no explanation, no markdown block):
{
  "customerName": "English name or null",
  "itemName": "English grocery/product name or null",
  "quantity": number or null,
  "price": number or null
}

Rules:
1. customerName: Person's name in English Latin letters. Remove suffixes like bhai, ben, ji, ko, ne, me (e.g. "રમેશ" -> "Ramesh", "સુરેશ" -> "Suresh"). If no customer mentioned, return null.
2. itemName: ALWAYS translate or standardize the product to English. (e.g. ચોખા/चावल -> "Rice", ખાંડ/चीनी -> "Sugar", તેલ/तेल -> "Cooking Oil", ઘી/घी -> "Desi Ghee", દૂધ/दूध -> "Milk", દાળ/દાલ -> "Tuver Dal", સાબુ -> "Soap", Cadbury -> "Cadbury").
3. quantity: Numeric quantity only (no unit strings). Parse spoken numbers ("ek"->1, "be"->2, "tran"->3, "panch"->5, "das"->10, "darjan"->12). If omitted, return null.
4. price: Numeric price per unit in rupees only. Parse spoken prices ("chalis"->40, "pachas"->50, "sau"->100, "basso"->200). If omitted, return null.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json'
      }
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 404 || res.status === 400) {
        return extractDirectWithGemini(transcript, modelIndex + 1);
      }

      if (!res.ok) return null;

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) return null;

      const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        customerName : typeof parsed.customerName === 'string' ? parsed.customerName.trim() || null : null,
        itemName     : typeof parsed.itemName === 'string' ? parsed.itemName.trim() || null : null,
        quantity     : parsed.quantity != null && !isNaN(parsed.quantity) ? parseFloat(parsed.quantity) : null,
        price        : parsed.price != null && !isNaN(parsed.price) ? parseFloat(parsed.price) : null
      };

    } catch (e) {
      return null;
    }
  }

  // ─── Groq Whisper ASR ───────────────────────────────────────────────────
  async function transcribeAudio(audioBlob, langCode) {
    const groqKey = getGroqKey();
    if (!groqKey || !audioBlob || audioBlob.size < 1500) return null;

    const langMap = { 'gu-IN': 'gu', 'hi-IN': 'hi', 'en-IN': 'en' };
    const lang = langMap[langCode] || 'en';

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', lang);
    formData.append('temperature', '0');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) return null;
      const data = await res.json();
      return data.text?.trim() || null;
    } catch (e) {
      return null;
    }
  }

  return {
    extractWithGemini,
    extractAudioWithGemini,
    transcribeAudio,
    isGeminiConfigured: () => !!getGeminiKey(),
    isGroqConfigured:   () => !!getGroqKey(),
    saveGeminiKey: (k) => localStorage.setItem('sv_gemini_key', k.trim()),
    saveGroqKey:   (k) => localStorage.setItem('sv_groq_key',   k.trim()),
    getGeminiKey,
    getGroqKey
  };

})();
