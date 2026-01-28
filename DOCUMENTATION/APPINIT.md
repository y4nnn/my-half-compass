# Echo - Application Documentation

**Version:** 1.0.0
**Last Updated:** January 2025
**Purpose:** Complete codebase reference for development and React Native migration

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Core Components](#4-core-components)
5. [Hooks & State Management](#5-hooks--state-management)
6. [Voice Integration](#6-voice-integration)
7. [Database Schema](#7-database-schema)
8. [Supabase Edge Functions](#8-supabase-edge-functions)
9. [Styling & Theming](#9-styling--theming)
10. [Dependencies](#10-dependencies)
11. [Configuration Files](#11-configuration-files)
12. [React Native Migration Guide](#12-react-native-migration-guide)
13. [Key Files Reference](#13-key-files-reference)

---

## 1. Project Overview

### What is Echo?

Echo is a **French-language voice-based AI dating platform** that creates deep psychological profiles through natural conversations. Users engage in 25-30 minute voice sessions with "Luna," an AI personality powered by either **Google Gemini** or **xAI Grok**.

### Core Features

- **Real-time voice conversations** with AI (speech-to-speech)
- **Dual AI provider support** (Gemini and Grok)
- **12-dimension psychological profiling**
- **Multi-session memory** - Luna remembers previous conversations
- **Conversation journal** - Summary of all discussions across sessions
- **Session cost tracking** - Real-time API cost estimation
- **Profile persistence** - Profiles evolve over multiple sessions

### User Flow

```
Welcome → Auth → Privacy → Mic Permission → Voice Chat → Profile Report → Matching
   1        2        3           4              5             6             7
```

### Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| Voice AI | Google Gemini 2.5 Flash / xAI Grok 3 |
| Audio | Web Audio API + Web Speech API |

---

## 2. Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ VoiceChat│  │ Profile  │  │   Auth   │  │  State Machine   │ │
│  │   .tsx   │  │Report.tsx│  │Screen.tsx│  │   (Index.tsx)    │ │
│  └────┬─────┘  └──────────┘  └────┬─────┘  └──────────────────┘ │
│       │                           │                              │
│  ┌────┴────────────────────┐  ┌───┴──────────────────────────┐  │
│  │      useVoice Hook      │  │      AuthContext             │  │
│  │  ┌─────────┐ ┌────────┐ │  │   (Supabase Auth)           │  │
│  │  │ Gemini  │ │  Grok  │ │  └──────────────────────────────┘  │
│  │  └────┬────┘ └───┬────┘ │                                    │
│  └───────┼──────────┼──────┘                                    │
└──────────┼──────────┼───────────────────────────────────────────┘
           │          │
    WebSocket    WebSocket
           │          │
    ┌──────┴──────────┴──────┐
    │      Voice APIs        │
    │  ┌────────┐ ┌────────┐ │
    │  │ Gemini │ │  Grok  │ │
    │  │  Live  │ │   RT   │ │
    │  └────────┘ └────────┘ │
    └────────────────────────┘

           │
    ┌──────┴──────────────────┐
    │     Supabase Backend    │
    │  ┌────────────────────┐ │
    │  │    PostgreSQL      │ │
    │  │  - users           │ │
    │  │  - sessions        │ │
    │  │  - messages        │ │
    │  │  - user_profiles   │ │
    │  └────────────────────┘ │
    │  ┌────────────────────┐ │
    │  │  Edge Functions    │ │
    │  │  - analyze-profile │ │
    │  │  - generate-summary│ │
    │  │  - grok-token      │ │
    │  └────────────────────┘ │
    └─────────────────────────┘
```

### Data Flow

1. **User speaks** → Microphone captures audio (16kHz PCM)
2. **Audio streamed** → WebSocket to Gemini/Grok API
3. **AI responds** → Audio + transcript received
4. **Audio plays** → Through AudioPlaybackQueue (24kHz)
5. **Session ends** → Transcript sent to `analyze-profile` function
6. **Profile generated** → Stored in `user_profiles` table
7. **Next session** → Previous profile loaded as context for Luna

---

## 3. Directory Structure

```
my-half-compass/
├── DOCUMENTATION/
│   └── APPINIT.md              # This file
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── placeholder.svg
├── src/
│   ├── App.tsx                 # Root component with providers
│   ├── main.tsx                # React DOM entry point
│   ├── index.css               # Global CSS variables
│   ├── vite-env.d.ts           # Vite types
│   ├── components/
│   │   ├── WelcomeScreen.tsx   # Step 1: Landing
│   │   ├── AuthScreen.tsx      # Step 2: Login/Signup
│   │   ├── PrivacyDisclaimer.tsx # Step 3: Privacy consent
│   │   ├── MicrophonePermission.tsx # Step 4: Mic access
│   │   ├── VoiceChat.tsx       # Step 5: Main voice UI ★
│   │   ├── ProfileReport.tsx   # Step 6: Results display ★
│   │   ├── NavLink.tsx         # Navigation helper
│   │   └── ui/                 # 60+ shadcn/ui components
│   │       ├── VoiceOrb.tsx    # Custom animated orb ★
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       └── ... (58 more)
│   ├── contexts/
│   │   └── AuthContext.tsx     # Authentication state
│   ├── hooks/
│   │   ├── useVoice.ts         # Provider abstraction ★
│   │   ├── useGeminiVoice.ts   # Gemini Live API ★★★
│   │   ├── useGrokVoice.ts     # Grok API ★★
│   │   ├── use-mobile.tsx      # Mobile detection
│   │   └── use-toast.ts        # Notifications
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Supabase init
│   │       └── types.ts        # Auto-generated types
│   ├── lib/
│   │   ├── audioUtils.ts       # Audio capture/playback ★★
│   │   ├── sessionService.ts   # Database operations ★★
│   │   ├── costEstimation.ts   # API cost tracking
│   │   └── utils.ts            # Utility functions
│   ├── pages/
│   │   ├── Index.tsx           # State machine (7 steps) ★
│   │   └── NotFound.tsx        # 404 page
│   └── test/
│       ├── setup.ts            # Vitest setup
│       └── example.test.ts     # Sample test
├── supabase/
│   ├── config.toml             # Supabase config
│   ├── functions/
│   │   ├── analyze-profile/    # Profile generation ★★
│   │   │   └── index.ts
│   │   ├── generate-summary/   # Session summaries
│   │   │   └── index.ts
│   │   └── grok-token/         # Grok authentication
│   │       └── index.ts
│   └── migrations/
│       ├── 20250127_create_sessions.sql
│       ├── 20250128_add_rls_policies.sql
│       ├── 20250129_create_user_profiles.sql
│       └── 20250130_add_session_cost_tracking.sql
├── .env                        # Environment variables
├── package.json                # Dependencies
├── tailwind.config.ts          # Tailwind theme
├── tsconfig.json               # TypeScript config
└── vite.config.ts              # Vite bundler config

★ = Important  ★★ = Very Important  ★★★ = Critical
```

---

## 4. Core Components

### Index.tsx - Application State Machine

**Location:** `src/pages/Index.tsx`

The main page manages a 7-step user journey using a state machine pattern:

```typescript
type AppStep =
  | "welcome"     // WelcomeScreen
  | "auth"        // AuthScreen
  | "privacy"     // PrivacyDisclaimer
  | "microphone"  // MicrophonePermission
  | "voice-chat"  // VoiceChat
  | "report"      // ProfileReport
  | "matching";   // Future feature

const [step, setStep] = useState<AppStep>("welcome");
```

### VoiceChat.tsx - Main Voice Interface

**Location:** `src/components/VoiceChat.tsx`

**Responsibilities:**
- Provider selection UI (Gemini vs Grok)
- Voice selection for Grok (Ara, Eve, Sal, Rex, Leo)
- Real-time transcript display
- Session duration timer
- Live cost estimation
- Microphone level indicator
- Connection status display

**Key Props:**
```typescript
interface VoiceChatProps {
  userId: string;
  onComplete: (profileData: any) => void;
  onExit: () => void;
}
```

**Important State:**
```typescript
const [selectedProvider, setSelectedProvider] = useState<VoiceProvider | null>(null);
const [selectedGrokVoice, setSelectedGrokVoice] = useState<GrokVoiceOption | null>(null);
const [existingProfile, setExistingProfile] = useState<ExistingProfileContext | undefined>(undefined);
```

### ProfileReport.tsx - Results Display

**Location:** `src/components/ProfileReport.tsx`

Displays the psychological profile with expandable sections:

- **Conversation Journal** - Summary of all sessions
- **Overall Summary** - Narrative profile description
- **Key Insights** - Important discoveries
- **Basic Info** - Name, age, location, occupation
- **Identity & Self-Concept** - Core values, self-esteem
- **Temperament** - Emotional reactivity patterns
- **Emotional Regulation** - Coping strategies
- **Cognitive Style** - Thinking patterns
- **Motivation** - Goals and drives
- **Personality Traits** - Big Five + extras
- **Interpersonal Style** - Attachment, communication
- **Relationship Profile** - Love languages, deal breakers

### VoiceOrb.tsx - Animated Voice Indicator

**Location:** `src/components/ui/VoiceOrb.tsx`

Custom animated component showing voice state:
- Breathing animation when idle
- Pulse animation when listening
- Wave animation when AI is speaking

```typescript
interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isConnecting: boolean;
  size?: "sm" | "md" | "lg";
}
```

---

## 5. Hooks & State Management

### useVoice - Unified Voice Provider

**Location:** `src/hooks/useVoice.ts`

Abstracts between Gemini and Grok providers:

```typescript
interface VoiceHookReturn {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  status: ConnectionStatus;
  isSpeaking: boolean;
  isListening: boolean;
  sessionReady: boolean;
  micLevel: number;
  transcript: TranscriptMessage[];
  getTranscript: () => TranscriptMessage[];
  sessionNumber: number;
  sessionDuration: number;
  isConnected: boolean;
  isConnecting: boolean;
  provider: VoiceProvider;
}

export function useVoice(options: UseVoiceOptions): VoiceHookReturn {
  const geminiHook = useGeminiVoice({ ...hookOptions, existingProfile });
  const grokHook = useGrokVoice({ ...hookOptions, voice: grokVoice, existingProfile });

  const activeHook = provider === 'grok' ? grokHook : geminiHook;
  return { ...activeHook, provider };
}
```

### useGeminiVoice - Gemini Live API Integration

**Location:** `src/hooks/useGeminiVoice.ts` (1,117 lines)

**This is the most complex file in the codebase.**

**Key Features:**
- Direct WebSocket to `wss://generativelanguage.googleapis.com/ws/...`
- Audio streaming: 16kHz PCM input, 24kHz output
- Luna's system prompt (456 lines in French)
- Web Speech API for user transcription
- Barge-in detection (interrupt AI)
- Automatic reconnection (up to 3 attempts)
- Batch message saving every 30 seconds
- Keepalive pings every 30 seconds
- Session duration tracking

**Connection Flow:**
```
1. connect() called
2. Create session in database
3. Load previous context (if returning user)
4. Open WebSocket to Gemini
5. Send setup message with system prompt
6. Wait for setupComplete
7. Start microphone capture
8. Start Web Speech API
9. Send kickoff message to Luna
10. Begin conversation loop
```

**Luna's Psychology Dimensions (from system prompt):**
1. Identité & Concept de soi
2. Tempérament & Réactivité émotionnelle
3. Régulation émotionnelle & Coping
4. Style cognitif & Patterns de pensée
5. Motivation & Architecture des objectifs
6. Structure des traits de personnalité
7. Style interpersonnel & Attachement
8. Cognition sociale & Vision du monde
9. Patterns comportementaux & Auto-gestion
10. Forces, vertus & Facteurs protecteurs
11. Vulnérabilités & Signaux d'alerte
12. Facteurs développementaux & Contextuels

### useGrokVoice - Grok API Integration

**Location:** `src/hooks/useGrokVoice.ts`

Similar structure to Gemini but:
- Uses xAI's WebSocket endpoint
- 5 selectable voices: Ara, Eve, Sal, Rex, Leo
- Different system prompt (calmer Luna persona)
- Token-based authentication via edge function

### AuthContext - Authentication State

**Location:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

---

## 6. Voice Integration

### Audio Pipeline

```
User's Voice                    AI's Voice
     │                              │
     ▼                              ▼
MicrophoneCapture            AudioPlaybackQueue
     │                              │
     ▼                              ▼
16kHz PCM ──────────────────► 24kHz PCM
     │                              │
     ▼                              ▼
Base64 encode               Base64 decode
     │                              │
     ▼                              ▼
WebSocket send ◄───────────► WebSocket receive
     │                              │
     └──────────► API ◄─────────────┘
```

### audioUtils.ts Classes

**Location:** `src/lib/audioUtils.ts`

```typescript
// Captures microphone at 16kHz
class MicrophoneCapture {
  constructor(sampleRate?: number);
  start(onAudioData: (base64: string) => void, onLevel: (level: number) => void): Promise<void>;
  stop(): void;
}

// Plays AI responses smoothly
class AudioPlaybackQueue {
  constructor(sampleRate: number);
  addPcmData(base64: string): void;
  clear(): void;  // For barge-in
  resume(): Promise<void>;
  close(): void;
  getIsPlaying(): boolean;
  setOnPlaybackEnd(callback: () => void): void;
}
```

### WebSocket Message Formats

**Gemini Setup Message:**
```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-latest",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": { "prebuiltVoiceConfig": { "voiceName": "Aoede" } },
        "languageCode": "fr-FR"
      }
    },
    "realtimeInputConfig": {
      "automaticActivityDetection": {
        "startOfSpeechSensitivity": "START_SENSITIVITY_HIGH",
        "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH"
      }
    },
    "inputAudioTranscription": {},
    "outputAudioTranscription": {},
    "systemInstruction": { "parts": [{ "text": "..." }] }
  }
}
```

**Audio Input:**
```json
{
  "realtimeInput": {
    "mediaChunks": [{
      "mimeType": "audio/pcm",
      "data": "<base64 encoded PCM>"
    }]
  }
}
```

---

## 7. Database Schema

### Tables

**users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE,
  name TEXT
);
```

**sessions**
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  session_number INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('active', 'completed', 'abandoned')),
  -- Cost tracking (added 2025-01-28)
  duration_seconds INTEGER,
  provider TEXT CHECK (provider IN ('gemini', 'grok')),
  estimated_cost_usd NUMERIC(10, 6),
  estimated_input_tokens INTEGER,
  estimated_output_tokens INTEGER
);
```

**messages**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL
);
```

**user_profiles**
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile JSONB NOT NULL,  -- Full psychological profile
  session_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**context_summaries**
```sql
CREATE TABLE context_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  topics_covered TEXT[],
  key_revelations TEXT[],
  emotional_moments TEXT[],
  summary_for_context TEXT,
  topics_to_explore TEXT[]
);
```

### Profile JSONB Structure

```typescript
interface Profile {
  basicInfo: {
    name: string;
    ageRange: string;
    location: string;
    occupation: string;
  };
  identityAndSelfConcept: {
    coreValues: string[];
    selfEsteem: { level: string; confidence: string; };
    // ...
  };
  temperament: { /* ... */ };
  emotionalRegulation: { /* ... */ };
  cognitiveStyle: { /* ... */ };
  motivationAndGoals: { /* ... */ };
  personalityTraits: {
    bigFive: {
      openness: { score: number; confidence: string; };
      conscientiousness: { score: number; confidence: string; };
      extraversion: { score: number; confidence: string; };
      agreeableness: { score: number; confidence: string; };
      neuroticism: { score: number; confidence: string; };
    };
  };
  interpersonalStyle: {
    attachmentPattern: string;
    communicationStyle: string;
    // ...
  };
  relationshipProfile: {
    loveLanguages: string[];
    dealBreakers: string[];
    idealPartnerQualities: string[];
  };
  conversationJournal: {
    sessions: Array<{
      sessionNumber: number;
      date: string;
      topicsDiscussed: string[];
      keyMoments: string[];
      emotionalTone: string;
      briefSummary: string;
    }>;
    cumulativeNarrative: string;
    recurringThemes: string[];
    progressionNotes: string;
  };
  overallSummary: string;
  keyInsights: string[];
  matchingKeywords: string[];
  dimensionsCovered: string[];
  dimensionsToExplore: string[];
}
```

---

## 8. Supabase Edge Functions

### analyze-profile

**Location:** `supabase/functions/analyze-profile/index.ts`

**Purpose:** Analyzes conversation transcript and generates/merges psychological profile

**Input:**
```typescript
{
  transcript: Array<{ role: 'user' | 'agent', content: string }>,
  existingProfile?: Profile,  // For merging
  sessionCount?: number
}
```

**Output:**
```typescript
{
  profile: Profile
}
```

**How it works:**
1. Receives transcript from frontend
2. If existingProfile provided, adds merging instructions
3. Calls Gemini 2.5 Pro via Lovable AI Gateway
4. Uses function calling with structured schema
5. Returns merged/new profile

### generate-summary

**Location:** `supabase/functions/generate-summary/index.ts`

**Purpose:** Generates context summary for next session

Called automatically when session ends.

### grok-token

**Location:** `supabase/functions/grok-token/index.ts`

**Purpose:** Provides ephemeral authentication tokens for xAI Grok API

---

## 9. Styling & Theming

### Tailwind Configuration

**Location:** `tailwind.config.ts`

**Custom Colors (CSS Variables):**
```css
--background, --foreground
--primary, --primary-foreground
--secondary, --secondary-foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground
--border, --input, --ring
--card, --card-foreground
--popover, --popover-foreground
```

**Custom Utilities:**
```css
.bg-warm-gradient    /* Background gradient */
.shadow-glow         /* Glow effect */
.shadow-warm         /* Warm shadow */
.animate-breathe     /* Breathing animation */
```

### Global Styles

**Location:** `src/index.css`

Contains CSS variable definitions for light/dark modes and base styles.

---

## 10. Dependencies

### Core Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3.1 | UI framework |
| react-dom | 18.3.1 | DOM rendering |
| react-router-dom | 6.30.1 | Routing |
| typescript | 5.8.3 | Type safety |
| vite | 5.4.19 | Build tool |

### State Management

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | 5.83.0 | Server state |
| @supabase/supabase-js | 2.91.1 | Backend client |

### UI Components

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/* | Various | Primitive components |
| tailwindcss | 3.4.17 | Utility CSS |
| framer-motion | 12.29.2 | Animations |
| lucide-react | 0.462.0 | Icons |
| sonner | 1.7.4 | Toasts |

### Forms

| Package | Version | Purpose |
|---------|---------|---------|
| react-hook-form | 7.61.1 | Form handling |
| zod | 3.25.76 | Validation |

### Full list in `package.json`

---

## 11. Configuration Files

### .env

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_GOOGLE_AI_API_KEY=AIzaSy...
VITE_XAI_API_KEY=xai-...
VITE_VOICE_PROVIDER=gemini  # or 'grok'
```

### vite.config.ts

```typescript
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false }
  },
  plugins: [
    react(),
    componentTagger()  // Lovable IDE integration
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": false,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 12. React Native Migration Guide

### Overview

The app is designed for migration to React Native using **Expo** for cross-platform mobile deployment.

### Components to Rewrite

| Web Component | React Native Equivalent |
|---------------|------------------------|
| `div` | `View` |
| `span`, `p` | `Text` |
| `button` | `TouchableOpacity` / `Pressable` |
| `input` | `TextInput` |
| CSS classes | StyleSheet / NativeWind |
| Framer Motion | `react-native-reanimated` |
| Web Audio API | `expo-av` |
| Web Speech API | `@react-native-voice/voice` |
| localStorage | `@react-native-async-storage/async-storage` |

### What Can Be Reused (No Changes)

1. **All Supabase Edge Functions** - Backend stays the same
2. **Database Schema** - No changes needed
3. **API Integration Logic** - WebSocket code needs minor adjustments
4. **TypeScript Interfaces** - All type definitions
5. **Cost Estimation Logic** - Pure TypeScript
6. **Session Service** - Just swap Supabase client import

### Migration Steps

#### Step 1: Initialize Expo Project
```bash
npx create-expo-app echo-mobile --template expo-template-blank-typescript
cd echo-mobile
```

#### Step 2: Install Dependencies
```bash
# Core
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage

# UI
npm install nativewind tailwindcss react-native-reanimated
npx expo install react-native-gesture-handler

# Audio
npx expo install expo-av

# Voice (if needed for transcription)
npm install @react-native-voice/voice

# Navigation
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
```

#### Step 3: File Structure
```
echo-mobile/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Welcome
│   │   ├── chat.tsx           # VoiceChat
│   │   └── profile.tsx        # ProfileReport
│   └── _layout.tsx            # Root layout
├── components/
│   ├── VoiceOrb.tsx           # Rewrite with Reanimated
│   ├── AuthScreen.tsx         # Rewrite UI
│   └── ...
├── hooks/
│   ├── useVoice.ts            # Keep, adjust audio
│   ├── useGeminiVoice.ts      # Keep, adjust audio classes
│   └── useGrokVoice.ts        # Keep, adjust audio classes
├── lib/
│   ├── audioUtils.ts          # REWRITE for expo-av
│   ├── sessionService.ts      # Keep, change import
│   └── costEstimation.ts      # Keep as-is
└── contexts/
    └── AuthContext.tsx        # Keep, minor adjustments
```

#### Step 4: Audio Rewrite (Critical)

Replace `audioUtils.ts` with expo-av implementation:

```typescript
import { Audio } from 'expo-av';

class MicrophoneCapture {
  private recording: Audio.Recording | null = null;

  async start(onAudioData: (base64: string) => void) {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    this.recording = new Audio.Recording();
    await this.recording.prepareToRecordAsync({
      android: { /* config */ },
      ios: { /* config */ },
    });
    await this.recording.startAsync();

    // Implement streaming...
  }

  async stop() {
    await this.recording?.stopAndUnloadAsync();
  }
}

class AudioPlaybackQueue {
  private sound: Audio.Sound | null = null;

  async addPcmData(base64: string) {
    // Convert and play...
  }
}
```

#### Step 5: UI Migration

Use NativeWind for Tailwind-like styling:

```typescript
// Before (Web)
<div className="flex items-center gap-2 p-4 rounded-lg bg-card">
  <span className="text-lg font-bold">Hello</span>
</div>

// After (React Native + NativeWind)
<View className="flex-row items-center gap-2 p-4 rounded-lg bg-card">
  <Text className="text-lg font-bold">Hello</Text>
</View>
```

#### Step 6: Testing on Device

```bash
# Start Expo dev server
npx expo start

# On iPhone: Scan QR with Camera app
# On Android: Scan QR with Expo Go app
```

### Key Considerations

1. **Microphone Access** - Works differently on iOS/Android
2. **Background Audio** - Needs special handling for long sessions
3. **WebSocket Keep-Alive** - May need adjustment for mobile networks
4. **Offline Support** - Consider caching for poor connectivity
5. **Push Notifications** - For session reminders (future feature)

---

## 13. Key Files Reference

### Most Important Files (Read These First)

| File | Lines | Description |
|------|-------|-------------|
| `src/hooks/useGeminiVoice.ts` | 1,117 | Core voice integration with Gemini |
| `src/components/VoiceChat.tsx` | ~300 | Main voice UI component |
| `src/lib/sessionService.ts` | 313 | All database operations |
| `src/lib/audioUtils.ts` | 312 | Audio capture and playback |
| `src/pages/Index.tsx` | 160 | Application state machine |
| `supabase/functions/analyze-profile/index.ts` | 509 | Profile generation |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env` | API keys and URLs |
| `tailwind.config.ts` | Theme and colors |
| `vite.config.ts` | Build configuration |
| `tsconfig.json` | TypeScript settings |
| `supabase/config.toml` | Supabase project config |

### Database Migrations

| File | Purpose |
|------|---------|
| `20250127_create_sessions.sql` | Core tables |
| `20250128_add_rls_policies.sql` | Security policies |
| `20250129_create_user_profiles.sql` | Profile storage |
| `20250130_add_session_cost_tracking.sql` | Cost columns |

---

## Quick Start for New Developers

1. **Clone and install:**
   ```bash
   git clone <repo>
   cd my-half-compass
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Fill in API keys
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Run Supabase locally (optional):**
   ```bash
   supabase start
   supabase db push
   ```

5. **Deploy edge functions:**
   ```bash
   supabase functions deploy analyze-profile
   supabase functions deploy generate-summary
   ```

---

## Contact & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Google AI Studio:** https://aistudio.google.com
- **xAI Console:** https://console.x.ai
- **Expo Documentation:** https://docs.expo.dev

---

*Document generated January 2025*
