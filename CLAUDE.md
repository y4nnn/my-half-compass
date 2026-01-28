# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Echo is a French-language dating/matching app that uses voice-based AI conversations to build detailed user profiles. Users talk with "Luna" (an AI guide powered by Google's Gemini Live API) who conducts a natural 30-minute conversation, then their transcript is analyzed to create a comprehensive personality profile for matching purposes.

## Commands

```bash
# Development
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build

# Testing (Vitest with jsdom)
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode

# Linting
npm run lint         # Run ESLint
```

## Architecture

### Frontend Stack
- **React 18** with TypeScript (non-strict mode)
- **Vite** for bundling (with SWC for fast compilation)
- **React Router** for routing
- **TanStack Query** for server state
- **Framer Motion** for animations
- **shadcn/ui** components (Radix UI primitives + Tailwind)

### Backend Services (Supabase Edge Functions)
Located in `supabase/functions/` - these are **Deno-based** TypeScript functions:

- **gemini-voice-session**: WebSocket relay between client and Google Gemini Live API
  - Handles real-time audio streaming (16-bit PCM at 16kHz input, 24kHz output)
  - Contains Luna's personality prompt in French
  - Uses `gemini-2.5-flash-native-audio-preview-12-2025` model

- **analyze-profile**: Analyzes conversation transcripts to generate user profiles
  - Uses Lovable AI Gateway with Gemini 2.5 Pro
  - Extracts personality traits (Big Five), relationship style, values, interests
  - Returns structured JSON profile via function calling

- **generate-summary**: Additional profile generation endpoint

### Database (Supabase)
- **sessions** table: Stores conversation transcripts linked to user IDs
- Migrations in `supabase/migrations/`
- Row-level security (RLS) policies enabled

### Key Application Flow
State machine in [src/pages/Index.tsx](src/pages/Index.tsx):
```
welcome → auth → privacy → microphone → voiceChat → report → matching
```

### Authentication
- Managed via `AuthContext` in [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx)
- Supabase Auth with email/password sign-up and sign-in

### Audio System (`src/lib/audioUtils.ts`)
- `MicrophoneCapture`: Captures audio at 16kHz, encodes to base64 PCM
- `AudioPlaybackQueue`: Plays received audio chunks smoothly at 24kHz
- Helper functions for PCM/Float32/base64 conversions

### Custom Hook (`src/hooks/useGeminiVoice.ts`)
Manages the entire voice session lifecycle:
- WebSocket connection to Supabase edge function
- Microphone capture and audio streaming
- Playback queue for AI responses
- Transcript accumulation

## Environment Variables

Required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

Required in Supabase:
- `GOOGLE_AI_API_KEY` - For Gemini Live API (voice sessions) and profile analysis

## Styling

- Dark theme by default (violet-blue accent color)
- CSS variables defined in [src/index.css](src/index.css)
- Custom utilities: `.bg-warm-gradient`, `.shadow-glow`, `.animate-breathe`
- Uses Inter and DM Sans fonts

## Import Aliases

Use `@/` prefix for imports from `src/`:
```typescript
import { Button } from "@/components/ui/button";
import { useGeminiVoice } from "@/hooks/useGeminiVoice";
```

## UI Components

All shadcn/ui components are in `src/components/ui/`. Add new components via:
```bash
npx shadcn@latest add [component-name]
```

## Language

The app UI and AI conversations are in **French**. Luna's system prompt enforces French-only responses with a casual, friendly tone.

## Testing

Tests use **Vitest** with **jsdom** environment and **@testing-library/react**:
- Test files: `**/*.{test,spec}.{ts,tsx}`
- Setup: [src/test/setup.ts](src/test/setup.ts) (includes matchMedia polyfill)
