const https = require('https');

const key = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';

const testCases = [
  'સુરેશ ને ૨ બોટલ થમ્સ અપ ૧૦૦ રૂપિયા',
  'पूजा को ५ किलो आटा १५० रुपये',
  'બે કિલો ખાંડ ચાલીસ રૂપિયા',
  '3 packet Parle-G biscuits for Amit 60 rs'
];

async function runTest(transcript) {
  return new Promise((resolve) => {
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
2. itemName: ALWAYS translate or standardize the product to English. (e.g. ચોખા/चावल -> "Rice", ખાંડ/चीनी -> "Sugar", તેલ/तेल -> "Cooking Oil", ઘી/घी -> "Desi Ghee", દૂધ/दूध -> "Milk", દાળ/દાલ -> "Tuver Dal", આટો/आटा -> "Wheat Flour", થમ્સ અપ -> "Thums Up").
3. quantity: Numeric quantity only (no unit strings). Parse spoken numbers ("ek"->1, "be"->2, "tran"->3, "panch"->5, "das"->10, "darjan"->12). If omitted, return null.
4. price: Numeric price per unit in rupees only. Parse spoken prices ("chalis"->40, "pachas"->50, "sau"->100, "basso"->200). If omitted, return null.`;

    const postData = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json'
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\nInput: "${transcript}"`);
        const json = JSON.parse(data);
        console.log("Output:", json.candidates[0].content.parts[0].text.trim());
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(e);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

(async () => {
  for (const t of testCases) {
    await runTest(t);
  }
})();
