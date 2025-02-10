const crypto = require('crypto');

// Generate a secure random string for NEXTAUTH_SECRET
const nextAuthSecret = crypto.randomBytes(32).toString('base64');

// Generate a secure random string for JWT_SECRET
const jwtSecret = crypto.randomBytes(32).toString('base64');

console.log('\x1b[32m%s\x1b[0m', 'Generated Secrets:');
console.log('\x1b[36m%s\x1b[0m', '\nNEXTAUTH_SECRET:');
console.log(nextAuthSecret);
console.log('\x1b[36m%s\x1b[0m', '\nJWT_SECRET:');
console.log(jwtSecret);
console.log('\n\x1b[33m%s\x1b[0m', 'Add these to your .env.local file');
