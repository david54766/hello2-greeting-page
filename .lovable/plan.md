## Live STT + streaming TTS for the Coaching Engine

Two upgrades to `/coach`: realtime transcription that writes into the prompt box as the user speaks, and TTS that starts playing within ~1s instead of waiting for the full MP3.

### 1. Realtime STT (live dictation)

Replace the current "record → upload → wait → paste" flow with ElevenLabs realtime Scribe.

- Install `@elevenlabs/react`.
- New server fn `createScribeToken` in `src/lib/stt.functions.ts` — calls `POST /v1/single-use-token/realtime_scribe` with `ELEVENLABS_API_KEY` and returns `{ token }`. Keep the existing `transcribeAudio` for backward compatibility (unused, can remove later).
- In `coach.tsx`, use the `useScribe` hook (`modelId: "scribe_v2_realtime"`, `commitStrategy: "vad"`).
  - On mic button press: fetch token → `scribe.connect(...)` with mic constraints.
  - As `partialTranscript` updates → live-append to a `liveTail` shown inline at the end of the textarea value.
  - On `onCommittedTranscript` → commit the chunk into the actual `prompt` state and clear the live tail.
  - On stop → `scribe.disconnect()` and flush any remaining partial into the prompt.
- Loading bar: replace the static "Transcribing…" toast with an inline indicator under the textarea:
  - Pulsing red dot + "Listening…" while recording.
  - Indeterminate progress bar (`<Progress />` with shimmer) shown when `scribe.isConnected` is true and no committed text yet, or when a partial is being processed.
  - "Speak your question" button toggles to "Stop" when active.

### 2. Streaming TTS (instant Raven playback)

Switch from "generate full MP3 → base64 → play" to a true audio stream so Raven starts speaking within a second.

- New server route `src/routes/api/tts-stream.ts` (`POST /api/tts-stream`):
  - Body: `{ text, voiceId? }` (Zod validated, 1–5000 chars).
  - Calls `https://api.elevenlabs.io/v1/text-to-speech/{voiceId}/stream?output_format=mp3_44100_128` with `model_id: "eleven_turbo_v2_5"` (lowest latency).
  - Returns the upstream `ReadableStream` directly with `Content-Type: audio/mpeg` and `Cache-Control: no-store`.
- Update `speak()` in `coach.tsx`:
  - `POST /api/tts-stream` with text → take `response.body` (ReadableStream).
  - Attach to an `<audio>` element via `MediaSource` + `SourceBuffer` (`audio/mpeg`), appending chunks as they arrive. Playback starts on `canplay` (first chunk).
  - Fallback: if `MediaSource` is unavailable, blob-and-play (current behavior).
  - Auto-speak on new response is preserved.
- Remove the old `synthesizeSpeech` server fn import path from coach (keep the file if used elsewhere).

### Files

- `src/lib/stt.functions.ts` — add `createScribeToken`.
- `src/routes/api/tts-stream.ts` — new streaming server route.
- `src/routes/_authenticated/coach.tsx` — swap STT to `useScribe`, add live transcript UI + progress bar, swap TTS to streaming fetch with MediaSource.
- `package.json` — add `@elevenlabs/react`.

### Out of scope

- No changes to coaching prompt/doctrine or response shape.
- No model swap for the strategist (still Gemini 2.5 Pro, structured tool call).
- No new tables or auth changes.
