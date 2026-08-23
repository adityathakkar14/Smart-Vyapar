/**
 * Smart Vyapar — AI Voice Parser
 * Uses: Google Gemini (NLP extraction) + Groq Whisper (ASR fallback)
 * Both free tier APIs.
 */
const SmartVyaparAI = (() => {

  const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/audio/transcriptions';
  const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  // Active Gemini models for Google AI Studio
  const GEMINI_MODELS  = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.5-flash'
  ];

  function getGeminiKey() { return (localStorage.getItem('sv_gemini_key') || '').trim(); }
  function getGroqKey()   { return (localStorage.getItem('sv_groq_key')   || '').trim(); }

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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[Groq Whisper] API Error:', err.error?.message || res.status);
        return null;
      }
      const data = await res.json();
      const text = data.text?.trim();
      
      // Filter out empty or obvious hallucinations
      if (!text || text.length < 2 || /^(\.|\?|Prices in|Thank you|Subtitles)/i.test(text)) {
        return null;
      }
      return text;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[Groq Whisper] Fetch error:', e.message);
      return null;
    }
  }

  // ─── Google Gemini NLP Extraction ────────────────────────────────────────
  async function extractWithGemini(transcript, modelIndex = 0) {
    const geminiKey = getGeminiKey();
    if (!geminiKey || !transcript) return null;
    if (modelIndex >= GEMINI_MODELS.length) {
      console.warn('[Gemini] All model endpoints failed. Please check your Gemini API Key.');
      return null;
    }

    const model = GEMINI_MODELS[modelIndex];
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`;

    const prompt = `You are a billing assistant for an Indian retail/grocery store.
Extract structured billing details from this spoken text. The text may be in Gujarati, Hindi, English, or mixed.

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
2. itemName: ALWAYS translate or standardize the product to English. (e.g. ચોખા/चावल -> "Rice", ખાંડ/चीनी -> "Sugar", તેલ/तेल -> "Cooking Oil", ઘી/घी -> "Desi Ghee", દૂધ/दूध -> "Milk", દાળ/दाल -> "Tuver Dal", સાબુ -> "Soap", Cadbury -> "Cadbury").
3. quantity: Numeric quantity only (no unit strings). Parse spoken numbers ("ek"->1, "be"->2, "tran"->3, "panch"->5, "das"->10, "darjan"->12). If omitted, return null.
4. price: Numeric price per unit in rupees only. Parse spoken prices ("pachas"->50, "sau"->100, "basso"->200). If omitted, return null.`;

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
        // Try fallback model
        return extractWithGemini(transcript, modelIndex + 1);
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[Gemini] API error:', err.error?.message || res.status);
        return null;
      }

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
      if (e.name !== 'AbortError') console.warn('[Gemini] Extraction error:', e.message);
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
