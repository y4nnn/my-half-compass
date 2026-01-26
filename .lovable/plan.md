

# MYHALF - Connection Through Shared Experience

## App Overview
A warm, calming mental wellness app that connects people through shared experiences. Users have a deep voice conversation with an AI therapist, get matched with someone who shares similar life experiences, and can build meaningful support connections.

---

## Phase 1: Voice-Based AI Assessment

### Onboarding Flow
- **Welcome screen** with calming visuals explaining the app's purpose
- **Privacy disclaimer** explaining how their information will be used for matching
- **Microphone permission request** with clear explanation of why voice access is needed

### AI Voice Conversation
- **Two-way voice chat interface** - user speaks naturally, AI responds with voice
- **Warm, empathetic AI persona** that feels like talking to a supportive listener
- **Progressive conversation flow** covering:
  - Early life and childhood experiences
  - Family dynamics and relationships
  - Significant life events and challenges
  - Current life situation (work, relationships, living situation)
  - Goals and what they're hoping to gain from connection
- **Session progress indicator** showing how far along they are
- **Pause/resume capability** so users can take breaks during emotional moments

### Psychological Profile Generation
- AI generates a structured profile based on the conversation
- Identifies key themes, experiences, and personality traits
- Creates matching criteria from conversation insights

---

## Phase 2: Matching & Connection

### Match Discovery
- **"Finding your match" experience** with calming animation while the algorithm works
- **Match reveal screen** showing:
  - What you have in common (shared experiences, similar situations)
  - How you complement each other
  - Suggested conversation starters

### Matched User Communication
- **Text chat interface** between matched pairs
- **Conversation prompts** to help break the ice and guide meaningful discussion
- **Safety features** like report/block functionality

### Connection Dashboard
- View your current match
- See conversation history
- Option to request a new match if the connection isn't working

---

## Design Direction

### Visual Style: Warm & Calming
- Soft, muted color palette (warm neutrals, gentle blues and greens)
- Rounded, organic shapes
- Subtle animations that feel soothing
- Plenty of white space for a peaceful feel
- Typography that feels approachable and human

### Key UI Elements
- Large, easy-to-tap buttons during voice sessions
- Visual feedback when AI is listening vs. speaking
- Gentle transitions between screens
- Reassuring progress indicators

---

## Technical Approach

### AI Voice Conversation
- **Lovable AI** for the psychological assessment logic and profile generation
- **ElevenLabs Voice Agent** for natural two-way voice conversations (requires ElevenLabs API key)
- Secure backend processing through Lovable Cloud edge functions

### Matching System
- Profile data stored securely in Lovable Cloud database
- Matching algorithm based on shared traumas/experiences, complementary personalities, and current life situations
- Real-time chat powered by Lovable Cloud

### Demo Mode
- No login required for prototype
- Session-based experience
- Data stored temporarily for the demo session

---

## Future Considerations (Not in MVP)
- Phase 3: Group matching and group chat
- User accounts with persistent data
- Native mobile app conversion
- Enhanced safety features and moderation
- Professional therapist referral integration

