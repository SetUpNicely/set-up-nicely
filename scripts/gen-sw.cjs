// scripts/gen-sw.cjs
const fs = require('fs');
const path = require('path');

const env = process.env;
const src = path.resolve('public/firebase-messaging-sw.template.js');
const dst = path.resolve('public/firebase-messaging-sw.js');

// fail loud if something critical is missing in CI
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];
const missing = required.filter(k => !env[k]);
if (missing.length) {
  console.warn('⚠ Missing env vars:', missing.join(', '), '— generating file anyway with blanks');
}

let sw = fs.readFileSync(src, 'utf8')
  .replace('__FIREBASE_API_KEY__', env.VITE_FIREBASE_API_KEY || '')
  .replace('__FIREBASE_AUTH_DOMAIN__', env.VITE_FIREBASE_AUTH_DOMAIN || '')
  .replace('__FIREBASE_PROJECT_ID__', env.VITE_FIREBASE_PROJECT_ID || '')
  .replace('__FIREBASE_MESSAGING_SENDER_ID__', env.VITE_FIREBASE_MESSAGING_SENDER_ID || '')
  .replace('__FIREBASE_APP_ID__', env.VITE_FIREBASE_APP_ID || '');

fs.writeFileSync(dst, sw);
console.log('✅ wrote', dst);
