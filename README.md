# Movie Evenings in Hamilton

A micro cinema club: director programme, last/next-screening covers, a screening journal, short reviews, long articles, and suggestions. This version adds a private admin dashboard and the vintage-TV club emblem.

The existing draft at https://movie-evenings-in-hamilton.tastymango4.chatgpt.site/ is separate and is not changed by cloning or running this project.

## Features

- Public visitors can choose any unwatched, unarchived film or series as the next screening. The latest choice wins and is saved for everyone.
- Visitors can submit reviews of watched titles and long articles. New reviews and articles are **pending** until approved.
- Suggestions appear publicly immediately; either admin can edit, reject, or delete them, or use one to prefill a new programme entry.
- `admin_ianina` and `admin_sonya` have identical permissions.
- Admins can approve/reject/unpublish/edit/delete submissions, add/edit/archive/restore films, and add/edit/delete screenings.
- Saving a screening marks its film watched; the journal, counters and last-screening cover follow the database. If the selected next film has been watched, it is cleared.
- Admins can download a data backup. Password hashes and sessions are excluded.
- Existing database reviews/articles remain published when the moderation migration is applied.

## WSL setup

Prerequisites: Git, Node.js 22.13 or newer, and Corepack. Use the pnpm version pinned in package.json.

```bash
git clone -b admin-version https://github.com/iaiaianana/movie-evenings-in-hamilton.git
cd movie-evenings-in-hamilton
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run admin:setup
corepack pnpm run build
corepack pnpm run db:local
corepack pnpm run dev
```

`admin:setup` prompts for both passwords **without displaying them**. Choose a distinct passphrase of at least 16 characters for each person. Only salted password hashes are saved in `.dev.vars`, which is private and ignored by Git. Do not send passwords in chat or put them in source files.

Open the localhost URL printed by the dev command (normally http://localhost:5173). Visit `/admin`, sign in, and click **Initialize programme** once. This copies the original film list, five screening dates, and the original journal review into editable database records. It does not overwrite existing submissions. Local data is separate from the live draft.

`db:local` applies only unapplied migrations. Run it again after pulling new migration files. Do not edit applied SQL or Drizzle metadata.

To rotate both passwords, stop the local server, run `corepack pnpm run admin:setup -- --replace`, and restart it. Production must also receive the updated secret. Changing an admin's hash invalidates that admin's existing sessions.

## Design and code

| Location | Purpose |
| --- | --- |
| site.html | Public page layout, styles and browser behaviour |
| scripts/sync-homepage.mjs | Regenerate app/site-html.ts after editing site.html |
| app/route.ts | Serve the home page with current database records |
| lib/article-shell.ts | Shared Articles/Admin page layout and styles |
| app/admin/route.ts | Admin interface |
| app/api/admin/ | Protected login, logout, moderation, programme and backup endpoints |
| app/articles/ | Articles editor and individual reading pages |
| app/api/ | Public reviews, suggestions, articles, programme and next-screening endpoints |
| lib/club-data.ts | Programme queries, initialization and validation |
| lib/initial-programme.json | Original programme imported once into a new database |
| lib/admin-auth.ts | Password hashing, session verification and cookie handling |
| db/schema.ts / drizzle/ | Database schema and migrations |
| public/assets/ | Film stills and the TV emblem |

After changing site.html:

```bash
node scripts/sync-homepage.mjs
```

Routine film updates happen in `/admin`, not by editing the programme source. Articles support paragraphs, headings, bold, italics, quotes and preview. Drafts are stored only in the writer's browser.

## Checks

```bash
corepack pnpm run build
corepack pnpm test
```

Tests use isolated local databases and test-only credentials. They cover both admins, moderation, film/screening management, session protections and public next-screening selection. They do not post to or change the live draft. Visual browser testing is a separate local check.

## Deploy to your Cloudflare account

This repository includes deployment helpers, but no production credentials or database ID. Signing in happens in your WSL terminal/browser; no API token needs to be sent in chat.

1. Authorize Wrangler and create the database:

```bash
corepack pnpm run cf:login
corepack pnpm run cf:create-db
```

2. Edit `cloudflare.config.json`: set your Cloudflare `account_id` and the `database_id` printed by the database-creation command. Keep the desired Worker name. Account/database IDs are identifiers, not passwords.

3. Rebuild and apply the database migrations:

```bash
corepack pnpm run build
corepack pnpm run cf:migrate
```

4. Upload the admin credentials as a Cloudflare **secret** and deploy:

```bash
corepack pnpm run cf:secrets
corepack pnpm run cf:deploy
```

Wrangler may ask to create the Worker when its secret is uploaded for the first time. Confirm the intended name and account. If it requires a first deployment before uploading secrets, run `cf:deploy`, then `cf:secrets`, then `cf:deploy` again; admin login remains unavailable until credentials exist.

5. Open the URL returned by Wrangler, sign into `/admin`, and initialize the programme. The address uses your chosen `workers.dev` subdomain, not `tastymango`.

6. Review the new site before replacing the link you shared with friends.

The free Workers plan has CPU and usage limits. Password verification uses native Web Crypto, but measure real deployed requests before relying on the free tier. Deployment and production CPU usage have not been verified until you complete these steps.

### Existing live data and backups

Cloning this repository does **not** copy the live draft's database. Its data remains on its existing host. Before switching links, export/import its existing submissions and articles separately; do not retire the draft until that transfer has been checked. Applying the migrations to an existing database preserves its published contributions and articles.

Use **Download backup** in the admin regularly, and save backups privately outside Git. Before major changes, you can also export the deployed D1 database:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 export DB --remote --config dist/server/wrangler.json --output backups/club.sql
```

Create the ignored `backups/` directory first. Backups contain contributor names and writing; don't commit or publish them.

## Authentication notes

Sessions use random opaque tokens, stored hashed in D1, with an eight-hour expiry. Cookies are HttpOnly and SameSite=Strict; HTTPS adds Secure. Every admin action checks the session and request origin on the server. Login attempts are limited. Password hashes use unique salts and PBKDF2-SHA256 with 100,000 iterations, compatible with Workers' native Web Crypto iteration cap. Credentials are held in a runtime secret, not in the database or browser bundle. Use long, distinct passphrases.

## Images

Film stills belong to their respective rights holders; source links are listed on the home page. The TV emblem is an AI-edited adaptation of TheLoyalOrder's Hamilton coat-of-arms illustration on Wikimedia Commons (CC BY-SA 4.0), with eyes replacing bull heads and the club name on the screen. Attribution is included. No blanket licence is granted for third-party images.

## Finding covers for new films

In Programme, enter the title/year and choose Film or Series, then click **Find film details & cover**. Choose the matching result by its title and year to fill title, year, director (or series creators), kind and cover, then review and **Save film**. Your programme section and evening note are preserved. Missing information remains available for manual entry. Wide stills are preferred, with posters as fallback. Search never changes the stored image until you choose and save. Existing covers remain unchanged. Manual HTTPS image URLs and saving without a cover still work when search is unavailable.

Cover search needs a free non-commercial TMDB API connection. Create a TMDB account and request a developer API credential in account Settings → API. Use the **API Read Access Token**, not the shorter API key. Do not paste it into chat or commit it to Git.

For local development append `TMDB_READ_TOKEN=your-token` as a separate line in the ignored `.dev.vars` file, then restart the dev server. For production, after building with your Cloudflare configuration, run:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js secret put TMDB_READ_TOKEN --config dist/server/wrangler.json
```

Paste the token into Wrangler's hidden prompt. Deploy the new code with `corepack pnpm run cf:deploy`. Only administrators can search; the token stays on the server. Each search sends only the film title, year and kind to TMDB, not admin passwords or submissions. The public credits include TMDB's approved logo and attribution. Search has been tested with mocked TMDB responses; a real token is needed to verify the connection after deployment.


## Animated club emblem

The approved green outline TV image is `public/assets/cinema-emblem-green.webp`. `public/emblem.js` animates small clipped copies of its three eye regions without redrawing the rest of the image. Each eye has its own random 12–18 second delay and a 180 ms blink. Animation pauses in hidden tabs and stays off when reduced motion is requested. With JavaScript unavailable, the full static emblem remains visible. The shared component is used on the homepage, Articles and Admin.
