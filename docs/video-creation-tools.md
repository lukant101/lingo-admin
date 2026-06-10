# Video Creation Tools

Tools that help admins produce the assets for a platform video inside the admin app. The pipeline takes an admin from idea to a downloadable bundle of assets (images, audio); the actual video editing happens outside the app (e.g. DaVinci Resolve), and the finished video comes back through the existing platform deck upload flow.

There are two kinds of video projects, which differ in the audio steps:

- **Dialogue video** — script is a dialogue; full-video audio is multi-speaker Gemini TTS
- **Song video** — script is song lyrics; full-video audio is a song generated with the Suno API

## Architecture decisions

- **All AI calls go through the backend** (`api.lingohouse.app`). New endpoints proxy to OpenAI, Google (Gemini), Anthropic, and Suno. API keys stay server-side; the app uses the existing Bearer-token client (`lib/api/client.ts`).
- **Audio processing happens on the backend** — mono→stereo conversion and cutting the card-audio TTS clip into per-card clips. The app collects cut points; the backend does the processing and stores results in Cloud Storage.
- **Image generation uses OpenAI gpt-image.** Images are 9:16 illustrations, never photorealistic — style is enforced in the backend's system/base prompt.
- **A video project is a backend-persisted entity**, similar to a platform deck draft. It holds everything produced along the way and can later feed a platform deck draft.

## The video project

A video project stores:

- kind: `dialogue` or `song`
- script: the dialogue lines or song lyrics (and the card texts derived from it)
- generated assets (Cloud Storage paths): approved images, per-card audio clips, deck audio (dialogue) or song (song)
- title and platform description (TikTok / Instagram Reels / YouTube Shorts)
- per-step status, so the admin can leave and resume

## Pipeline steps

### 1. Script writing — multi-model chat

The admin writes the dialogue or song lyrics with LLM help. A chat screen sends the same prompt to **ChatGPT, Gemini, and Claude** via the backend proxy and shows the three outputs side by side. The admin compares, iterates (follow-up messages per model or to all), and saves the final dialogue/lyrics to the project.

### 2. Image generation

9:16 illustrations based on the dialogue/lyrics, generated with gpt-image.

- The admin requests **1–4 images at a time**, with a prompt grounded in the script.
- Each image can be **approved** or sent for **redo**, optionally with comments on what to change (redo keeps the original prompt + appends the comments).
- The admin decides how many shots are enough — there is no fixed count.
- Approved images are stored in Cloud Storage on the project.

### 3. Card audio — Gemini TTS

- The backend generates **one TTS clip** from the card texts (Gemini TTS output is mono).
- The backend converts it to **stereo** and **cuts it into one clip per card**.
- Cut points are auto-suggested (silence detection) and shown in the app on a waveform/cut-point editor; the admin can adjust them before confirming.
- The app previews each resulting per-card clip; the admin can re-run TTS or re-cut.

### 4. Deck audio for dialogue videos — Gemini TTS

- Multi-speaker Gemini TTS over the whole dialogue.
- Backend converts to stereo. **No cutting needed.**

### 5. Song generation for song videos — Suno

- **Gemini generates a suggested song-style prompt** from the lyrics; the admin can edit it.
- The backend calls the **Suno API** with the lyrics + style prompt. Suno generation is slow, so this is an async job the app polls.
- The admin previews the song and accepts it or regenerates (optionally tweaking the style prompt).

### 6. Title and platform description

- Title and description are saved on the project; they will be used when posting to TikTok, Instagram Reels, and YouTube Shorts.
- Descriptions start from **templates** (per platform or shared) with placeholders filled from project data (title, language, hashtags, etc.).
- The app provides copy-to-clipboard for each platform.

### 7. Asset export — ZIP download

- The backend assembles a **ZIP of all approved assets** from Cloud Storage: images, per-card audio clips, deck audio or song, plus the script and title/description as text files.
- The app shows a download button once the required assets exist.
- The admin edits the video externally and uploads the result through the existing platform deck wizard.

## What needs to be built

### Backend (`api.lingohouse.app`)

- Video project CRUD endpoints
- LLM chat proxy endpoints (OpenAI, Google, Anthropic)
- gpt-image generation endpoint (9:16, illustration style enforced)
- Gemini TTS endpoints: card-audio variant and multi-speaker deck-audio variant
- Audio processing: mono→stereo conversion, silence detection for suggested cut points, clip splitting at given cut points
- Suno integration: style-prompt generation (via Gemini) and song generation as an async job with status polling
- ZIP export endpoint (streams or returns a signed URL)
- Description template storage
- Asset storage in Cloud Storage following the existing path conventions (see `lib/storage.ts`)

### Admin app

- New route group `app/admin/video-projects/` mirroring the platform-decks pattern (`app/admin/platform-decks/[draftId]/edit.tsx`): project list, new project, and a stepper/wizard for the pipeline steps
- New API module `lib/api/videoProjects.ts` using the base client
- New types in `types/` (TypeScript `type` aliases)
- Components:
  - multi-model chat compare view
  - image generation grid with approve / redo + comments
  - waveform cut-point editor with per-clip preview (reuse `hooks/useAudioPlayer.ts`)
  - song step (style prompt editor, generation status, preview)
  - title/description step with template picker and copy-to-clipboard
  - export step with ZIP download
- React Query for server state; React Native Paper components, per existing conventions

## Out of scope

- Video editing inside the app
- Auto-publishing to social platforms (descriptions are copy/paste for now)
- Changes to the existing platform deck upload flow

## Open questions

- Suno API plan, rate limits, and generation cost per song
- Should completing a video project auto-create a platform deck draft (pre-filling cards and card audio)?
- Template management: hardcoded templates first, or an editing UI from the start?
- Voice selection for Gemini TTS (fixed voices per language vs. admin-selectable)
- Do card texts come from the script automatically (e.g. one dialogue line per card) or does the admin edit them separately?
