const https = require('https');

const key = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const generateModels = json.models
      .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
      .map(m => m.name);
    console.log("Models supporting generateContent:", generateModels);
  });
}).on('error', err => console.error(err));
