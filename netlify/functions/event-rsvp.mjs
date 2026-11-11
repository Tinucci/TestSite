import { getStore } from '@netlify/blobs';
import { createRsvpHandler } from '../lib/rsvp.mjs';

export const config = {
  path: ['/api/rsvp', '/api/best-date'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default async (request) => {
  const secret = process.env.RSVP_SESSION_SECRET?.trim();
  const hashList = process.env.RSVP_INVITE_HASHES?.trim();
  const inviteHashes = hashList?.split(',').map((value) => value.trim()) ?? [];
  const issues = [];
  if (!secret) issues.push('RSVP_SESSION_SECRET is missing');
  else if (!/^[a-f0-9]{64}$/.test(secret)) issues.push('RSVP_SESSION_SECRET has an invalid format');
  if (!hashList) issues.push('RSVP_INVITE_HASHES is missing');
  else if (!inviteHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))) {
    issues.push('RSVP_INVITE_HASHES has an invalid format');
  }
  if (issues.length) {
    console.warn('RSVP configuration: ' + issues.join('. '));
    return Response.json({ error: 'RSVP access is not configured yet.' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  try {
    const store = getStore({ name: 'event-rsvp', consistency: 'strong' });
    return await createRsvpHandler({ store, secret, inviteHashes })(request);
  } catch {
    return Response.json({ error: 'RSVP service is temporarily unavailable.' }, { status: 503 });
  }
};
