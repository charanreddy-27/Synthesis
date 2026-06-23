# Deploying Synthesis to Vercel

Synthesis is a standard Next.js App Router app, so Vercel is the path of least resistance. The one
thing to understand up front: **it deploys and runs with zero configuration** because every external
dependency falls back to an offline mock. You add real services later, one at a time.

---

## TL;DR

1. Push to GitHub.
2. Import the repo on Vercel (framework auto-detected as **Next.js** — no setting changes needed).
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
4. Deploy. It runs immediately in offline/mock mode.
5. (Optional) Add `GOOGLE_API_KEY` and friends to make it "real."

---

## Step 1 — Connect the repo

1. Go to [vercel.com/new](https://vercel.com/new) and import
   [`charanreddy-27/synthesis`](https://github.com/charanreddy-27/synthesis).
2. Vercel detects Next.js. Leave the defaults:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build` (default)
   - **Output Directory:** `.next` (default — do not override)
   - **Install Command:** `npm install` (default)
   - **Root Directory:** repo root (the app is not in a subfolder)
3. Add the environment variable below, then **Deploy**.

That's it — the first deploy will succeed with a single env var, because with no API keys the app
runs the full multi-agent pipeline against the mock LLM, fixture search, and in-memory store.

---

## Step 2 — Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and Preview if you
want branch deploys to behave the same).

### Required for a clean deploy

| Variable | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://synthesis-charan.vercel.app` | Makes OG/Twitter image + canonical URLs absolute. Update if you add a custom domain. |

### Optional — flip each capability to "real" independently

| Variable | Value | Effect |
|---|---|---|
| `GOOGLE_API_KEY` | your key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Real Gemini reasoning for all agents. **Works on Vercel serverless as-is.** |
| `GOOGLE_MODEL` | `gemini-2.5-flash` | Fast/cheap model for researchers. |
| `GOOGLE_MODEL_SYNTHESIZER` | `gemini-2.5-pro` | Stronger model for synthesizer/critic. |
| `GOOGLE_EMBED_MODEL` | `text-embedding-004` | Embedding model for retrieval. |
| `SEARXNG_URL` | `https://<your-searxng-host>` | Real web search. **Requires a publicly reachable SearXNG instance** (the bundled `docker-compose.yml` is for local only). |
| `DATABASE_URL` | `postgresql://…` | pgvector retrieval **and** persistent shareable runs. Use a hosted Postgres with pgvector (Neon, Supabase, Vercel Postgres). |
| `MAX_TOKENS_PER_RUN` | `120000` | Per-run guardrail. |

> **Leave a variable unset to use its offline fallback.** You can ship with just `GOOGLE_API_KEY` (real
> reasoning, mock search) and add `SEARXNG_URL` / `DATABASE_URL` later.

---

## Step 3 — Custom domain (optional)

1. **Vercel → Project → Settings → Domains → Add.**
2. Add your domain (e.g. `synthesis.charanreddy.dev`).
3. Point DNS at Vercel: a `CNAME` to `cname.vercel-dns.com` for a subdomain, or the provided `A`
   record for an apex domain.
4. **Update `NEXT_PUBLIC_SITE_URL`** to the new domain and redeploy so social cards use it.

---

## Known limitation: shareable runs on serverless

The run store (`src/lib/runs/store.ts`) writes JSON to the local filesystem. That's perfect locally
and on a single long-lived instance, but **Vercel's serverless filesystem is read-only (except a
per-invocation `/tmp`)**, so `/run/<id>` share links won't reliably persist across requests in
production without a database.

- **For the offline demo deploy:** this doesn't matter — the live site showcases the control room and
  a full run end to end.
- **To make share links durable on Vercel:** set `DATABASE_URL` and back the run store with Postgres.
  The store is already written as a swappable seam for exactly this. (Listed in the manual checklist
  below.)

---

## Manual checklist — things only you can do

These can't be automated; do them when you're ready to ship:

1. **Create the GitHub repo** and confirm its slug matches `PROJECT.repo` in
   [`src/lib/site.ts`](src/lib/site.ts) (currently `charanreddy-27/synthesis`).
2. **Import on Vercel** and set `NEXT_PUBLIC_SITE_URL`.
3. **Add `GOOGLE_API_KEY`** in Vercel env vars to turn on real reasoning (keep the key out of git).
4. **(Optional) Stand up SearXNG** on a public host and set `SEARXNG_URL` for live web search.
5. **(Optional) Provision hosted Postgres + pgvector** (Neon/Supabase/Vercel Postgres), set
   `DATABASE_URL`, and back the run store with it for durable share links.
6. **Record a screenshot/GIF** of a live run and drop it into `docs/`, then reference it in the
   README hero (placeholder is already there).
7. **Confirm your contact email** — `PROFILE.email` in `src/lib/site.ts` is set to
   `charanreddychanda@gmail.com`; switch it to the `…chanda27@gmail.com` address if that's the one you
   actually want public.
8. **Point a custom domain** (optional) and update `NEXT_PUBLIC_SITE_URL`.
9. **Write the LinkedIn launch post**, then paste its URL into `PROJECT.linkedinPost` in
   `src/lib/site.ts` — the "Launch post" button on `/about-project` appears automatically once it's set.
10. **Verify the OG card** with [opengraph.xyz](https://www.opengraph.xyz/) after deploy.

---

## Local sanity check before every deploy

```bash
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # eslint
npm run test          # vitest
npm run build         # production build
```

All four are green on `main`. Don't run `next build` while `next dev` is live — they share `.next`.
