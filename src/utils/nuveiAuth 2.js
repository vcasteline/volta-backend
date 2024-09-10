const crypto = require('crypto');

function generateNuveiAuthToken() {
  const SERVER_APPLICATION_CODE = process.env.NUVEI_SERVER_APPLICATION_CODE;
  const SERVER_APP_KEY = process.env.NUVEI_SERVER_APP_KEY;

  const unixTimestamp = Math.floor(Date.now() / 1000).toString();
  const uniqTokenString = SERVER_APP_KEY + unixTimestamp;
  const uniqTokenHash = crypto.createHash('sha256').update(uniqTokenString).digest('hex');
  
  return Buffer.from(`${SERVER_APPLICATION_CODE};${unixTimestamp};${uniqTokenHash}`).toString('base64');
}

module.exports = { generateNuveiAuthToken };