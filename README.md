# Gather: AI Celebration & Event Planner

PromptWars Virtual, Challenge 5. A web app that plans weddings, birthdays and community events: budget split, dated timeline, vendor checklist and personalized ideas, powered by Gemini.

## Run
```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY from aistudio.google.com
export $(cat .env | xargs) && npm start   # http://localhost:8080
npm test
```
Without a key the app serves a template plan so it never breaks.

## Design choices
- **Problem fit:** budget, timeline, vendor checklist and ideas are the four outputs the brief asks for.
- **Security:** API key stays server-side; input validated; 10 KB body cap; per-IP rate limit; strict CSP; all model output is length-clamped and rendered with `textContent` (no `innerHTML`); style notes are passed as data, not instructions.
- **Reliability:** budget math is computed in code (always sums to total); the model only supplies timeline, vendors and ideas; template fallback on any AI error.
- **Accessibility:** labelled fields, live region, keyboard focus styles, dark mode, print stylesheet.
- **Deploy:** `gcloud run deploy --source . --set-env-vars GEMINI_API_KEY=...`

## Structure
- `server.js`: Express app factory (`createApp`), security headers, gzip, routes
- `gemini.js`: Gemini client with timeout, one retry on 429/500/503, and a fallback model
- `planner.js`: validation, budget math, timeline dating, output sanitising, template fallback
- `utils.js`: TTL cache and per-IP rate limiter
- `test/`: unit and API tests (`npm test`), with the AI call stubbed so tests run offline

Identical requests are cached for 10 minutes; static files are cached and responses are gzip-compressed.
