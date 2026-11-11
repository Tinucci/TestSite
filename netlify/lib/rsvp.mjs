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
  const limits = { alias: 120, characterNotes: 1000, refreshments: 600, location: 400 };
  const details = {};
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof body[key] !== 'string' || body[key].length > limit) return null;
    details[key] = body[key].trim();
  }
  if (!details.alias || !details.characterNotes) return null;
  return { ...details, dates: [...new Set(body.dates)].sort() };
}

function publicAvailability(responses) {
  const availability = {};
  for (const response of responses) {
    for (const date of new Set(response?.dates ?? [])) {
      if (!isEventDate(date)) continue;
      const day = (availability[date] ??= { votes: 0, aliases: [] });
      day.votes++;
      // Older RSVPs may contain real names. Only the explicit public alias is published.
      if (response.alias) day.aliases.push(response.alias);
    }
  }
  for (const day of Object.values(availability)) day.aliases.sort((a, b) => a.localeCompare(b));
  return availability;
}

function leadingDate(availability) {
  const ranked = Object.entries(availability).sort(([dateA, a], [dateB, b]) =>
    b.votes - a.votes || dateA.localeCompare(dateB));
  if (!ranked.length) return { date: null, votes: 0, tiedDates: 0 };
  const [date, { votes }] = ranked[0];
  return { date, votes, tiedDates: ranked.filter(([, day]) => day.votes === votes).length };
}

export function bestDate(responses) {
  return leadingDate(publicAvailability(responses));
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
      const availability = publicAvailability(responses);
      return respond({ ...leadingDate(availability), availability });
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
    if (!response) return respond({ error: 'Enter a fictional character name and description, and check your selected dates and response lengths.' }, 400);
    await store.setJSON(id, response);
    return respond({ response });
  };
}
