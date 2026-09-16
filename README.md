# Story Distribution Desk

A local tool for getting your own articles, press releases and posters out to a
list of free news, publishing, source and community sites — without hand-typing
the same story into twenty different forms, and without ever pretending a site
is more automatable than it actually is.

It combines four things:

- a place to write a story once and ask OpenAI to repackage it for different
  kinds of channels (you review and edit everything before it's saved),
- a directory of channels, each with its own automation profile,
- Playwright automation for the channels that support it, with you watching
  the browser the whole time, and
- a tracker so you can see, in one place, what's published, what's stuck, and
  what's waiting on you.

Nothing here solves CAPTCHAs, bypasses anti-bot protection, spins up fingerprint-spoofing
browsers, or rotates proxies. Where a site can't be safely automated, the app
says so and hands the job back to you.

## Contents

- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Database setup](#database-setup)
- [Playwright setup](#playwright-setup)
- [Browser installation](#browser-installation)
- [Creating persistent browser profiles](#creating-persistent-browser-profiles)
- [Adding channels](#adding-channels)
- [Configuring automation selectors](#configuring-automation-selectors)
- [Running an automated submission](#running-an-automated-submission)
- [Handling a CAPTCHA / manual checkpoint](#handling-a-captcha--manual-checkpoint)
- [Troubleshooting failed submissions](#troubleshooting-failed-submissions)
- [Running the tests](#running-the-tests)
- [Known limitations](#known-limitations)

## Installation

```bash
npm install
```

This installs Next.js, Prisma, Playwright and the rest of the dependencies in
`package.json`.

## Environment variables

Copy the example file twice — once to `.env.local` and once to a plain `.env`:

```bash
cp .env.example .env.local
cp .env.example .env
```

Two files, not one, because Next.js and the Prisma CLI don't read the same
thing: Next's dev/build server automatically loads `.env.local`, but the
`prisma` command-line tool (`prisma db push`, `prisma db seed`, `prisma
migrate`, etc.) only auto-loads a file literally named `.env` — it ignores
`.env.local` entirely. Skipping the second copy is what produces `error:
Environment variable not found: DATABASE_URL` the moment you run a `prisma`
command, even though the app itself starts fine. Keep your real
`OPENAI_API_KEY` in `.env.local` only; `.env` just needs `DATABASE_URL` (and
the other non-secret defaults below) so the CLI can find them too.

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Only if you want AI-optimized content | Read server-side only (`lib/openai.ts`). Never sent to the browser. |
| `DATABASE_URL` | Yes | Defaults to `file:./dev.db`, a local SQLite file. |
| `PLAYWRIGHT_PROFILES_DIR` | No | Defaults to `./playwright-profiles`. Where authenticated browser sessions live. |
| `SCREENSHOTS_DIR` | No | Defaults to `./storage/screenshots`. Automation screenshots for the log viewer. |
| `DEFAULT_CONCURRENCY` | No | Defaults to `2`. How many browser jobs can run at once, before you change it in Settings. |

Both `.env.local` and `.env` are git-ignored. Nothing in this app writes an
OpenAI key, password, cookie or session token to the database or to disk
outside of the Playwright profile directories Chromium itself manages.

## Database setup

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

- `prisma generate` builds the typed Prisma Client from `prisma/schema.prisma`.
- `prisma db push` creates `prisma/dev.db` (SQLite) with all the tables.
- `npm run db:seed` (`prisma/seed.ts`) adds the channels named in the build
  spec — the press-release wires, the editor/source platforms, and the
  self-publishing sites — each starting at **Needs Configuration** or
  **Manual Only**. Nothing is seeded as **Automated**; that only happens once
  you configure a channel's automation profile yourself and it passes a real
  Test Automation run (see below).

If you ever change `prisma/schema.prisma` again later — including pulling
a newer copy of this app on top of a database you already created — re-run
both:

```bash
npx prisma generate
npx prisma db push
```

`db push` only adds/changes columns to match the schema; it does not touch
your existing stories, channels, or job history.

## Playwright setup

## Browser installation

```bash
npx playwright install chromium
```

This downloads a Chromium build for Playwright to drive. You only need to do
this once (or again after upgrading the `playwright` package).

Then start the app:

```bash
npm run dev
```

and open [http://localhost:3000](http://localhost:3000).

## Creating persistent browser profiles

For any channel with **Login required** turned on, this app never asks you to
type a password anywhere in its own UI. Instead:

1. Open that channel's page and click **Setup Login**.
2. A real, visible Chromium window opens to the site.
3. Log in there yourself, exactly as you normally would (including 2FA if the
   site asks for it).
4. Come back to Story Distribution Desk and click **I'm logged in**.

The window closes, and the authenticated cookies/local storage stay on disk
under `PLAYWRIGHT_PROFILES_DIR` (one folder per channel — see
`lib/playwright/profiles.ts`). Every later automated or assisted run for that
channel reuses this same profile, so you only log in once, until the session
expires.

These profile folders are git-ignored on purpose — they're equivalent to a
saved browser session and shouldn't leave your machine.

## Adding channels

`Channels → New channel` lets you add any destination — a press-release wire,
a self-publishing platform, a local newspaper's contact form, whatever you're
actually going to send stories to. Fill in what's true about the site
(country, whether it's free, whether it needs an account); leave the
automation status at **Needs Configuration** until you've actually built and
tested a profile for it.

## Configuring automation selectors

Open the channel, scroll to **Automation profile**, and fill in the CSS
selectors that match that specific site's submission form — title field, body
field, tags, category, image upload, submit button, and (if you can find one)
a selector or URL fragment that only appears once the submission has actually
gone through.

A few things worth knowing:

- Leave a field blank if the site doesn't have it. Blank fields are skipped,
  not guessed at.
- **Editor type** controls how the body field gets filled — plain `textarea`/`input`,
  a `contenteditable` rich-text box, an `iframe`-based editor (Medium and many
  CMSes use one), or `markdown`.
- **"Stop before final submit"** is on by default for a reason: it puts the
  form in front of you, filled in, so you click the real Submit button
  yourself. Turning it off (Automated / Mode C) is only for a channel you've
  configured and tested, and even then automation clicks Submit only once —
  it never guesses at a different selector if the one it has stops working.
- **Canonical URL selector** is there for a site with a separate
  canonical-link field beyond the named ones above — leave it blank unless
  the site actually has one.
- Save the profile, then run **Test Automation**. This opens a throwaway,
  logged-out browser, checks which of your selectors actually resolve to
  something on the page, and closes again — Submit is never clicked during a
  test.
- A channel can only be switched to **Automated** after it has a saved,
  enabled profile *and* a successful Test Automation run. The app enforces
  this itself (see `app/api/channels/[id]/route.ts`); there's no way to flip
  it on for an unconfigured site by mistake.

## Running an automated submission

1. Write (or edit) a story under **Stories**.
2. Optionally click **Generate optimized content** to get channel-flavoured
   headlines, a press-release cut, and an editor pitch back from OpenAI —
   review and edit whatever comes back, then **Save as version**. Nothing is
   saved automatically; you decide what's good enough to keep.
3. Click **Distribute this story**, pick which saved content version to use
   (or leave it as the story as written), choose your channels, set how many
   browser jobs can run at once and the minimum delay between submissions,
   and click **Review submission**.
4. You land on the **Submission preview** — exactly what will be typed into
   each channel's form (title, subtitle/summary, body, tags, reference link),
   plus which automation mode it'll run in. Edit anything you want per
   channel; nothing is queued yet. When it looks right, click **Start
   Submission**.
5. The campaign's tracker table shows every channel's status live. A channel
   at **Needs Configuration** or **Manual Only** runs in Manual mode (the app
   opens the page and hands you the prepared content); a **Partially
   Automated** channel runs Assisted (fills the form, stops before Submit); a
   fully **Automated** channel fills the form and clicks Submit itself, then
   checks for a success signal.
6. Anything that finishes shows its published URL right in the tracker; you
   can also open **View logs** on any job for the full step-by-step record and
   screenshots.

The minimum delay and max-concurrent-jobs you set on a campaign are actually
enforced for that campaign's jobs specifically, on top of the global defaults
in **Settings** (which apply to everything, including jobs outside any
campaign) — a channel that just failed also gets its own cooldown (Settings'
"cooldown after failure") before another job for that same channel is allowed
to start.

## Handling a CAPTCHA / manual checkpoint

If a CAPTCHA, a 2FA prompt, an unexpected dialog, a suspicious-login or
email-verification prompt, a terms/guidelines confirmation, an account
suspension notice, a content-review flag, a failed navigation, or a
configured selector that no longer matches the page shows up mid-run, the job
stops itself, takes a screenshot, and the dashboard shows **Manual action
required** with the specific reason. The browser window stays open and
visible — solve the CAPTCHA, complete 2FA, dismiss the dialog, whatever it
needs — then click **Continue** and the job picks back up right where it left
off. Clicking **Cancel** instead stops the job and marks that channel
Skipped.

Two of the spec's checkpoint reasons — an editorial question a site is
asking, and a full site redesign — aren't things a keyword or DOM check can
honestly claim to detect generically (the first needs to understand what's
actually being asked; the second needs a snapshot of the site's previous
layout to diff against). Those remain something only the person watching the
visible browser will notice, which is the whole reason automation never runs
unattended in the first place.

The app never attempts to solve, guess past, or work around any of these on
its own — and it won't navigate a channel's browser anywhere outside that
channel's own registered domain, even if a submission URL gets mistyped in
its automation profile.

**Pause** is also always available on a running or queued job — separate
from Cancel — via the Pause button next to it; a queued job simply comes out
of the queue, a running job pauses at its next safe checkpoint. **Resume**
(shown in place of Continue once a job is paused) puts it back to work
exactly where it stopped.

## Troubleshooting failed submissions

- **A job failed with a selector error** — the site probably changed its
  form. Open the channel's automation profile, fix the selector, save, and
  run **Test Automation** again before retrying.
- **"Submission may have succeeded, please verify manually"** — the app
  couldn't confidently confirm success (no configured success selector/URL
  pattern matched, but the page did navigate somewhere). Check the site by
  hand and update the tracker row's published URL yourself if it went
  through.
- **A channel needs a login again** — its saved session expired. Run **Setup
  Login** for that channel again.
- **Retry** on a failed job re-runs it from the beginning, up to the max
  retries set in **Settings** (default 1). It does not resume mid-form —
  see [Known limitations](#known-limitations).
- Every job's **View logs** page has the full action-by-action history and a
  screenshot at each stage (`started`, `form_loaded`, `form_filled`,
  `manual_checkpoint`, `submitted`, `success`/`failure`), with passwords,
  cookies, tokens and API keys always redacted before they're stored.

## Running the tests

```bash
npm test          # vitest — validation, OpenAI response parsing, redaction,
                   # field mapping, content resolution/preview, domain
                   # restriction, the job queue's state machine (including
                   # pause and rate limiting), and the Story/Channel/Campaign
                   # API routes (all against mocked Prisma — no real
                   # database needed)

npm run test:e2e   # @playwright/test — the actual field-fill/selector/
                   # success-detection helpers in lib/playwright/actions.ts,
                   # driven against the local mock pages in tests/e2e/fixtures
                   # rather than any real channel
```

## Known limitations

Being upfront about what this first build does and doesn't do:

- **Retry re-runs a job from the beginning**, not from the step it failed on.
  The build spec lists "Retry from beginning" as one option among several
  (Retry, Retry from beginning, Switch to Assisted, Mark as Manual, Skip); all
  of those are available *between* jobs (switch mode, mark manual, skip), but
  a single retry always restarts the automation rather than resuming
  mid-form.
- **Scheduling** creates the campaign and its jobs at the scheduled time, but
  there's no long-running background scheduler process outside of the Next.js
  server itself — the server needs to be running (`npm run dev` / `npm run
  start`) at the scheduled time for it to fire.
- If the server process is stopped while a job is mid-flight, that job goes
  back to **Queued** the next time the app starts (see `instrumentation.ts`)
  and is put back on the in-process queue automatically — it does not try to
  resume a browser window that no longer exists, it starts that channel over.
- **Manual-checkpoint detection is pattern-based**, not a real understanding
  of the page. It catches the wording sites commonly use for each of the
  spec's ten detectable checkpoint reasons, but an unusually-worded prompt
  could still slip through unnoticed until you see it in the visible browser
  yourself — which is why the browser is always visible, not a safety net of
  last resort.
- **Domain restriction** (section 29) compares registrable domains
  (`medium.com` vs. `app.medium.com` is fine; `medium.com` vs.
  `medium-support.example` is not) — it's a sanity check against a typo'd or
  substituted URL in a channel's configuration, not a full public-suffix-list
  parser or a defense against a deliberately malicious channel record.
# Story-Distribution-Desk
