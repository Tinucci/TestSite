import { getStore } from '@netlify/blobs';
import { createRsvpHandler } from '../lib/rsvp.mjs';

export const config = {
  path: ['/api/rsvp', '/api/best-date'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};

export default async (request) => {
  const secret = process.env.RSVP_SESSION_SECRET;
  const inviteHashes = (process.env.RSVP_INVITE_HASHES ?? '').split(',').map((value) => value.trim());
  if (!secret || !/^[a-f0-9]{64}$/.test(secret) || !inviteHashes.every((hash) => /^[a-f0-9]{64}$/.test(hash))) {
    return Response.json({ error: 'RSVP access is not configured yet.' }, { status: 503 });
  }

  try {
    const store = getStore({ name: 'event-rsvp', consistency: 'strong' });
    return await createRsvpHandler({ store, secret, inviteHashes })(request);
  } catch {
    return Response.json({ error: 'RSVP service is temporarily unavailable.' }, { status: 503 });
  }
};
