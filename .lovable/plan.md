
# Plan: Replace ElevenLabs with Gemini Live API for Voice Chat

## Overview

This plan migrates the voice conversation system from ElevenLabs to Google's Gemini Multimodal Live API, reducing costs from $3-5+ per session (ElevenLabs) to approximately $0.23 per 30-minute session (Gemini 2.5 Flash).

## Architecture Comparison

**Current (ElevenLabs)**
```text
+-------------+     WebRTC      +------------------+
|   Browser   | <------------> | ElevenLabs Agent |
| (React SDK) |                | (Public Agent)   |
+-------------+                +------------------+
```

**Proposed (Gemini Live)**
```text
+-------------+   WebSocket   +----------------+   WebSocket   +-------------+
|   Browser   | <-----------> | Edge Function  | <-----------> | Gemini Live |
| (Custom)    |               | (Audio Proxy)  |               | API         |
+-------------+               +----------------+               +-------------+
```

## Why a Proxy Architecture?

The Gemini Live API requires an API key for WebSocket connections. For security, we will:
1. Create a backend edge function that holds the Google API key
2. Proxy audio streams between the browser and Gemini
3. Use the Lovable AI Gateway for the API key (no user-provided keys needed)

**Important Note:** The Lovable AI Gateway currently supports text-based Gemini requests. For real-time audio streaming, we need to verify if the gateway supports WebSocket proxying. If not, you may need to add a `GOOGLE_AI_API_KEY` secret.

---

## Implementation Steps

### Step 1: Create Gemini WebSocket Proxy Edge Function

Create a new edge function `gemini-voice-session` that:
- Accepts WebSocket upgrades from the browser
- Establishes a WebSocket connection to Gemini Live API
- Forwards audio chunks bidirectionally
- Handles session setup with system prompt and audio config

**Key Configuration:**
- Model: `gemini-2.5-flash-native-audio-preview` (for voice)
- Input: PCM 16-bit, 16kHz sample rate
- Output: PCM 16-bit, 24kHz sample rate
- Voice Activity Detection: Enabled (automatic turn detection)

### Step 2: Create GeminiVoiceChat Component

Build a new React component that replaces the ElevenLabs-based `VoiceChat.tsx`:

**Core Functionality:**
- Capture microphone audio using Web Audio API
- Convert to PCM 16kHz, base64 encode, send via WebSocket
- Receive PCM 24kHz audio, decode and play through AudioContext
- Track conversation transcript from server events
- Handle interruptions (barge-in) when user speaks over AI

**State Management:**
- Connection status (connecting, connected, disconnected)
- Speaking states (user speaking, AI speaking, listening)
- Live transcript accumulation
- Error handling for quota/rate limits

### Step 3: Create Audio Utilities

Build helper functions for:
- `createAudioContext()` - Initialize Web Audio API
- `startMicrophoneCapture()` - Get microphone stream, convert to PCM
- `playAudioChunk()` - Decode and queue PCM audio for playback
- `base64ToPcm()` / `pcmToBase64()` - Encoding utilities

### Step 4: Update VoiceChat Component

Replace ElevenLabs integration with Gemini:
- Remove `@elevenlabs/react` hook usage
- Import new Gemini connection logic
- Keep existing UI structure (VoiceOrb, controls, transcript display)
- Maintain same `onComplete` / `onExit` interface

### Step 5: Configure System Prompt

Move the AI therapist personality to the Gemini setup message:

```text
You are a warm, empathetic AI guide helping someone discover 
meaningful connections. Your role is to have a natural, supportive 
conversation about their life experiences...
```

### Step 6: Update Edge Function Configuration

Add the new function to `supabase/config.toml`:
```toml
[functions.gemini-voice-session]
verify_jwt = false
```

---

## Technical Details

### WebSocket Message Flow

**Browser to Server (User Speaking):**
```json
{ "type": "audio", "data": "base64_pcm_16khz" }
```

**Server to Browser (AI Speaking):**
```json
{ "type": "audio", "data": "base64_pcm_24khz" }
{ "type": "transcript", "role": "user", "text": "..." }
{ "type": "transcript", "role": "assistant", "text": "..." }
{ "type": "turnComplete" }
{ "type": "interrupted" }
```

### Audio Pipeline

**Input (Microphone):**
1. `getUserMedia()` captures audio
2. AudioWorklet processes to PCM 16-bit @ 16kHz
3. Base64 encode chunks (~100ms intervals)
4. Send via WebSocket

**Output (Speaker):**
1. Receive base64 PCM @ 24kHz
2. Decode to Float32Array
3. Queue in AudioBufferSourceNode
4. Handle interruption by clearing queue

### Error Handling

- **Rate limits (429):** Display toast, suggest retry later
- **Quota exceeded (402):** Show credits message
- **Connection drops:** Auto-reconnect with exponential backoff
- **Microphone errors:** Clear user-friendly error messages

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/gemini-voice-session/index.ts` | WebSocket proxy to Gemini Live API |
| `src/hooks/useGeminiVoice.ts` | React hook for Gemini voice connection |
| `src/lib/audioUtils.ts` | Audio capture/playback utilities |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/VoiceChat.tsx` | Replace ElevenLabs with Gemini hook |
| `supabase/config.toml` | Add new edge function config |

## Files to Remove (Optional Cleanup)

| File | Reason |
|------|--------|
| `supabase/functions/elevenlabs-conversation-token/` | No longer needed |

---

## Cost Comparison Summary

| Provider | 30-min Session | 1,000 Users |
|----------|----------------|-------------|
| **Gemini 2.5 Flash** | ~$0.23 | ~$230 |
| **Gemini 2.5 Pro** | ~$0.47 | ~$470 |
| **ElevenLabs** | $3-5+ (quota limited) | $3,000-5,000+ |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Lovable AI Gateway may not support WebSocket streaming | Fall back to direct Google API key (add `GOOGLE_AI_API_KEY` secret) |
| Audio latency in proxy architecture | Optimize chunk sizes, consider direct client connection with ephemeral tokens |
| Browser audio API compatibility | Test across Chrome, Firefox, Safari; add polyfills if needed |
| Gemini voice quality vs ElevenLabs | Test thoroughly; Gemini voices are good but different character |

---

## Next Steps After Approval

1. Verify if Lovable AI Gateway supports Gemini Live WebSocket (if not, I'll ask you to add a Google API key)
2. Create the edge function for WebSocket proxying
3. Build the audio utilities and React hook
4. Update VoiceChat component
5. Test end-to-end voice conversation
6. Clean up ElevenLabs code
