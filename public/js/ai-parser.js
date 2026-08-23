/**
 * Smart Vyapar — AI Voice Parser
 * Dual Architecture:
 * 1. Server-side proxy (/server/api/ai_parse.php & /api/ai_parse) using Hostinger .env key
 * 2. Client-side direct fallback using browser localStorage key
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

  // Default backup key embedded so it works everywhere even without manual input
  const DEFAULT_GEMINI_KEY = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';

  function getGeminiKey() {
    return (localStorage.getItem('sv_gemini_key') || '').trim() || DEFAULT_GEMINI_KEY;
  }
  function getGroqKey() {
    return (localStorage.getItem('sv_groq_key') || '').trim();
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
      const text = data.text?.trim();
      if (!text || text.length < 2 || /^(\.|\?|Prices in|Thank you|Subtitles)/i.test(text)) {
        return null;
      }
      return text;
    } catch (e) {
      return null;
    }
  }

  // ─── AI Extraction: Server Proxy First, Then Direct Client Fallback ───────
  async function extractWithGemini(transcript) {
    if (!transcript) return null;

    // Step 1: Try Server-side PHP/Vercel endpoint (Hostinger .env backend)
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
            console.log(`[AI Parser] Extracted via server endpoint (${endpoint}):`, json.data);
            return json.data;
          }
        }
      } catch (err) {
        // Server endpoint not available, try next or client direct
      }
    }

    // Step 2: Fallback to Direct Client-side Gemini API Call
    return extractDirectWithGemini(transcript);
  }

  // ─── Direct Client-side Gemini Call ──────────────────────────────────────
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
1. customerName: Person's name in English Latin letters. Remove suffixes like bhai, ben, ji, ko, ne. (e.g. "રમેશભાઈ" -> "Rameshbhai", "સુરેશ" -> "Suresh"). If no customer mentioned, return null.
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

  return {
    transcribeAudio,
    extractWithGemini,
    isGeminiConfigured: () => !!getGeminiKey(),
    isGroqConfigured:   () => !!getGroqKey(),
    saveGeminiKey: (k) => localStorage.setItem('sv_gemini_key', k.trim()),
    saveGroqKey:   (k) => localStorage.setItem('sv_groq_key',   k.trim()),
    getGeminiKey,
    getGroqKey
  };

})();
