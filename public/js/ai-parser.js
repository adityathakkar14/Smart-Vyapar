/**
 * Smart Vyapar — AI Voice Parser
 * Uses: Groq Whisper (ASR) + Google Gemini (NLP extraction)
 * Both are 100% FREE on their respective free tiers.
 */
const SmartVyaparAI = (() => {

  // ─── Config ───────────────────────────────────────────────────────────────
  const GROQ_ENDPOINT  = 'https://api.groq.com/openai/v1/audio/transcriptions';
  const GEMINI_BASE    = 'https://generativelanguage.googleapis.com/v1beta/models';
  // Try models in order; first one that works is used
  const GEMINI_MODELS  = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];
  const GROQ_ASR_MODEL = 'whisper-large-v3-turbo';

  // ─── Keys from localStorage ──────────────────────────────────────────────
  function getGeminiKey() { return (localStorage.getItem('sv_gemini_key') || '').trim(); }
  function getGroqKey()   { return (localStorage.getItem('sv_groq_key')   || '').trim(); }

  // ─── Groq Whisper: transcribe audio blob to text ─────────────────────────
  async function transcribeAudio(audioBlob, langCode) {
    const groqKey = getGroqKey();
    if (!groqKey) return null;

    // Map browser lang codes to ISO 639-1 for Whisper
    const langMap = { 'gu-IN': 'gu', 'hi-IN': 'hi', 'en-IN': 'en' };
    const lang = langMap[langCode] || 'auto';

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', GROQ_ASR_MODEL);
    if (lang !== 'auto') formData.append('language', lang);
    formData.append('temperature', '0');
    // Prompt helps Whisper stay in context of Indian grocery billing
    formData.append('prompt', 'Indian grocery store billing. Customer names, item names like Rice Sugar Oil Dal Ghee. Prices in Rupees.');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}` },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[Groq Whisper] Error:', err.error?.message || res.status);
        return null;
      }
      const data = await res.json();
      return data.text?.trim() || null;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[Groq Whisper] Fetch error:', e.message);
      return null;
    }
  }

  // ─── Gemini: extract structured billing details from transcript ───────────
  async function extractWithGemini(transcript, modelIndex = 0) {
    const geminiKey = getGeminiKey();
    if (!geminiKey || !transcript) return null;
    if (modelIndex >= GEMINI_MODELS.length) return null;

    const model = GEMINI_MODELS[modelIndex];
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${geminiKey}`;

    const prompt = `You are a billing assistant for an Indian kirana/grocery store.

Extract billing details from this voice input. The input may be in Gujarati, Hindi, English, or a mix (Hinglish/Gujlish/code-switching).

Voice input: "${transcript}"

Return ONLY a valid JSON object with exactly these four fields (no extra text, no markdown, no explanation):
{
  "customerName": "English name or null",
  "itemName": "English item name or null",
  "quantity": number or null,
  "price": number or null
}

Extraction Rules:
- customerName: The person being sold to. Transliterate Gujarati/Hindi names to English letters. Remove honorifics/suffixes (bhai, ben, ji, ભાઈ, બેન, ジ, ko, ne). Examples: "રમેશભાઈ" → "Rameshbhai", "Suresh ko" → "Suresh", "Priya ne" → "Priya". If no customer is mentioned, return null.
- itemName: The product being sold. ALWAYS in English. Standardize common Indian items: ચોખા/चावल→"Rice", ખાંડ/चीनी→"Sugar", ઘઉં/गेहूं→"Wheat Flour", Atta→"Wheat Flour", તેલ/तेल→"Cooking Oil", ઘી/घी→"Desi Ghee", દૂધ/दूध→"Milk", ચા/चाय→"Tea", દાળ/दाल→"Dal", મીઠું/नमक→"Salt", મરચું/मिर्च→"Chilli Powder", હળદર/हल्दी→"Turmeric Powder". For brands (Cadbury, Dettol, Maggi, Parle, Amul), use the brand name as spoken in English letters.
- quantity: Number only (no units). Parse spoken numbers: "ek"/"એક"/"एक"→1, "be"/"બે"/"दो"→2, "tran"/"ત્રણ"/"तीन"→3, "char"→4, "panch"→5, "das"→10, "vis"→20, "so"/"sau"→100, "ek darjan"→12. If not mentioned, return null.
- price: Number only (rupees per unit). Parse spoken: "pachas"/"पचास"→50, "sau"/"so"→100, "panch sau"→500. If not mentioned, return null.`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 200,
        responseMimeType: 'application/json'
      }
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.status === 404 || res.status === 400) {
        // Model not found — try next model
        console.warn(`[Gemini] Model ${model} unavailable, trying next...`);
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

      // Parse JSON — Gemini sometimes wraps in ```json ... ```
      const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      const result = {
        customerName : typeof parsed.customerName === 'string' ? parsed.customerName.trim() || null : null,
        itemName     : typeof parsed.itemName === 'string' ? parsed.itemName.trim() || null : null,
        quantity     : parsed.quantity != null ? parseFloat(parsed.quantity) || null : null,
        price        : parsed.price != null ? parseFloat(parsed.price) || null : null
      };

      console.log(`[Gemini:${model}] Extracted:`, result);
      return result;

    } catch (e) {
      if (e.name === 'AbortError') {
        console.warn('[Gemini] Request timed out after 7s');
      } else {
        console.warn('[Gemini] Error:', e.message);
      }
      return null;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────
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
