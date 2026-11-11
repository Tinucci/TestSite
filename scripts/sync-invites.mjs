import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashInviteCode } from '../netlify/lib/invite-code.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

function runNetlify(args, failure, siteId) {
  const result = spawnSync('netlify', args, {
    cwd: root,
    env: { ...process.env, NETLIFY_SITE_ID: siteId },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error?.code === 'ENOENT') throw new Error('Install the Netlify CLI and run netlify login.');
  if (result.status !== 0) {
    const details = (result.stderr?.trim() || result.stdout?.trim() || result.error?.message || '')
      .replace(/[a-f0-9]{64}/gi, '[redacted hash]');
    throw new Error([failure, details].filter(Boolean).join('\n'));
  }
}

function linkedSiteId() {
  let siteId;
  try {
    siteId = JSON.parse(readFileSync(new URL('../.netlify/state.json', import.meta.url), 'utf8')).siteId;
  } catch {
    throw new Error('Run netlify link from the repository to select your Netlify project.');
  }
  if (typeof siteId !== 'string' || !siteId) throw new Error('Run netlify link to select your Netlify project.');
  return siteId;
}

function requestProductionBuild(siteId) {
  runNetlify([
    'api', 'createSiteBuild', '--data', JSON.stringify({ site_id: siteId }),
  ], 'Netlify rejected the production build request. Check the Netlify Deploys page before retrying.', siteId);
  console.log('Requested a fresh Netlify production build.');
}

function sync() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--deploy-only') {
    requestProductionBuild(linkedSiteId());
    return;
  }

  const [filename, option, ...extra] = args;
  if (!filename || filename.startsWith('--') || (option && option !== '--dry-run') || extra.length) {
    throw new Error('Usage: npm run invites:sync -- /path/to/guests.json [--dry-run] or npm run invites:sync -- --deploy-only');
  }

  const path = realpathSync(filename);
  const location = relative(realpathSync(root), path);
  if (!isAbsolute(location) && location !== '..' && !location.startsWith('../') && !location.startsWith('..\\')) {
    throw new Error('Keep the guest list outside the repository.');
  }

  let guests;
  try {
    guests = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    throw new Error('Could not read the guest list as JSON.');
  }
  if (!Array.isArray(guests) || !guests.length) throw new Error('The guest list must be a nonempty JSON array.');

  const hashes = guests.map((guest, index) => {
    const hash = guest?.hash === undefined ? hashInviteCode(guest?.code) : guest.hash;
    if ((guest?.code !== undefined && guest?.hash !== undefined) ||
        typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`Guest entry ${index + 1} needs either a valid code or a lowercase SHA-256 hash.`);
    }
    return hash;
  });
  if (new Set(hashes).size !== hashes.length) throw new Error('Two guest entries use the same invite code.');

  const value = hashes.join(',');
  if (value.length > 5000) throw new Error('The full hash list exceeds Netlify’s 5,000-character variable limit.');

  if (option === '--dry-run') {
    console.log(`Validated ${hashes.length} invites for Production. No changes sent.`);
    return;
  }

  const siteId = linkedSiteId();

  runNetlify([
    'env:set', 'RSVP_INVITE_HASHES', value, '--context', 'production',
    '--secret', '--force', '--site', siteId,
  ], 'Netlify rejected the environment update. No build was requested.', siteId);

  console.log(`Updated the Production invite list with ${hashes.length} entries.`);
  requestProductionBuild(siteId);
}

try {
  sync();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
