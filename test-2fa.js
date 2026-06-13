const speakeasy = require('speakeasy');

function verifyTokenAny(secret, token) {
  const window = 2;
  
  try {
    if (speakeasy.totp.verify({ secret: secret.toUpperCase(), encoding: 'base32', token, window })) {
      return true;
    }
  } catch (e) {
    console.error("Base32 error:", e);
  }

  try {
    if (speakeasy.totp.verify({ secret: secret.toUpperCase(), encoding: 'hex', token, window })) {
      return true;
    }
  } catch (e) {
    console.error("Hex error:", e);
  }

  return false;
}

const secret = speakeasy.generateSecret({ length: 20 });
console.log("Secret Base32:", secret.base32);

const token = speakeasy.totp({
  secret: secret.base32,
  encoding: 'base32'
});
console.log("Token:", token);

console.log("Verify:", verifyTokenAny(secret.base32, token));

// Test with time drift
const tokenPast = speakeasy.totp({
  secret: secret.base32,
  encoding: 'base32',
  time: (Date.now() / 1000) - 40 // 40 seconds ago
});
console.log("Token (-40s):", tokenPast);
console.log("Verify (-40s):", verifyTokenAny(secret.base32, tokenPast));

const tokenPastLong = speakeasy.totp({
  secret: secret.base32,
  encoding: 'base32',
  time: (Date.now() / 1000) - 100 // 100 seconds ago
});
console.log("Token (-100s):", tokenPastLong);
console.log("Verify (-100s):", verifyTokenAny(secret.base32, tokenPastLong));
