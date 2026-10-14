# Movie Evenings in Hamilton

A small cinema club website with a director-grouped programme, screening diary, shared reviews, movie suggestions, long-form articles, and a shared next-screening selector.

Current live site: https://movie-evenings-in-hamilton.tastymango4.chatgpt.site/

## Current implementation

- TypeScript, Vinext/Vite and Cloudflare Workers.
- Cloudflare D1: a hosted SQLite-based database. Local development uses a separate emulated D1 database.
- HTML/CSS and browser JavaScript for the public interface.
- Drizzle schema and versioned SQL migrations.
- Anyone can currently post reviews, articles, and suggestions, and choose an unwatched title as the next screening.
- Admin authentication and moderation are planned, not implemented in this snapshot.

## Run locally

Use Node.js 22.13 or newer and the package manager version recorded in package.json. Windows and WSL are both supported by the portable development profile.

```bash
git clone https://github.com/iaiaianana/movie-evenings-in-hamilton.git
cd movie-evenings-in-hamilton
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

On a fresh clone, apply the following migrations **once**, in order, to create the local database:

```bash
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_cool_madelyne_pryor.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fearless_lily_hollister.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_many_doorman.sql
corepack pnpm run dev
```

Open the localhost address printed by the development command (normally port 5173). Local reviews and articles are separate from the live site. The default next screening is Persona unless the local database contains another selection.

Do not replay migrations already applied. Append new migrations for future schema changes; never rewrite applied SQL or its metadata.

## Where to change things

| File or directory | Purpose |
| --- | --- |
| site.html | Editable home-page source: design, film programme and diary |
| app/site-html.ts | Generated copy of site.html consumed by the home-page route |
| lib/article-shell.ts | Articles-page layout and styles |
| app/articles/route.ts | Articles list and writing interface |
| app/articles/[id]/route.ts | Individual article reading page |
| app/api/ | Reviews, suggestions, articles, and next-screening endpoints |
| lib/programme.ts | Server-side allowlist and cover metadata for next-screening choices |
| db/schema.ts | Database tables |
| drizzle/ | Database migrations and metadata |
| public/assets/ | Film stills and club emblem |

After editing site.html, regenerate its served copy:

```bash
node scripts/sync-homepage.mjs
```

The programme is currently code-defined. If adding or marking films watched, also update lib/programme.ts and the watched-film allowlist in app/api/community/route.ts. Moving these records into the database is part of the planned admin work.

## Checks

```bash
corepack pnpm run build
node tests/community.mjs
node tests/deployment.mjs
```

The tests use isolated local databases and do not post to the live site. Browser visual QA remains a separate step.

## Hosting and data

This repository preserves the current source; it does not transfer the live database or hosting account. .openai/hosting.json retains the local binding declarations but deliberately omits the existing Site project ID. Independent Cloudflare deployment and admin setup will be configured in a later step.

The planned migration is to a Cloudflare account controlled by the club owner, with two password-based admin accounts and moderation. Everyone will retain the ability to choose the next screening.

Never commit credentials, .env files, local databases, production database exports, node_modules, or build output. Back up live submissions separately before moving hosting.

## Images

Film stills belong to their respective rights holders; source links are listed on the home page. The custom club emblem is adapted from TheLoyalOrder's Hamilton coat of arms illustration on Wikimedia Commons (CC BY-SA 4.0); its ribbon lettering was replaced using an AI image edit. Attribution and licence links are included on the site. No blanket licence is granted for third-party images.
