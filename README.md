# Script Image Generator

Turns a timestamped YouTube script into one MS-Paint-style illustration
per timestamp, generated with OpenAI's API, output as exact 1920x1080
(16:9) frames ready to download.

## How it works

1. **Paste script** — paste a timestamped script. It's parsed into
   `{ timestamp, narration }` segments.
2. **Write prompts** — one GPT call (`gpt-4o-mini`) reads the whole
   script and writes a concrete visual-scene prompt for every
   timestamp, keeping recurring characters/symbols consistent across
   the video. Each prompt is editable, and a "Rewrite this line"
   button re-generates a single prompt with the other prompts as
   context.
3. **Generate images** — only enabled once every segment has a prompt.
   Each prompt (prefixed with a fixed MS-Paint style description) is
   sent to the configured image provider (`IMAGE_PROVIDER` — either
   free, keyless Pollinations.ai, or OpenAI's `gpt-image-1`) one at a
   time, with a progress bar. Neither provider guarantees a true 16:9
   size, so each returned image is immediately composited client-side
   (via `<canvas>`) onto an exact white 1920x1080 frame, scaled to
   fit the height — this is the only version ever shown or saved (it
   also re-encodes to genuine PNG regardless of what the provider
   actually returned, e.g. Pollinations serves JPEG).
4. **Results** — download any image individually, or all of them at
   once as a ZIP (via `jszip`), named after their timestamp (e.g.
   `0-07.png`, `0-00-0-17.png` for ranges). Every file is a pixel-exact
   1920x1080 PNG.
5. **Create video** — optionally upload a voice-over audio file, then
   "Combine images into video" draws each generated image onto a
   canvas for its segment's duration (derived from its timestamp — a
   range like `0:00-0:17` uses that span, a single timestamp runs
   until the next one starts), captures the canvas plus the audio
   track with `MediaRecorder`, and offers the result as a downloadable
   video with an inline preview.

The prompt-writing call and the image-generation call both happen in
serverless API routes (`/api/write-prompts`, `/api/generate-image`) so
your `OPENAI_API_KEY` never reaches the browser. Image generation goes
through `lib/imageProviders/` — `openai.js` and `pollinations.js` share
one function signature (prompt + options in, a PNG/JPEG `Buffer` out),
dispatched by `index.js` based on `IMAGE_PROVIDER`, so the route itself
doesn't need to know which backend is active.

## Local development

```bash
npm install
cp .env.local.example .env.local
# edit .env.local and set OPENAI_API_KEY (and optionally ACCESS_PASSWORD)
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable          | Required | Description                                                                                                     |
| ----------------- | -------- | ----------------------------------------------------------------------------------------------------------------|
| `IMAGE_PROVIDER`  | No       | `"pollinations"` (default — free, no key needed) or `"openai"` (uses `gpt-image-1`, requires `OPENAI_API_KEY`). Only affects image generation. |
| `OPENAI_API_KEY`  | Yes, unless you never use "Auto-write visual prompts" | Prompt-writing (`gpt-4o-mini`) always uses OpenAI regardless of `IMAGE_PROVIDER`, so this is still needed for that step. Also used for image generation if `IMAGE_PROVIDER=openai`. Used server-side only, never exposed to the client. |
| `ACCESS_PASSWORD` | No       | If set, a password gate is shown before the tool is usable, so a leaked URL can't burn your OpenAI credits. If unset, the gate is skipped entirely. |

## Deploying to Vercel

```bash
vercel
vercel env add OPENAI_API_KEY
vercel env add ACCESS_PASSWORD   # optional
vercel --prod
```

## Notes

- Images are generated sequentially (not in parallel) to stay under
  OpenAI rate limits, with a visible "Generating X of Y" progress bar.
- `gpt-image-1` requires an OpenAI organization that's been verified
  for image generation access.
- Video export runs entirely in the browser (canvas + `MediaRecorder`,
  no server involved) and records in real time, so it takes roughly as
  long as the video's own duration. It needs a Chromium-based browser
  (Chrome/Edge) for audio capture — Safari does not support
  `HTMLMediaElement.captureStream()`. Output is `.webm` unless the
  browser supports recording `.mp4` directly.
