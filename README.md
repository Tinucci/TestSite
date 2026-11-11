[![Netlify Status](https://api.netlify.com/api/v1/badges/8dc53ad7-1b8f-442c-aebb-8917db9deac4/deploy-status)](https://app.netlify.com/projects/sesamefun/deploys)

# The Open Room

A small event site with a public overview and a private RSVP per guest. The homepage shows the most-voted date as tentative. If dates tie, it shows the earliest tied date and indicates the tie.

## Edit the event

Edit [public/index.html](public/index.html) for the event name, location, and schedule. The shared date range in [public/event-dates.mjs](public/event-dates.mjs) controls both the RSVP calendar and server validation. Update the homepage's fallback range as well. Edit [public/rsvp/index.html](public/rsvp/index.html) to customize the prompts and character options.

## Configure invite access

1. Run `npm ci`, then `npm run invites -- 3` to generate three guest codes and the matching settings. Use a separate generated set for testing and for real guests.
2. In Netlify, set `RSVP_INVITE_HASHES` and `RSVP_SESSION_SECRET` from that output as environment variables available to Functions. Redeploy to apply the settings. Keep the raw codes and session secret out of Git. Give each guest their own code privately.
3. Keep the existing hashes when adding guests. Append only the new hashes and retain the existing session secret. A removed code can no longer sign in or contribute to the tally. Stored responses can be reviewed in **Data & Storage → Blobs → event-rsvp**.

Each guest can reuse their code to load and edit their own RSVP on any device. A new save replaces their previous answers. Name, character details, food and drink preferences, and location suggestions are private. The public endpoint returns only the leading date, its vote count, and the number of dates tied for the lead.

## Preview and deploy

Use Netlify Dev for local testing with Functions and Blobs, or enable a Netlify branch deploy for `feature/invite-rsvp`. Give the test deployment its own invite hashes and session secret. The site-wide Blobs store is shared across deploys, but only codes configured for a deploy can access their records and contribute to its tally.

The existing [netlify.toml](netlify.toml) publishes `public`. There is no frontend build command. Netlify Forms is no longer used for new RSVPs. Historical Forms entries are separate and do not count toward the new tally.

For a deployment smoke test, save overlapping dates using two guest codes and verify the homepage tally. Sign back in with the first code, revise its dates, and verify the tally counts only its latest response. Check that a different code cannot open that guest's details.

[Netlify Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/) · [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
