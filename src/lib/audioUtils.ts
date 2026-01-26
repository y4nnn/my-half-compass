/**
 * Audio utilities for Gemini Live API voice chat
 * Handles PCM audio capture, encoding, and playback
 */

// Convert Float32Array to 16-bit PCM
export function float32ToPcm16(float32: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

// Convert 16-bit PCM to Float32Array
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

// Encode Int16Array to base64
export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode base64 to Int16Array
export function base64ToPcm(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Resample audio from one sample rate to another
export function resample(
  input: Float32Array, 
  inputSampleRate: number, 
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return input;
  }
  
  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, input.length - 1);
    const fraction = srcIndex - srcIndexFloor;
    
    output[i] = input[srcIndexFloor] * (1 - fraction) + input[srcIndexCeil] * fraction;
  }
  
  return output;
}

// Audio playback queue for smooth playback
export class AudioPlaybackQueue {
  private audioContext: AudioContext;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextStartTime = 0;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlaybackEnd?: () => void;

  constructor(sampleRate: number = 24000) {
    this.audioContext = new AudioContext({ sampleRate });
  }

  setOnPlaybackEnd(callback: () => void) {
    this.onPlaybackEnd = callback;
  }

  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Add PCM audio data to the queue
  addPcmData(pcmBase64: string) {
    try {
      const pcm = base64ToPcm(pcmBase64);
      const float32 = pcm16ToFloat32(pcm);
      
      const buffer = this.audioContext.createBuffer(1, float32.length, this.audioContext.sampleRate);
      // Copy data manually to avoid TypeScript ArrayBuffer type issues
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < float32.length; i++) {
        channelData[i] = float32[i];
      }
      
      this.queue.push(buffer);
      this.playNext();
    } catch (error) {
      console.error('Error adding PCM data to queue:', error);
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    const currentTime = this.audioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }

    const buffer = this.queue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);
    source.start(this.nextStartTime);
    
    this.nextStartTime += buffer.duration;
    this.currentSource = source;
    this.isPlaying = true;

    source.onended = () => {
      if (this.queue.length > 0) {
        this.playNext();
      } else {
        this.isPlaying = false;
        this.currentSource = null;
        this.onPlaybackEnd?.();
      }
    };
  }

  // Clear the queue (for interruptions)
  clear() {
    this.queue = [];
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.currentSource = null;
    }
    this.isPlaying = false;
    this.nextStartTime = this.audioContext.currentTime;
  }

  getIsPlaying() {
    return this.isPlaying;
  }

  close() {
    this.clear();
    this.audioContext.close();
  }
}

// Microphone capture with resampling to 16kHz
export class MicrophoneCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onAudioData?: (base64: string) => void;
  private isCapturing = false;

  async start(onAudioData: (base64: string) => void): Promise<void> {
    this.onAudioData = onAudioData;
    
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      // Create a script processor for audio capture (AudioWorklet would be better but requires more setup)
      const source = this.audioContext.createMediaStreamSource(this.stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (e) => {
        if (!this.isCapturing) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm = float32ToPcm16(inputData);
        const base64 = pcmToBase64(pcm);
        
        this.onAudioData?.(base64);
      };
      
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      this.isCapturing = true;
    } catch (error) {
      console.error('Error starting microphone capture:', error);
      throw error;
    }
  }

  stop() {
    this.isCapturing = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getIsCapturing() {
    return this.isCapturing;
  }
}
