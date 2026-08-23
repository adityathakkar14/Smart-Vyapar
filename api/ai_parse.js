/**
 * Vercel Serverless Function: /api/ai_parse
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { transcript, apiKey: clientKey } = req.body || {};
  if (!transcript) {
    return res.status(400).json({ success: false, error: 'Transcript is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY || clientKey || 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash'];

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
2. itemName: ALWAYS translate or standardize the product to English. (e.g. ચોખા/चावल -> "Rice", ખાંડ/चीनी -> "Sugar", તેલ/तेल -> "Cooking Oil", ઘી/घी -> "Desi Ghee", દૂધ/दूध -> "Milk", દાળ/દાલ -> "Tuver Dal", સાબુ -> "Soap", Cadbury -> "Cadbury").
3. quantity: Numeric quantity only (no unit strings). Parse spoken numbers ("ek"->1, "be"->2, "tran"->3, "panch"->5, "das"->10, "darjan"->12). If omitted, return null.
4. price: Numeric price per unit in rupees only. Parse spoken prices ("chalis"->40, "pachas"->50, "sau"->100, "basso"->200). If omitted, return null.`;

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        const cleanJson = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);
        return res.status(200).json({
          success: true,
          data: {
            customerName: parsed.customerName ? String(parsed.customerName).trim() : null,
            itemName: parsed.itemName ? String(parsed.itemName).trim() : null,
            quantity: parsed.quantity != null && !isNaN(parsed.quantity) ? parseFloat(parsed.quantity) : null,
            price: parsed.price != null && !isNaN(parsed.price) ? parseFloat(parsed.price) : null
          },
          model
        });
      }
    } catch (e) {
      console.warn(`[Vercel Gemini] ${model} error:`, e.message);
    }
  }

  return res.status(502).json({ success: false, error: 'AI Extraction Failed' });
};
