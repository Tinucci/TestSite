# Event website

An event guide with a date, location, schedule, and a separate guest RSVP page. The Open Room is a fictional example. Its name, date, city, and programme are sample content.

## Edit the event

Update [public/index.html](public/index.html) with your event name, description, date, time zone, venue, and programme. Update the page title, meta description, footer, machine-readable `datetime` values, and [confirmation page title](public/thanks/index.html) alongside the visible copy. Remove the sample label when the event details are ready.

Edit [public/rsvp/index.html](public/rsvp/index.html) to change the calendar month and selectable dates, and customize the character, food, and drink prompts. Each selectable day is a labeled checkbox with a unique name in the format `available-YYYY-MM-DD`. Update its label and ISO value when changing a date. Calendar weeks start on Monday.

Guests can select multiple full days or say that none work. They can revisit `/rsvp/` to revise their answers. When they choose to remember their answers, the form prefills them on the same browser. Each revision creates a new Netlify Forms submission. Use the latest response for each email address. Anyone with access to the site can submit the form.

## Preview locally

Run this from the repository root, then open [http://localhost:8000](http://localhost:8000).

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory public
```

The local server can preview the page and native field validation. Submission storage requires Netlify Forms.

## Deploy from GitHub to Netlify

1. Commit the files and push the `main` branch to GitHub.
2. In Netlify, select **Add new project → Import an existing project**, choose **GitHub**, and select this repository.
3. Use `main` as the production branch and leave the build command blank. [netlify.toml](netlify.toml) sets the publish directory to `public`.
4. In your Netlify project, open **Forms** and enable form detection. Deploy again so Netlify detects `event-rsvp`.
5. Submit a test RSVP at `/rsvp/` with two available days. Verify the confirmation page and both dates under **Forms → event-rsvp**. Follow the update link, change the dates, and verify that the revised response is received.

[Netlify repository deployment](https://docs.netlify.com/start/quickstarts/deploy-from-repository/) · [Netlify Forms setup](https://docs.netlify.com/manage/forms/setup/)
