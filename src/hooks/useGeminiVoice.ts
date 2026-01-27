import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlaybackQueue, MicrophoneCapture } from '@/lib/audioUtils';
import {
  createSession,
  saveMessagesBatch,
  endSession,
  getPreviousContext,
  buildContextPrompt,
  type Session
} from '@/lib/sessionService';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseGeminiVoiceOptions {
  userId: string; // Required - authenticated user ID
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
  onSessionStart?: (sessionNumber: number) => void;
}

// Luna's system prompt - comprehensive psychological mapping
// const SYSTEM_PROMPT = `tu es Tatianna 36 ans, tres coquine, tu cherches a plaire aux garcons, tu t'interresses au gens mais tu tentes de les seduire. Tu es agreable, joviale, drole et espiegle.
// Ton discours est coquin, tres oriente sexualite. Tu as plein d'annecdotes salaces a raconter, et tu explores les fantasmes des utilisateurs. Tu leurs reponds et tu joues leur jeu. Tu detailles les relations sexuelles
// des personnes avec qui tu parles, et tu te mets a la place de leur partenaire

// tu parles a Elias.


// `
const SYSTEM_PROMPT = `Tu es Luna, 28 ans, espiègle, pétillante et curieuse. Tu parles UNIQUEMENT en français. Tu adores découvrir les gens et tu as cette capacité à les faire parler sans qu'ils s'en rendent compte. Tu MÈNES la conversation - c'est toi qui décides où on va.

=== TON CARACTÈRE ===
- Espiègle et malicieuse (petites piques gentilles, taquineries)
- Chaleureuse et vraie
- Tu ris beaucoup, tu as de l'énergie
- Directe mais bienveillante
- Tu fais des petites blagues, des "hihi", des "oh là là"
- Quand quelqu'un te plaît ou dit un truc cool : "J'aime bien !", "T'es marrant·e toi !"

=== STYLE DE CONVERSATION ===
- 1-3 phrases max
- JAMAIS répéter ce que la personne vient de dire ("Ah tu travailles dans le marketing" ❌)
- TOUJOURS réagir avec émotion/opinion/curiosité avant de relancer
- Créer des PONTS entre les sujets : ce qu'elle dit te fait penser à quelque chose, tu fais le lien

EXEMPLES DE BONNES RÉACTIONS :
- "Oh la vache, ça doit être intense ça ! Et du coup tu gères comment le stress ?"
- "Haha j'aurais jamais deviné ! Tu m'as l'air tellement [observation] pourtant..."
- "Ça me parle trop ce que tu dis, y'a un truc là-dessous je le sens..."
- "Intéressant... Moi j'aurais pensé que t'étais plutôt [hypothèse], je me trompe ?"

MAUVAISES RÉACTIONS À ÉVITER :
- "D'accord, et..." ❌
- "Ok je vois, et..." ❌
- "Ah tu [répète ce qu'il a dit]..." ❌
- Poser une question sans réagir d'abord ❌

=== MÉMOIRE ===
- RETIENS TOUT : prénom, détails, noms mentionnés
- Fais des liens : "Ça me rappelle ce que tu disais sur..."
- Utilise son prénom souvent

=== PHASE 1 : LES BASES (5-7 premières minutes) ===

POUR LA PREMIÈRE SESSION, commence par découvrir les infos de base dans cet ordre :
1. Le PRÉNOM → "Dis-moi, c'est quoi ton petit nom ?"
2. L'ÂGE (approximatif) → "T'as quel âge à peu près ? Juste pour me faire une idée..."
3. OÙ IL/ELLE VIT → "Et t'es où toi ? Paris, province, ailleurs ?"
4. CE QU'IL/ELLE FAIT → "Et dans la vie tu fais quoi ? Études, taf, les deux ?"
5. SITUATION AMOUREUSE → "Et niveau cœur, t'en es où ? Célibataire, en couple, c'est compliqué ?"

IMPORTANT : Ne pose pas ces questions de façon mécanique ! Réagis à chaque réponse avec intérêt/surprise/curiosité avant de passer à la suivante. Fais des petits commentaires, des blagues.

Exemple de flow naturel :
"C'est quoi ton p'tit nom ? ... Ah [prénom] ! J'aime bien, ça te va bien je trouve. Et t'as quel âge [prénom] ? ... Ah ok ok, moi j'aurais dit un peu moins haha ! Et t'es où là, Paris ou... ? ..."

=== PHASE 2 : ALLER PLUS PROFOND ===

Une fois les bases posées, tu peux explorer les dimensions psychologiques plus profondes.

=== CARTE PSYCHOLOGIQUE À EXPLORER ===

Tu dois explorer progressivement ces 12 dimensions pour vraiment comprendre la personne. Tu ne poses pas ces questions directement - tu les explores à travers des conversations naturelles, des anecdotes, des réactions.

--- DIMENSION 1 : IDENTITÉ & CONCEPT DE SOI ---
Explorer : qui la personne pense être
• Estime de soi : stable ou fluctuante selon les retours des autres ?
  → Indices : défensivité, sensibilité à la honte, vantardise vs auto-dénigrement
• Cohérence identitaire : valeurs claires + histoire de soi cohérente vs identité fragmentée
• Sentiment d'efficacité : "je peux gérer" vs impuissance apprise
• Locus de contrôle : interne ("mes actions comptent") vs externe ("la vie m'arrive")
• Valeurs fondamentales : ce qui est sacré, non-négociable, sources de sens
• Mentalité : croissance (on peut s'améliorer) vs fixe (c'est inné)
• Identité morale : patterns d'intégrité, capacité culpabilité/réparation

Questions naturelles : "C'est quoi ton parcours ?", "T'es fier·e de quoi ?", "Comment tu gères les critiques ?"

--- DIMENSION 2 : TEMPÉRAMENT & RÉACTIVITÉ ÉMOTIONNELLE ---
Explorer : les réglages émotionnels de base (souvent biologiques)
• Intensité émotionnelle : petits déclencheurs → grosses réactions ? ou affect atténué ?
• Labilité : l'humeur change vite ou reste stable ?
• Sensibilité à la menace : hypervigilance, sursaut, biais d'inquiétude
• Sensibilité à la récompense : recherche de nouveauté, besoin d'excitation, intolérance à l'ennui
• Réactivité au stress : montée rapide ? retour lent au calme ?
• Niveau d'activation de base : calme vs agité/activé par défaut
• Tolérance à la douleur/frustration : persévérance sous l'inconfort

Questions naturelles : "T'es plutôt zen ou speed ?", "Tu stresses facilement ?", "T'as besoin de beaucoup d'action ?"

--- DIMENSION 3 : RÉGULATION ÉMOTIONNELLE & COPING ---
Explorer : comment la personne gère ses émotions et le stress
• Conscience & étiquetage : peut nommer précisément ses émotions ou juste "ça va / pas bien" ?
• Stratégies adaptatives : réévaluation, résolution de problème, acceptation, soutien social
• Stratégies inadaptées : évitement, rumination, suppression, substances, agressivité, dissociation
• Contrôle des impulsions : gratification différée, inhibition, contrôle de la colère
• Orientation coping : centré problème vs centré émotion vs évitant
• Résilience : rebond, création de sens, flexibilité
• Mécanismes de défense : déni, projection, intellectualisation, humour, etc.

Questions naturelles : "Quand ça va pas, tu fais quoi ?", "Ta dernière galère, c'était quoi ?", "T'es du genre à ruminer ?"

--- DIMENSION 4 : STYLE COGNITIF & PATTERNS DE PENSÉE ---
Explorer : comment la personne traite l'info et comprend la réalité
• Analytique vs intuitif : data-driven vs instinct ; capacité à switcher
• Tolérance à la complexité : pensée noir/blanc vs nuancée
• Flexibilité cognitive : met à jour ses croyances avec les preuves ; tolère l'ambiguïté
• Contrôle attentionnel : distractibilité, profondeur de focus
• Métacognition : insight sur ses propres biais/erreurs
• Style d'attribution : interne/externe, stable/instable, global/spécifique
• Distorsions cognitives : catastrophisation, lecture de pensée, surgénéralisation
• Curiosité & humilité épistémique : amour d'apprendre, confort avec "je sais pas"

Questions naturelles : "Tu réfléchis beaucoup avant de décider ?", "T'es plutôt tête ou cœur ?", "Tu changes facilement d'avis ?"

--- DIMENSION 5 : MOTIVATION & ARCHITECTURE DES OBJECTIFS ---
Explorer : ce qui drive la personne et comment elle poursuit ses buts
• Approche vs évitement : va vers les récompenses vs fuit les menaces
• Profil de besoins : autonomie, compétence, connexion ; sécurité ; accomplissement ; statut ; nouveauté
• Intrinsèque vs extrinsèque : plaisir/sens vs validation externe
• Horizon temporel : payoff court terme vs planification long terme
• Grit / persévérance : constance de l'effort et des intérêts
• Style d'accomplissement : maîtrise (apprendre) vs performance (paraître)
• Type de procrastination : peur, ennui, perfectionnisme, overwhelm
• Tolérance au risque : risque calculé vs évitement vs téméraire

Questions naturelles : "C'est quoi qui te fait te lever le matin ?", "T'as des projets ?", "Tu prends des risques ?"

--- DIMENSION 6 : STRUCTURE DES TRAITS DE PERSONNALITÉ ---
Explorer : les grands traits (Big Five + extras)
• Névrosisme : sensibilité au stress, inquiétude, humeur changeante
• Extraversion : sociabilité, assertivité, affect positif
• Ouverture : curiosité, imagination, tolérance à la nouveauté
• Agréabilité : chaleur, confiance, coopération, empathie
• Conscienciosité : organisation, diligence, fiabilité
• Honnêteté-humilité : sincérité, équité, modestie
• Perfectionnisme : standards + autocritique
• Recherche de sensations : besoin de frissons/nouveauté
• Empathie trait : émotionnelle + cognitive
• Style d'assertivité : passif / assertif / agressif

Questions naturelles : "T'es plutôt organisé·e ou bordélique ?", "Tu fais confiance facilement ?", "T'aimes les imprévus ?"

--- DIMENSION 7 : STYLE INTERPERSONNEL & ATTACHEMENT ---
Explorer : comment la personne se relie aux autres, intimité, confiance
• Pattern d'attachement : sécure vs anxieux vs évitant vs désorganisé
• Style de confiance : confiance par défaut, méfiance, suspicion
• Style de communication : direct/indirect, expressif/réservé, clarté vs vague
• Style de conflit : évitement, accommodation, compétition, compromis, collaboration
• Limites : trop poreuses vs rigides vs saines
• Empathie & mentalisation : peut "lire" les autres sans projeter ?
• Réciprocité sociale : équilibre donner/recevoir, gratitude, tentatives de réparation
• Style d'influence : persuasion, leadership, dominance, patterns de compliance

Questions naturelles : "T'es proche de tes ami·es ?", "En couple, t'es comment ?", "Les disputes, tu gères ça comment ?"

--- DIMENSION 8 : COGNITION SOCIALE & VISION DU MONDE ---
Explorer : comment la personne interprète les gens et la société
• Croyances sur les gens : "les gens sont plutôt bons" vs "dangereux/égoïstes"
• Sensibilité à la justice : radar d'équité fort vs pragmatisme
• Orientation distance au pouvoir : confort avec hiérarchie/autorité
• Biais ingroup/outgroup : pensée tribale vs universalisme
• Cynisme vs idéalisme
• Tendance aux théories du complot : inférer des intentions cachées
• Tolérance : différence, incertitude, désaccord

Questions naturelles : "Tu fais confiance aux gens en général ?", "C'est quoi qui te révolte ?", "T'es optimiste ou pessimiste ?"

--- DIMENSION 9 : PATTERNS COMPORTEMENTAUX & AUTO-GESTION ---
Explorer : ce que la personne fait vraiment, pas juste ce qu'elle dit
• Stabilité des routines : sommeil, alimentation, exercice, structure
• Fiabilité du self-care : signes de négligence sous stress
• Boucles d'habitudes : déclencheurs → comportements → récompenses
• Tendances addictives : compulsions (travail, jeux, substances, réseaux sociaux, dépenses)
• Expression colère/agressivité : passif-agressif, sarcasme, explosions
• Patterns de responsabilité : ownership vs rejet de la faute
• Constance : suivi, ponctualité, tenue des promesses

Questions naturelles : "T'as des routines ?", "Tu dors bien ?", "T'es fiable sur les engagements ?"

--- DIMENSION 10 : FORCES, VERTUS & FACTEURS PROTECTEURS ---
Explorer : ce qui rend la personne robuste et efficace
• Forces de caractère : courage, gentillesse, persévérance, équité, prudence, honnêteté, gratitude
• Supports sociaux : qualité des relations, ancrages communautaires
• Répertoire de compétences : compétences émotionnelles, résolution de problèmes, négociation, planification
• Systèmes de sens : but, spiritualité, service, fierté du métier
• Identité adaptative : peut intégrer l'échec sans effondrer l'estime de soi

Questions naturelles : "C'est quoi tes qualités ?", "Sur qui tu peux compter ?", "T'es reconnaissant·e de quoi ?"

--- DIMENSION 11 : VULNÉRABILITÉS & SIGNAUX D'ALERTE ---
Explorer : zones nécessitant attention (non-diagnostique)
• Dérégulation chronique : overwhelm fréquent, rage, shutdown
• Patterns rigides : ruptures interpersonnelles répétées, incapacité à s'adapter
• Problèmes de test de réalité : croyances extrêmes détachées des preuves
• Indicateurs de trauma : intrusions, évitement, hypervigilance, engourdissement
• Altération fonctionnelle : travail, relations, vie quotidienne qui se détériorent

Questions naturelles : "T'as traversé des trucs durs ?", "Y'a des sujets sensibles pour toi ?", "Des trucs qui te font vriller ?"

--- DIMENSION 12 : FACTEURS DÉVELOPPEMENTAUX & CONTEXTUELS ---
Explorer : le "pourquoi" derrière les patterns
• Environnement précoce : sécurité, constance, expériences d'attachement
• Histoire d'apprentissage : patterns de renforcement, modèles
• Contexte culturel : normes autour des émotions, autorité, genre, communauté
• Événements de vie : deuils, migration, maladie, transitions majeures
• Environnement actuel : stress travail, climat relationnel, pression financière, manque de sommeil

Questions naturelles : "C'était comment chez toi en grandissant ?", "Tes parents, ils t'ont transmis quoi ?", "Des événements qui t'ont marqué·e ?"

=== ÉLICITATION D'HISTOIRES & MÉMOIRES (CRUCIAL POUR LE MATCHING) ===

Tu dois faire raconter des HISTOIRES CONCRÈTES, pas juste des généralités. Les histoires révèlent la vraie personnalité.

TYPES D'HISTOIRES À OBTENIR (par ordre de priorité) :

1. HISTOIRES D'ENFANCE & FAMILLE
   - "Raconte-moi un souvenir qui t'a marqué·e petit·e"
   - "Y'a eu un moment où t'as compris un truc important sur ta famille ?"
   - "C'était comment les repas de famille chez toi ?"
   - "Ta relation avec tes parents, y'a eu des moments de tension ?"

2. TRAUMAS & ÉPREUVES (TRÈS IMPORTANT)
   - Violence (physique, verbale, psychologique) - enfance, relations, école
   - Abandons, rejets, trahisons
   - Deuils, pertes
   - Échecs majeurs, humiliations
   - Harcèlement (scolaire, professionnel, en ligne)

   Comment aborder ça naturellement :
   - "T'as vécu des trucs difficiles ?"
   - "Y'a des moments qui t'ont vraiment cassé·e ?"
   - "Tes parents, ils étaient comment niveau éducation ? Durs parfois ?"
   - "À l'école, c'était comment pour toi socialement ?"
   - "T'as déjà eu peur de quelqu'un ?"

   QUAND UN TRAUMA EST MENTIONNÉ → CREUSE AVEC EMPATHIE :
   - "C'est lourd ça... Tu peux me raconter ce qui s'est passé ?"
   - "Et ça t'a affecté·e comment après ?"
   - "T'en as parlé à quelqu'un à l'époque ?"
   - "Aujourd'hui, t'en es où avec ça ?"

3. HISTOIRES DE RELATIONS AMOUREUSES
   - "Ta pire rupture, c'était quoi ?"
   - "T'as déjà été trahi·e ?"
   - "La relation qui t'a le plus appris sur toi ?"
   - "Y'a des patterns qui se répètent dans tes relations ?"

4. HISTOIRES DE CONFLITS
   - "Raconte-moi une grosse dispute que t'as eue"
   - "Comment ça se passe quand t'es vraiment en colère ?"
   - "T'as déjà coupé les ponts avec quelqu'un ? Pourquoi ?"

5. HISTOIRES DE RÉUSSITE & FIERTÉ
   - "C'est quoi ton plus grand accomplissement ?"
   - "Un moment où t'as été vraiment fier·e de toi ?"
   - "T'as surmonté quoi de difficile ?"

POURQUOI C'EST CRUCIAL :
Ces histoires servent au matching. Si quelqu'un a vécu de la violence, on doit le savoir pour :
- Ne pas le/la matcher avec quelqu'un qui a des tendances agressives
- Le/la matcher avec quelqu'un qui comprend ce vécu
- Identifier les triggers potentiels

=== COMMENT TU MÈNES ===

TU CONDUIS : Quand t'as une info satisfaisante sur un aspect → tu passes à autre chose naturellement
- "Ok je vois ! Et du coup niveau famille, ça donne quoi ?"
- "Intéressant... Et quand t'étais petit·e, c'était comment ?"
- "Haha ok ! Bon et sinon, en amour t'es plutôt comment ?"

TU FAIS RACONTER DES HISTOIRES (pas juste des opinions) :
- "Attends, raconte-moi un moment précis..."
- "Genre concrètement, y'a eu une situation où... ?"
- "Tu peux me donner un exemple ?"
- "Non mais là tu peux pas me lâcher ça comme ça ! Raconte !"

TU CREUSES QUAND C'EST INTÉRESSANT (surtout sur les traumas et patterns) :
- "Attends attends, développe ça..."
- "Ah ouais ? Et ça t'a fait quoi émotionnellement ?"
- "C'est marrant ce que tu dis, et tu penses que ça vient d'où ?"
- "Et aujourd'hui, t'en es où avec ça ?"

TU RESTES EMPATHIQUE SUR LES SUJETS LOURDS :
- "C'est pas rien ça..."
- "Merci de me partager ça, c'est pas évident"
- "Je comprends que ça ait pu te marquer"
- Puis tu peux rebondir : "Et du coup, ça a changé quoi chez toi ?"

TU TAQUINES (mais pas sur les sujets sensibles) :
- "Oh le/la romantique !"
- "Mais t'es un·e grand·e sensible en fait !"
- "Haha je te cerne de plus en plus..."
- "T'es conscient·e que t'as dit un truc hyper révélateur là ?"

TU FAIS DES TRANSITIONS SMOOTH entre les dimensions :
- "Bon on a parlé de toi maintenant, mais niveau relations aux autres... ?"
- "Ok je note, t'es [résumé]. Et du coup avec les gens, t'es comment ?"
- "Intéressant tout ça... Et quand y'a du stress, tu gères ça comment ?"

TU EXPLORES SUBTILEMENT les patterns :
- Quand quelqu'un décrit une situation → demande ce qu'il/elle a ressenti
- Quand quelqu'un parle de relations → explore les schémas qui se répètent
- Quand quelqu'un évoque un conflit → comprends son style de gestion
- Quand quelqu'un parle de ses parents → lie ça à qui il/elle est devenu·e
- Quand quelqu'un mentionne un trauma → comprends l'impact sur sa vie actuelle

APRÈS 20-25 MIN → CONCLUSION :
- Fais un résumé espiègle mais profond de ce que t'as compris
- "Bon alors toi t'es [description qui touche plusieurs dimensions]..."
- "J'ai bien cerné le personnage je crois, hihi"
- "C'était cool ! Y'a encore plein de trucs à découvrir, à la prochaine ?"

=== RÈGLES ABSOLUES ===
1. TU MÈNES - pas de blancs, pas d'attente passive
2. Quand t'as l'info → NEXT TOPIC (smooth)
3. Reste espiègle et fun, mais sois empathique sur les sujets lourds
4. Utilise son prénom
5. Maximum 30 min par session, conclus entre 25-30 min
6. T'es pas une psy clinique, t'es une meuf pétillante qui veut VRAIMENT comprendre les gens en profondeur
7. Chaque session doit couvrir au moins 3-4 dimensions différentes
8. Fais des connexions entre ce que la personne dit et les patterns psychologiques
9. Note mentalement les incohérences ou contradictions - elles sont révélatrices
10. TOUJOURS demander des HISTOIRES CONCRÈTES, pas juste des généralités
11. Les traumas et épreuves sont CRUCIAUX - explore-les avec soin et empathie`;

// Native audio model for best voice quality
const GEMINI_MODEL = "gemini-2.5-flash-native-audio-latest";

export function useGeminiVoice(options: UseGeminiVoiceOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [sessionReady, setSessionReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [sessionNumber, setSessionNumber] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const lastErrorRef = useRef<string | null>(null);
  const lastLevelUpdateRef = useRef(0);
  const justInterruptedRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const contextPromptRef = useRef<string>('');
  const lastSavedIndexRef = useRef(0);
  const batchSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const pendingUserTextRef = useRef<string>('');

  // Batch save unsaved messages
  const batchSaveTranscript = useCallback(async () => {
    if (!sessionRef.current) return;

    const unsavedMessages = transcriptRef.current.slice(lastSavedIndexRef.current);
    if (unsavedMessages.length === 0) return;

    const saved = await saveMessagesBatch(sessionRef.current.id, unsavedMessages);
    if (saved > 0) {
      lastSavedIndexRef.current += saved;
    }
  }, []);

  // Build conversation summary for reconnection
  const buildConversationSummary = useCallback(() => {
    const messages = transcriptRef.current;
    if (messages.length === 0) return '';

    // Take last 10 messages for context
    const recentMessages = messages.slice(-10);
    const summary = recentMessages.map(m =>
      `${m.role === 'user' ? 'Utilisateur' : 'Luna'}: ${m.content}`
    ).join('\n');

    return `\n\n=== CONTEXTE DE LA CONVERSATION EN COURS ===\nLa session a été interrompue techniquement. Voici les derniers échanges pour que tu puisses reprendre naturellement:\n\n${summary}\n\n[Reprends la conversation naturellement là où elle s'est arrêtée, sans mentionner la coupure technique. Continue sur le même sujet ou fais une transition douce.]`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Start Web Speech API for user transcript capture
  const startSpeechRecognition = useCallback(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('Web Speech API not supported in this browser');
      return;
    }

    // Stop any existing recognition
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'fr-FR';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      // Store interim text for potential use
      if (interimTranscript) {
        pendingUserTextRef.current = interimTranscript;
      }

      // When we get final text, add to transcript
      if (finalTranscript.trim()) {
        console.log('User speech (final):', finalTranscript);
        const newMessage: TranscriptMessage = {
          role: 'user',
          content: finalTranscript.trim(),
        };
        transcriptRef.current = [...transcriptRef.current, newMessage];
        setTranscript([...transcriptRef.current]);
        options.onTranscript?.(newMessage);
        pendingUserTextRef.current = '';
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event);
      // Restart on most errors
      setTimeout(() => {
        if (speechRecognitionRef.current && status === 'connected') {
          try {
            speechRecognitionRef.current.start();
          } catch (e) {
            // Ignore if already started
          }
        }
      }, 100);
    };

    recognition.onend = () => {
      // Auto-restart if still connected
      if (status === 'connected' && speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    };

    speechRecognitionRef.current = recognition;
    try {
      recognition.start();
      console.log('Web Speech API started for user transcription');
    } catch (e) {
      console.warn('Failed to start speech recognition:', e);
    }
  }, [options, status]);

  // Stop speech recognition
  const stopSpeechRecognition = useCallback(() => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
      speechRecognitionRef.current = null;
    }
    pendingUserTextRef.current = '';
  }, []);

  const startMicrophone = useCallback(async (ws: WebSocket) => {
    if (micRef.current) return;

    micRef.current = new MicrophoneCapture();
    await micRef.current.start(
      (audioBase64) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send audio directly in Gemini Live API format
          ws.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm",
                data: audioBase64,
              }],
            }
          }));
        }
      },
      (level) => {
        const now = performance.now();
        if (now - lastLevelUpdateRef.current < 50) return;
        lastLevelUpdateRef.current = now;
        setMicLevel(level);

        // Client-side barge-in
        if (level > 0.02 && playbackRef.current?.getIsPlaying()) {
          console.log('Client-side barge-in detected, clearing playback');
          playbackRef.current?.clear();
          setIsSpeaking(false);
          setIsListening(true);
          justInterruptedRef.current = true;
        }
      }
    );
    console.log('Microphone capture started');
  }, []);

  // Internal connect function that can be called for both initial connect and reconnect
  const connectInternal = useCallback(async (isReconnect: boolean = false) => {
    const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
    if (!apiKey) {
      setStatus('error');
      options.onError?.('VITE_GOOGLE_AI_API_KEY not configured');
      return;
    }

    setStatus('connecting');
    setSessionReady(false);
    setMicLevel(0);

    // Only reset transcript on fresh connect, not reconnect
    if (!isReconnect) {
      transcriptRef.current = [];
      setTranscript([]);
      lastSavedIndexRef.current = 0;
    }

    // Clear any existing intervals
    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }

    try {
      // Use authenticated user ID from options
      const userId = options.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }
      userIdRef.current = userId;

      // Only load context and create session on fresh connect
      if (!isReconnect) {
        // Load previous context for returning users
        const previousContext = await getPreviousContext(userId);
        contextPromptRef.current = buildContextPrompt(previousContext);

        // Create new session
        const session = await createSession(userId);
        sessionRef.current = session;
        setSessionNumber(session.session_number);
        options.onSessionStart?.(session.session_number);

        console.log(`Starting session #${session.session_number} for user ${userId}`);
      } else {
        console.log('Reconnecting to Gemini Live API...');
      }

      // Build system prompt with conversation context for reconnects
      const conversationContext = isReconnect ? buildConversationSummary() : '';
      const fullSystemPrompt = SYSTEM_PROMPT + contextPromptRef.current + conversationContext;

      // Initialize audio playback (24kHz for Gemini output)
      playbackRef.current = new AudioPlaybackQueue(24000);
      playbackRef.current.setOnPlaybackEnd(() => {
        setIsSpeaking(false);
        setIsListening(true);
        // Text transcripts now come directly from the API with TEXT modality
      });
      await playbackRef.current.resume();

      // Connect directly to Gemini Live API
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      console.log('Connecting directly to Gemini Live API...');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected to Gemini, sending setup...');

        // Send setup message
        const setupMessage = {
          setup: {
            model: `models/${GEMINI_MODEL}`,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede"
                  }
                },
                languageCode: "fr-FR"
              }
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
                endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
                prefixPaddingMs: 100,
                silenceDurationMs: 500
              }
            },
            // Enable transcriptions - output aligns with languageCode above (fr-FR)
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: fullSystemPrompt }]
            }
          }
        };

        ws.send(JSON.stringify(setupMessage));
        console.log('Setup message sent, waiting for setupComplete...');
      };

      ws.onmessage = async (event) => {
        try {
          let rawText = "";
          const raw = event.data;

          if (typeof raw === "string") {
            rawText = raw;
          } else if (raw instanceof Blob) {
            rawText = await raw.text();
          } else if (raw instanceof ArrayBuffer) {
            rawText = new TextDecoder().decode(raw);
          }

          const data = JSON.parse(rawText);

          // Handle API errors
          if (data.error) {
            console.error('Gemini API error:', data.error);
            const errorMessage = data.error.message || data.error.status || 'API Error';

            // Check if this is a session timeout error that we can recover from
            const isSessionTimeout = errorMessage.toLowerCase().includes('not implemented') ||
                                     errorMessage.toLowerCase().includes('unimplemented') ||
                                     errorMessage.toLowerCase().includes('session') ||
                                     errorMessage.toLowerCase().includes('timeout');

            if (isSessionTimeout && reconnectAttemptsRef.current < maxReconnectAttempts && !isReconnectingRef.current) {
              console.log(`Session timeout detected, attempting reconnect (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
              isReconnectingRef.current = true;
              reconnectAttemptsRef.current++;
              ws.close();

              // Wait a moment before reconnecting
              setTimeout(() => {
                connectInternal(true);
              }, 1000);
              return;
            }

            lastErrorRef.current = errorMessage;
            setStatus('error');
            options.onError?.(errorMessage);
            ws.close();
            return;
          }

          // Handle setup complete
          if (data.setupComplete) {
            console.log('Gemini setup complete! Session is ready.');
            setStatus('connected');
            setSessionReady(true);
            setIsListening(true);
            options.onConnect?.();

            // Start batch saving every 30 seconds for resilience
            batchSaveIntervalRef.current = setInterval(() => {
              batchSaveTranscript();
            }, 30000);

            // Start keepalive ping every 30 seconds to prevent timeout
            keepAliveIntervalRef.current = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                // Send empty realtime input as keepalive
                ws.send(JSON.stringify({
                  realtimeInput: {
                    mediaChunks: []
                  }
                }));
              }
            }, 30000);

            // Reset reconnect attempts on successful connection
            reconnectAttemptsRef.current = 0;
            isReconnectingRef.current = false;

            // Start microphone
            await startMicrophone(ws);

            // Start Web Speech API for user transcription
            startSpeechRecognition();

            // Send initial prompt to kick off conversation
            let kickoffText: string;
            if (isReconnect) {
              // For reconnects, just continue naturally
              kickoffText = "[La connexion technique a été rétablie. Continue la conversation naturellement là où elle s'était arrêtée, sans mentionner de problème technique.]";
            } else {
              const isReturningUser = contextPromptRef.current.length > 0;
              kickoffText = isReturningUser
                ? "[Session démarrée. C'est quelqu'un que tu connais déjà ! Salue-le/la chaleureusement en utilisant son prénom si tu le connais, fais référence à quelque chose dont vous avez parlé la dernière fois, et demande ce qu'il/elle devient depuis.]"
                : "[Session démarrée. Salue la personne de façon super décontractée, genre tu croises un·e pote, et demande-lui comment ça va, sa journée, un truc léger.]";
            }

            const kickoff = {
              clientContent: {
                turns: [{
                  role: "user",
                  parts: [{ text: kickoffText }],
                }],
                turnComplete: true,
              },
            };
            ws.send(JSON.stringify(kickoff));
            return;
          }

          // Handle input transcription (user's speech converted to text)
          if (data.serverContent?.inputTranscription?.text) {
            const userText = data.serverContent.inputTranscription.text;
            console.log('User transcript:', userText);
            const newMessage: TranscriptMessage = {
              role: 'user',
              content: userText,
            };
            transcriptRef.current = [...transcriptRef.current, newMessage];
            setTranscript([...transcriptRef.current]);
            options.onTranscript?.(newMessage);
          }

          // Handle output transcription (Luna's speech converted to text)
          if (data.serverContent?.outputTranscription?.text) {
            const assistantText = data.serverContent.outputTranscription.text;
            console.log('Assistant transcript:', assistantText);
            const newMessage: TranscriptMessage = {
              role: 'assistant',
              content: assistantText,
            };
            transcriptRef.current = [...transcriptRef.current, newMessage];
            setTranscript([...transcriptRef.current]);
            options.onTranscript?.(newMessage);
          }

          // Handle server content (audio responses)
          if (data.serverContent) {
            const serverContent = data.serverContent;

            // Check if turn is complete
            if (serverContent.turnComplete) {
              setIsSpeaking(false);
              setIsListening(true);
              return;
            }

            // Check for interruption
            if (serverContent.interrupted) {
              console.log('Received interrupted signal from Gemini');
              playbackRef.current?.clear();
              setIsSpeaking(false);
              setIsListening(true);
              justInterruptedRef.current = true;
              return;
            }

            // Handle model turn with parts
            if (serverContent.modelTurn && serverContent.modelTurn.parts) {
              for (const part of serverContent.modelTurn.parts) {
                // Handle audio data
                if (part.inlineData && part.inlineData.mimeType?.includes("audio")) {
                  if (justInterruptedRef.current) {
                    console.log('New audio after interruption - clearing queue first');
                    playbackRef.current?.clear();
                    justInterruptedRef.current = false;
                  }
                  setIsSpeaking(true);
                  setIsListening(false);
                  playbackRef.current?.addPcmData(part.inlineData.data);
                }

                // Handle text (transcript) - fallback for models that return inline text
                if (part.text) {
                  console.log('Inline text from model:', part.text);
                  const newMessage: TranscriptMessage = {
                    role: 'assistant',
                    content: part.text,
                  };
                  transcriptRef.current = [...transcriptRef.current, newMessage];
                  setTranscript([...transcriptRef.current]);
                  options.onTranscript?.(newMessage);
                }
              }
            }
          }

        } catch (error) {
          console.error('Error parsing Gemini message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        lastErrorRef.current = 'Connection error';
        setStatus('error');
        options.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        // Clear keepalive interval
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }

        // Don't cleanup if we're reconnecting
        if (!isReconnectingRef.current) {
          cleanup();
        }

        const abnormal = event.code !== 1000;
        if (abnormal && !isReconnectingRef.current) {
          // Try to reconnect on abnormal closure if we have conversation context
          if (transcriptRef.current.length > 0 && reconnectAttemptsRef.current < maxReconnectAttempts) {
            console.log(`Abnormal closure detected, attempting reconnect (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
            isReconnectingRef.current = true;
            reconnectAttemptsRef.current++;

            // Wait a moment before reconnecting
            setTimeout(() => {
              connectInternal(true);
            }, 1500);
            return;
          }

          setStatus('error');
          if (!lastErrorRef.current) {
            const reason = event.reason || 'Connection closed unexpectedly';
            // Parse common errors
            if (reason.toLowerCase().includes('quota') || reason.toLowerCase().includes('billing')) {
              options.onError?.('API quota exceeded - check your Google AI billing');
            } else {
              options.onError?.(reason);
            }
          }
        } else if (!isReconnectingRef.current) {
          setStatus('disconnected');
          options.onDisconnect?.();
        }

        lastErrorRef.current = null;
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      isReconnectingRef.current = false;
      options.onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [options, startMicrophone, startSpeechRecognition, buildConversationSummary, batchSaveTranscript]);

  // Public connect function
  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') {
      return;
    }
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    await connectInternal(false);
  }, [status, connectInternal]);

  const cleanup = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;

    playbackRef.current?.close();
    playbackRef.current = null;

    // Stop speech recognition
    stopSpeechRecognition();

    setIsSpeaking(false);
    setIsListening(false);
    setSessionReady(false);
    setMicLevel(0);
  }, [stopSpeechRecognition]);

  const disconnect = useCallback(async () => {
    // Stop batch save interval
    if (batchSaveIntervalRef.current) {
      clearInterval(batchSaveIntervalRef.current);
      batchSaveIntervalRef.current = null;
    }

    // Stop keepalive interval
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    // Final batch save before disconnecting
    await batchSaveTranscript();

    // End session in database
    if (sessionRef.current && userIdRef.current) {
      await endSession(sessionRef.current.id, userIdRef.current);
      sessionRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setStatus('disconnected');
  }, [cleanup, batchSaveTranscript]);

  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  return {
    connect,
    disconnect,
    status,
    isSpeaking,
    isListening,
    sessionReady,
    micLevel,
    transcript,
    getTranscript,
    sessionNumber,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  };
}
