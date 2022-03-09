////// Custom API Key Generation & Hashing ///////

// Recursive function to generate a unique random string as API key
module.exports = async function generateAPIKey(bytesApiKey, hashAlgorithm, model, options) {
  const { randomBytes } = require('crypto');
  const apiKey = randomBytes(bytesApiKey).toString('hex');
  const hashedAPIKey = hashAPIKey(apiKey, hashAlgorithm);

  // Ensure API key is unique
  const apiKeyExist = await model.find({[options.apiKeyField]: apiKey})
  if (!apiKeyExist.length === 0) {
    generateAPIKey(bytesApiKey, hashAlgorithm, model, options);
  } else {
    return { hashedAPIKey, apiKey };
  }
}

// Hash the API key
function hashAPIKey(apiKey, hashAlgorithm) {
  const { createHash } = require('crypto');

  const hashedAPIKey = createHash(hashAlgorithm).update(apiKey).digest('hex');

  return hashedAPIKey;
}