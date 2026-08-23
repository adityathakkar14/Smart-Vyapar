const https = require('https');

const key = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
const models = ['gemini-3.6-flash', 'gemini-2.5-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];

async function testModel(model) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [{
        parts: [{ text: 'Extract JSON: "રમેશભાઈ ને ૫ કિલો ચોખા ૫૦ રૂપિયા" -> {"customerName":"Rameshbhai","itemName":"Rice","quantity":5,"price":50}' }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=${key}`,
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
        console.log(`[${model}] Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log(`[${model}] Success:`, data.substring(0, 150) + '...');
        } else {
          console.log(`[${model}] Error:`, data.substring(0, 150));
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error(`[${model}] Net error:`, e.message);
      resolve();
    });
    req.write(postData);
    req.end();
  });
}

(async () => {
  for (const m of models) {
    await testModel(m);
  }
})();
