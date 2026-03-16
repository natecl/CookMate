import { useState, useRef, useCallback, useEffect } from 'react';
import type { CookingLiveServerMessage } from '../../types/websocket';

const WS_URL = 'ws://localhost:5000/ws/cooking-live';
const VIDEO_INTERVAL_MS = 1000;
const VIDEO_SIZE = 768;

interface IllustrationState {
  image: string;
  format: 'png' | 'gif';
  alt: string;
}

interface TranscriptEntry {
  role: 'user' | 'model';
  text: string;
}

export const useRamseyBot = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [error, setError] = useState('');
  const [stepIllustration, setStepIllustration] = useState<IllustrationState | null>(null);
  const [clarifyIllustration, setClarifyIllustration] = useState<IllustrationState | null>(null);
  const [illustrationLoading, setIllustrationLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const captureNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const videoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMutedRef = useRef(false);
  const intentionalCloseRef = useRef(false);

  // Keep ref in sync with state for use inside worklet callback
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // iOS/mobile: AudioContext can only be resumed inside a user gesture.
  // Re-attempt resume on every tap/click until both contexts are running.
  useEffect(() => {
    const resumeContexts = () => {
      if (captureContextRef.current?.state === 'suspended') {
        captureContextRef.current.resume().catch(() => {});
      }
      if (playbackContextRef.current?.state === 'suspended') {
        playbackContextRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener('touchstart', resumeContexts);
    document.addEventListener('click', resumeContexts);
    return () => {
      document.removeEventListener('touchstart', resumeContexts);
      document.removeEventListener('click', resumeContexts);
    };
  }, []);

  const cleanup = useCallback(() => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    if (captureNodeRef.current) {
      captureNodeRef.current.disconnect();
      captureNodeRef.current = null;
    }

    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }

    nextPlayTimeRef.current = 0;

    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (socketRef.current) {
      intentionalCloseRef.current = true;
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsModelSpeaking(false);
    setAudioLevel(0);
  }, []);

  const startMicCapture = useCallback(async () => {
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    micStreamRef.current = micStream;

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    captureContextRef.current = audioCtx;
    await audioCtx.resume();

    await audioCtx.audioWorklet.addModule('/audio/pcm-capture-processor.js');

    const source = audioCtx.createMediaStreamSource(micStream);
    const captureNode = new AudioWorkletNode(audioCtx, 'pcm-capture-processor');
    captureNodeRef.current = captureNode;

    captureNode.port.onmessage = (event: MessageEvent) => {
      if (event.data.type === 'audio' && socketRef.current?.readyState === 1) {
        if (!isMutedRef.current) {
          socketRef.current.send(event.data.buffer);
        }
        setAudioLevel(isMutedRef.current ? 0 : event.data.level);
      }
    };

    source.connect(captureNode);
    captureNode.connect(audioCtx.destination); // Required to keep processing alive
  }, []);

  const nextPlayTimeRef = useRef(0);

  const setupPlayback = useCallback(async () => {
    const playbackCtx = new AudioContext({ sampleRate: 24000 });
    playbackContextRef.current = playbackCtx;
    await playbackCtx.resume();

    // Detect if browser blocked audio autoplay
    if (playbackCtx.state === 'suspended') {
      setAudioBlocked(true);
    }
    playbackCtx.addEventListener('statechange', () => {
      if (playbackCtx.state === 'running') {
        setAudioBlocked(false);
      }
    });

    nextPlayTimeRef.current = 0;
    console.log('[Playback] AudioContext created, sampleRate:', playbackCtx.sampleRate, 'state:', playbackCtx.state);
  }, []);

  const startVideoCapture = useCallback((videoRef: React.RefObject<HTMLVideoElement | null>) => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = VIDEO_SIZE;
      canvasRef.current.height = VIDEO_SIZE;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    videoIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || !socketRef.current?.readyState === 1) return;

      ctx!.drawImage(video, 0, 0, VIDEO_SIZE, VIDEO_SIZE);
      canvas.toBlob(
        (blob) => {
          if (!blob || !socketRef.current?.readyState === 1) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            socketRef.current!.send(
              JSON.stringify({ type: 'live:video', image: base64 })
            );
          };
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.7
      );
    }, VIDEO_INTERVAL_MS);
  }, []);

  const startVoiceSession = useCallback(
    async (cookingSessionId: string, videoRef?: React.RefObject<HTMLVideoElement | null>) => {
      setError('');
      intentionalCloseRef.current = false;

      try {
        // Set up audio playback first
        await setupPlayback();

        // Connect WebSocket
        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.binaryType = 'arraybuffer';

        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'live:start', cookingSessionId }));
        };

        socket.onmessage = (event: MessageEvent) => {
          if (event.data instanceof ArrayBuffer) {
            // Binary: raw PCM 16-bit audio from Gemini at 24kHz
            const ctx = playbackContextRef.current;
            if (!ctx || ctx.state !== 'running') {
              console.log('[Playback] Skipping audio, ctx state:', ctx?.state);
              return;
            }

            const pcm16 = new Int16Array(event.data);
            const audioBuffer = ctx.createBuffer(1, pcm16.length, 24000);
            const channelData = audioBuffer.getChannelData(0);
            for (let i = 0; i < pcm16.length; i++) {
              channelData[i] = pcm16[i] / 32768;
            }

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);

            // Schedule chunks back-to-back to avoid gaps
            const now = ctx.currentTime;
            const startTime = Math.max(now, nextPlayTimeRef.current);
            source.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;

            setIsModelSpeaking(true);
            source.onended = () => {
              if (nextPlayTimeRef.current <= ctx.currentTime + 0.05) {
                setIsModelSpeaking(false);
              }
            };

            console.log(`[Playback] Queued ${pcm16.length} samples at ${startTime.toFixed(3)}, duration=${audioBuffer.duration.toFixed(3)}s`);
            return;
          }

          // Text: JSON control messages
          let msg: CookingLiveServerMessage;
          try {
            msg = JSON.parse(event.data);
          } catch {
            return;
          }

          if (msg.type === 'live:ready') {
            setIsConnected(true);
            // Start mic capture after Gemini session is ready
            startMicCapture().catch((err: Error) => {
              setError('Microphone access failed: ' + err.message);
            });
            // Start video frame capture
            if (videoRef) {
              startVideoCapture(videoRef);
            }
          } else if (msg.type === 'live:transcript') {
            setTranscript((prev) => [...prev.slice(-19), { role: msg.role, text: msg.text }]);
          } else if (msg.type === 'live:turn_complete') {
            setIsModelSpeaking(false);
          } else if (msg.type === 'live:illustration_loading') {
            if (msg.context === 'step') {
              setIllustrationLoading(true);
            }
          } else if (msg.type === 'live:illustration') {
            if (msg.context === 'step') {
              setStepIllustration({ image: msg.image, format: msg.format, alt: msg.alt });
              setIllustrationLoading(false);
            } else if (msg.context === 'clarify') {
              setClarifyIllustration({ image: msg.image, format: msg.format, alt: msg.alt });
            }
          } else if (msg.type === 'live:illustration_error') {
            if (msg.context === 'step') {
              setIllustrationLoading(false);
            }
          } else if (msg.type === 'live:error') {
            setError(msg.error || 'Voice agent error');
          }
        };

        socket.onerror = () => {
          if (!intentionalCloseRef.current) {
            setError('WebSocket connection error');
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          setIsModelSpeaking(false);
        };
      } catch (err) {
        setError((err as Error).message || 'Failed to start voice session');
        cleanup();
      }
    },
    [startMicCapture, setupPlayback, startVideoCapture, cleanup]
  );

  const stopVoiceSession = useCallback(() => {
    if (socketRef.current?.readyState === 1) {
      socketRef.current.send(JSON.stringify({ type: 'live:stop' }));
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const dismissClarifyIllustration = useCallback(() => {
    setClarifyIllustration(null);
  }, []);

  const clearStepIllustration = useCallback(() => {
    setStepIllustration(null);
    setIllustrationLoading(false);
  }, []);

  const unlockAudio = useCallback(() => {
    if (playbackContextRef.current?.state === 'suspended') {
      playbackContextRef.current.resume().catch(() => {});
    }
    if (captureContextRef.current?.state === 'suspended') {
      captureContextRef.current.resume().catch(() => {});
    }
    setAudioBlocked(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    isConnected,
    isModelSpeaking,
    audioLevel,
    transcript,
    isMuted,
    audioBlocked,
    error,
    stepIllustration,
    clarifyIllustration,
    illustrationLoading,
    startVoiceSession,
    stopVoiceSession,
    toggleMute,
    unlockAudio,
    dismissClarifyIllustration,
    clearStepIllustration,
  };
};
