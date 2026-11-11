import { randomBytes } from 'node:crypto';
import { hashInviteCode } from '../netlify/lib/invite-code.mjs';

if (process.argv[2] === '--custom') {
  const hash = hashInviteCode(process.argv[3]);
  if (!hash || process.argv.length !== 4) {
    console.error('Pass one nonblank custom code of up to 100 characters. Quote codes containing spaces.');
    process.exit(1);
  }
  console.log('RSVP_INVITE_HASHES=' + hash);
  process.exit(0);
}

const count = Number(process.argv[2] ?? 3);
if (!Number.isInteger(count) || count < 1 || count > 50) {
  console.error('Provide an invite count between 1 and 50.');
  process.exit(1);
}

const codes = Array.from({ length: count }, () => randomBytes(18).toString('base64url'));
for (const [index, code] of codes.entries()) console.log(`Guest ${index + 1}: ${code}`);
console.log('\nNetlify Functions environment variables:');
console.log('RSVP_INVITE_HASHES=' + codes.map(hashInviteCode).join(','));
console.log('RSVP_SESSION_SECRET=' + randomBytes(32).toString('hex'));
