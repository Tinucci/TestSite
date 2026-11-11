[![Netlify Status](https://api.netlify.com/api/v1/badges/8dc53ad7-1b8f-442c-aebb-8917db9deac4/deploy-status)](https://app.netlify.com/projects/sesamefun/deploys)

# Elsewhere for a Day

A small event site with a public overview and a private RSVP per guest. The homepage shows the most-voted date as tentative and offers a read-only calendar of availability and fictional character aliases. Existing RSVPs still count, but their older name fields are never published. Guests can add a public alias by saving an updated RSVP. If dates tie, it shows the earliest tied date and indicates the tie.

## Edit the event

Edit [public/index.html](public/index.html) for the event name, location, and schedule. The shared date range in [public/event-dates.mjs](public/event-dates.mjs) controls both the RSVP calendar and server validation. Update the homepage's fallback range as well. Edit [public/rsvp/index.html](public/rsvp/index.html) to customize the prompts and character options.

## Configure invite access

1. Run `npm ci`, then `npm run invites -- 3` to generate three guest codes and the matching settings. Use a separate generated set for testing and for real guests.
2. In Netlify, set `RSVP_INVITE_HASHES` and `RSVP_SESSION_SECRET` as two separate environment variables. Paste only the text after `=` into each value field. The hash list contains comma-separated 64-character hashes. The session secret is a single 64-character value. Keep the raw codes and session secret out of Git. Give each guest their own code privately.
3. Keep the existing hashes when adding guests. Append only the new hashes and retain the existing session secret. A removed code can no longer sign in or contribute to the tally. Stored responses can be reviewed in **Data & Storage → Blobs → event-rsvp**.

Each guest can reuse their code to load and edit their own RSVP on any device. A new save replaces their previous answers. Name, character details, food and drink preferences, and location suggestions are private. The public endpoint returns only the leading date, its vote count, and the number of dates tied for the lead.

To add a custom code, run `npm run invites -- --custom 'kermit'`. Append the hash after `RSVP_INVITE_HASHES=` to the existing comma-separated value in Netlify, keep `RSVP_SESSION_SECRET`, and redeploy. The guest signs in with `kermit`. Codes are case-sensitive, can contain spaces and punctuation, and must fit in 100 characters. Leading and trailing whitespace is ignored. Use a distinct code per guest because anyone using the same code shares access to the same RSVP. Short, familiar words are easier to guess.

## Sync the production guest list

Install the Netlify CLI, run `netlify login`, then run `netlify link` from this repo and select the event project. Keep a private JSON file outside the repo with one entry per guest. Use either a `code` or a lowercase SHA-256 `hash` in each entry. Names are optional and stay local.

```json
[
  { "name": "Example guest", "code": "example-code" }
]
```

After editing the file, validate it and sync it to Production.

```sh
npm run invites:sync -- ~/event-guests.json --dry-run
npm run invites:sync -- ~/event-guests.json
```

The command replaces the full `RSVP_INVITE_HASHES` value for the project's **Production** context and requests a build from Netlify's configured production branch. It preserves the variable's existing scope and leaves the session secret alone. Make sure both variables are available to Functions in Production. Guests omitted from the file lose access on the new deploy.

To request the production build again without reading the file or changing the invite list, run `npm run invites:sync -- --deploy-only`.

## Preview and deploy

Use Netlify Dev for local testing with Functions and Blobs, or enable a Netlify branch deploy for `feature/invite-rsvp`. Give the test deployment its own invite hashes and session secret. The site-wide Blobs store is shared across deploys, but only codes configured for a deploy can access their records and contribute to its tally.

For a pull or merge request preview, set both values for the **Deploy Previews** context and include the **Functions** scope (or use all scopes). Save the settings, trigger a new preview deploy, then open the latest preview from the pull request. A deploy-specific permalink stays pinned to its original deployment.

On the new preview, open `/api/best-date`. A `200` JSON response confirms configuration and storage are available. If RSVP says access is not configured, check the `event-rsvp` function logs for the missing or malformed variable name. For a preview from a public fork, also check whether the project's untrusted deploy policy withholds sensitive values.

The existing [netlify.toml](netlify.toml) publishes `public`. There is no frontend build command. Netlify Forms is no longer used for new RSVPs. Historical Forms entries are separate and do not count toward the new tally.

For a deployment smoke test, save overlapping dates using two guest codes and verify the homepage tally. Sign back in with the first code, revise its dates, and verify the tally counts only its latest response. Check that a different code cannot open that guest's details.

[Netlify Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/) · [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
