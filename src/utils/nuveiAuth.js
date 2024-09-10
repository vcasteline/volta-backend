const crypto = require('crypto');

function generateNuveiAuthToken() {
  const APPLICATION_CODE = process.env.NUVEI_APPLICATION_CODE;
  const SERVER_APP_KEY = process.env.NUVEI_SERVER_APP_KEY;

  const unixTimestamp = Math.floor(Date.now() / 1000).toString();
  const uniqTokenString = SERVER_APP_KEY + unixTimestamp;
  const uniqTokenHash = crypto.createHash('sha256').update(uniqTokenString).digest('hex');
  
  const tokenString = `${APPLICATION_CODE};${unixTimestamp};${uniqTokenHash}`;
  return Buffer.from(tokenString).toString('base64');
}

module.exports = { generateNuveiAuthToken };