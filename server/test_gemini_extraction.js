const https = require('https');

const key = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
const transcript = 'રમેશભાઈ ને ૫ કિલો ચોખા ૫૦ રૂપિયા';

const prompt = `You are a billing assistant for an Indian retail/grocery store.
Extract structured billing details from this spoken text into JSON.

Spoken input: "${transcript}"

Return ONLY valid JSON matching this structure:
{
  "customerName": "Rameshbhai",
  "itemName": "Rice",
  "quantity": 5,
  "price": 50
}`;

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
    console.log(`[AI Test] Status: ${res.statusCode}`);
    const json = JSON.parse(data);
    const text = json.candidates[0].content.parts[0].text;
    console.log("[AI Test] Extracted JSON result:\n", text);
  });
});

req.on('error', (e) => console.error(e));
req.write(postData);
req.end();
