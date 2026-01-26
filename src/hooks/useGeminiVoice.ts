import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioPlaybackQueue, MicrophoneCapture } from '@/lib/audioUtils';

export interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseGeminiVoiceOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onTranscript?: (message: TranscriptMessage) => void;
}

interface GeminiMessage {
  type: string;
  data?: string;
  role?: 'user' | 'assistant';
  text?: string;
  error?: string;
}

export function useGeminiVoice(options: UseGeminiVoiceOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const micRef = useRef<MicrophoneCapture | null>(null);
  const playbackRef = useRef<AudioPlaybackQueue | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') {
      return;
    }

    setStatus('connecting');
    transcriptRef.current = [];
    setTranscript([]);

    try {
      // Initialize audio playback
      playbackRef.current = new AudioPlaybackQueue(24000);
      playbackRef.current.setOnPlaybackEnd(() => {
        setIsSpeaking(false);
        setIsListening(true);
      });
      await playbackRef.current.resume();

      // Connect to the edge function WebSocket
      const wsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-voice-session`.replace('https://', 'wss://');
      
      console.log('Connecting to Gemini voice session:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('WebSocket connected');
        setStatus('connected');
        setIsListening(true);
        options.onConnect?.();

        // Start microphone capture
        micRef.current = new MicrophoneCapture();
        await micRef.current.start((audioBase64) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'audio', data: audioBase64 }));
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: GeminiMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'audio':
              if (message.data) {
                setIsSpeaking(true);
                setIsListening(false);
                playbackRef.current?.addPcmData(message.data);
              }
              break;
              
            case 'transcript':
              if (message.role && message.text) {
                const newMessage: TranscriptMessage = {
                  role: message.role,
                  content: message.text,
                };
                transcriptRef.current = [...transcriptRef.current, newMessage];
                setTranscript([...transcriptRef.current]);
                options.onTranscript?.(newMessage);
              }
              break;
              
            case 'turnComplete':
              setIsSpeaking(false);
              setIsListening(true);
              break;
              
            case 'interrupted':
              playbackRef.current?.clear();
              setIsSpeaking(false);
              setIsListening(true);
              break;
              
            case 'error':
              console.error('Gemini error:', message.error);
              options.onError?.(message.error || 'Unknown error');
              break;
              
            case 'connected':
              console.log('Gemini session established');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
        options.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        cleanup();
        setStatus('disconnected');
        options.onDisconnect?.();
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setStatus('error');
      options.onError?.(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [status, options]);

  const cleanup = useCallback(() => {
    micRef.current?.stop();
    micRef.current = null;
    
    playbackRef.current?.close();
    playbackRef.current = null;
    
    setIsSpeaking(false);
    setIsListening(false);
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    cleanup();
    setStatus('disconnected');
  }, [cleanup]);

  const getTranscript = useCallback(() => {
    return transcriptRef.current;
  }, []);

  return {
    connect,
    disconnect,
    status,
    isSpeaking,
    isListening,
    transcript,
    getTranscript,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  };
}
