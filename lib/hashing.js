const crypto = require('crypto');

// Recursive function to generate a unique random string as API key
module.exports = async function generateAPIKey(model, options) {
  const apiKey = crypto.randomBytes(options.bytesApiKey).toString('hex');
  var encryptedApiKey;
  try{
    encryptedApiKey = crypto.pbkdf2Sync(apiKey, options.salten, options.iterations, options.keylen, options.digest).toString('hex');
  }catch(e) {
    throw new Error('InvalidHashingOptions: ' + e)
  }

  // Ensure API key is unique
  const apiKeyExist = await model.find({[options.apiKeyField]: encryptedApiKey})
  if (!apiKeyExist.length === 0) {
    generateAPIKey(bytesApiKey, secretKey, model, options);
  } else {
    return { apiKey, encryptedApiKey };
  }
}