const https = require('https');

const key = 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
}).on('error', err => console.error(err));
