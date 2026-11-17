# HomeBridge — AI discharge-to-home medicine reconciler

**Concept prototype for Tata 1mg. Not an official 1mg product.**

When a patient comes home from hospital, the family holds a discharge summary with 6–10 medicines and a box of medicines already at home. HomeBridge uses AI to reconcile the two lists, flag duplicates and gaps, order only what is missing, and book the follow-up test.

## The journey

1. Upload the discharge summary (PDF, photo or text), or use the sample case
2. Add the medicines already at home
3. AI extracts the summary, matches brands to salts, and reconciles both lists
4. Reconciled plan: Continue, Dose changed, New, Stop, Possible duplicate, Ask doctor, each with its quoted source line
5. AI-drafted questions for the doctor on flagged items
6. Smart cart (only what is missing, generic toggle) plus follow-up test booking
7. Daily schedule, remove-from-box list, red-flag symptoms, printable plan

## How the AI works

`api/reconcile.js` (server-side, Vercel function):

1. **Extract** (Gemini, vision for PDFs/photos): structured JSON with verbatim source quotes
2. **Normalise** (code): brand to salt and drug class via `shared/catalogue.js`
3. **Reconcile + explain** (Gemini, temperature 0): one status per medicine, English and Hindi reasons, doctor questions
4. **Safety rules** (code, `shared/rules.js`): never Stop without an explicit instruction; home medicines missing from the summary go to Ask doctor; same drug class means Possible duplicate; any medicine the AI missed is added back; source quotes are checked against the summary

If the AI call fails on the sample case, the app can show a saved result (`shared/sample.js`), clearly labelled.

## Deploy

1. Import this repo in Vercel (framework: Vite, defaults are fine)
2. Add environment variable `GEMINI_API_KEY` (free key from https://aistudio.google.com/apikey)
3. Optional: `GEMINI_MODEL` to pin a model (default tries `gemini-flash-latest`, then `gemini-2.5-flash`)

The key is only read on the server. It never appears in the browser bundle or this repo.

## Data

All data is synthetic: the patient, hospital and doctor are fictional, and catalogue prices are illustrative. Sample documents are in `public/samples/` (regenerate with `python3 scripts/make_samples.py`). Nothing a user uploads is stored.

## Local development

```bash
npm install
npm run dev          # front end only
npx vercel dev       # front end + API (needs GEMINI_API_KEY in .env)
```
