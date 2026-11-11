import { createHmac, timingSafeEqual } from 'node:crypto';
import { isEventDate } from '../../public/event-dates.mjs';
import { hashInviteCode } from './invite-code.mjs';

const cookie = '__Host-event-rsvp';
const lifetime = 60 * 60 * 24 * 7;

function respond(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function sessionCookie(token, age) {
  return { 'Set-Cookie': `${cookie}=${token}; Path=/; Max-Age=${age}; Secure; HttpOnly; SameSite=Lax` };
}

function validateRsvp(body) {
  if (!body || !Array.isArray(body.dates) || body.dates.length > 120 || !body.dates.every(isEventDate)) return null;
  const limits = { name: 120, characterName: 120, characterVibe: 50, characterNotes: 1000, refreshments: 600, location: 400 };
  const details = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || body[key].length > limit) return null;
    details[key] = body[key].trim();
  }
  if (!details.name) return null;
  return { ...details, dates: [...new Set(body.dates)].sort() };
}

export function bestDate(responses) {
  const votes = new Map();
  for (const response of responses) {
    for (const date of response?.dates ?? []) votes.set(date, (votes.get(date) ?? 0) + 1);
  }
  const ranked = [...votes].sort(([dateA, votesA], [dateB, votesB]) =>
    votesB - votesA || dateA.localeCompare(dateB));
  if (!ranked.length) return { date: null, votes: 0, tiedDates: 0 };
  const [date, count] = ranked[0];
  return { date, votes: count, tiedDates: ranked.filter(([, votes]) => votes === count).length };
}

export function createRsvpHandler({ store, secret, inviteHashes }) {
  const guests = [...new Set(inviteHashes)];
  const sign = (value) => createHmac('sha256', secret).update(value).digest('hex');
  const sameDigest = (left, right) => timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));

  return async (request) => {
    const url = new URL(request.url);
    if (url.pathname === '/api/best-date') {
      if (request.method !== 'GET') return respond({ error: 'Method not allowed.' }, 405);
      const responses = await Promise.all(guests.map((id) => store.get(id, { type: 'json' })));
      return respond(bestDate(responses));
    }

    if (request.method !== 'GET' && request.headers.get('origin') !== url.origin) {
      return respond({ error: 'Request origin could not be verified.' }, 403);
    }

    if (request.method === 'DELETE') return respond({}, 200, sessionCookie('', 0));
    if (request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const id = hashInviteCode(body?.code);
      if (!id || !guests.some((guest) => sameDigest(guest, id))) {
        return respond({ error: 'That invite code was not recognized.' }, 401);
      }
      const payload = `${id}.${Math.floor(Date.now() / 1000) + lifetime}`;
      const response = await store.get(id, { type: 'json' });
      return respond({ response }, 200, sessionCookie(`${payload}.${sign(payload)}`, lifetime));
    }

    const token = request.headers.get('cookie')?.split('; ').find((part) => part.startsWith(cookie + '='))?.slice(cookie.length + 1) ?? '';
    const match = /^([a-f0-9]{64})\.(\d{1,12})\.([a-f0-9]{64})$/.exec(token);
    if (!match || Number(match[2]) <= Date.now() / 1000 || !guests.includes(match[1]) ||
        !sameDigest(match[3], sign(`${match[1]}.${match[2]}`))) {
      return respond({ error: 'Enter your invite code to continue.' }, 401);
    }

    const id = match[1];
    if (request.method === 'GET') return respond({ response: await store.get(id, { type: 'json' }) });
    if (request.method !== 'PUT') return respond({ error: 'Method not allowed.' }, 405);
    const response = validateRsvp(await request.json().catch(() => null));
    if (!response) return respond({ error: 'Check your name, selected dates, and response lengths.' }, 400);
    await store.setJSON(id, response);
    return respond({ response });
  };
}
