import { createHash, randomBytes } from 'node:crypto';

const count = Number(process.argv[2] ?? 3);
if (!Number.isInteger(count) || count < 1 || count > 50) {
  console.error('Provide an invite count between 1 and 50.');
  process.exit(1);
}

const codes = Array.from({ length: count }, () => randomBytes(18).toString('base64url'));
for (const [index, code] of codes.entries()) console.log(`Guest ${index + 1}: ${code}`);
console.log('\nNetlify Functions environment variables:');
console.log('RSVP_INVITE_HASHES=' + codes.map((code) => createHash('sha256').update(code).digest('hex')).join(','));
console.log('RSVP_SESSION_SECRET=' + randomBytes(32).toString('hex'));
