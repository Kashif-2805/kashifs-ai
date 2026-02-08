import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

// Detect browser and platform capabilities
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  
  return { isIOS, isSafari, isAndroid, isChrome, isFirefox };
};

// Get the best supported MIME type for the current browser
const getSupportedMimeType = (): string => {
  const { isIOS, isSafari } = getBrowserInfo();
  
  // iOS Safari and macOS Safari prefer mp4/aac
  if (isIOS || isSafari) {
    const safariTypes = [
      'audio/mp4',
      'audio/aac',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    for (const type of safariTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
  }
  
  // Chrome, Firefox, Edge prefer webm/opus
  const standardTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  
  for (const type of standardTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  
  // Fallback - let browser choose
  return '';
};

// Check if voice recording is supported
const isVoiceSupported = (): { supported: boolean; reason?: string } => {
  // Check secure context (HTTPS)
  if (!window.isSecureContext) {
    return { supported: false, reason: "Voice requires HTTPS connection" };
  }
  
  // Check MediaDevices API
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { supported: false, reason: "Your browser doesn't support voice input" };
  }
  
  // Check MediaRecorder API
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: "Your browser doesn't support audio recording" };
  }
  
  return { supported: true };
};

const VoiceRecorder = ({ onTranscript }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [permissionHelpOpen, setPermissionHelpOpen] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Check permission state on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if permissions API is available
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          
          // Listen for permission changes
          result.addEventListener('change', () => {
            setPermissionState(result.state as 'prompt' | 'granted' | 'denied');
          });
        }
      } catch {
        // Permissions API not supported (common on mobile)
        setPermissionState('unknown');
      }
    };
    
    checkPermission();
    
    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<MediaStream | null> => {
    const { isIOS, isAndroid } = getBrowserInfo();

    const isEmbedded = (() => {
      try {
        return window.self !== window.top;
      } catch {
        // Cross-origin iframe access throws
        return true;
      }
    })();

    try {
      // Mobile-optimized constraints
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Lower sample rate for better mobile compatibility
          sampleRate: isIOS || isAndroid ? 16000 : 44100,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionState('granted');
      return stream;
    } catch (error) {
      const err = error as DOMException;
      console.error('Microphone permission error:', err.name, err.message);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setPermissionHelpOpen(true);

        const extraHint = isEmbedded
          ? "If you're using an embedded preview or in-app browser, mic access may be blocked. Open the app in a new tab / Safari / Chrome."
          : undefined;

        toast({
          title: "Microphone Access Denied",
          description:
            extraHint ??
            (isIOS
              ? "On iPhone/iPad: Settings → Safari → Microphone → Allow"
              : isAndroid
                ? "On Android: System Settings → Apps → Browser → Permissions → Microphone"
                : "Allow microphone access in your browser site settings, then reload"),
          variant: "destructive",
        });
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast({
          title: "No Microphone Found",
          description: "Please connect a microphone and try again",
          variant: "destructive",
        });
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast({
          title: "Microphone In Use",
          description: "Another app may be using your microphone. Please close it and try again.",
          variant: "destructive",
        });
      } else if (err.name === 'OverconstrainedError') {
        // Try again with basic constraints
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setPermissionState('granted');
          return stream;
        } catch {
          toast({
            title: "Microphone Error",
            description: "Unable to access microphone with current settings",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Microphone Error",
          description: err.message || "Unable to access microphone",
          variant: "destructive",
        });
      }

      return null;
    }
  }, [toast]);

  const startRecording = useCallback(async () => {
    // Check if voice is supported
    const supportCheck = isVoiceSupported();
    if (!supportCheck.supported) {
      toast({
        title: "Voice Not Supported",
        description: supportCheck.reason,
        variant: "destructive",
      });
      return;
    }
    
    // Request microphone permission
    const stream = await requestMicrophonePermission();
    if (!stream) return;
    
    streamRef.current = stream;
    
    try {
      const mimeType = getSupportedMimeType();
      console.log('Using MIME type:', mimeType || 'browser default');
      
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      // Lower bitrate for mobile to reduce file size
      const { isIOS, isAndroid } = getBrowserInfo();
      if (isIOS || isAndroid) {
        options.audioBitsPerSecond = 64000;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Clear duration timer
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
        setRecordingDuration(0);
        
        // Get the actual MIME type used
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        console.log('Recording stopped. Blob size:', audioBlob.size, 'Type:', actualMimeType);
        
        // Check if we have actual audio data
        if (audioBlob.size < 1000) {
          toast({
            title: "Recording Too Short",
            description: "Please speak for at least 1 second",
            variant: "destructive",
          });
          return;
        }
        
        await transcribeAudio(audioBlob, actualMimeType);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Recording Error",
          description: "An error occurred while recording. Please try again.",
          variant: "destructive",
        });
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      };

      // Start recording - use timeslice for more reliable data capture on mobile
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      // Haptic feedback on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
    } catch (error) {
      console.error('MediaRecorder creation error:', error);
      toast({
        title: "Recording Error",
        description: "Unable to start recording. Your browser may not support this feature.",
        variant: "destructive",
      });
      stream.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [requestMicrophonePermission, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // Haptic feedback on mobile if available
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const transcribeAudio = async (audioBlob: Blob, mimeType: string) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      console.log('Sending audio for transcription. Size:', base64Audio.length, 'MIME:', mimeType);

      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: { 
          audio: base64Audio,
          mimeType: mimeType,
        },
      });

      if (error) {
        console.error('Transcription API error:', error);
        throw error;
      }

      if (data?.text) {
        onTranscript(data.text);
        toast({
          title: "Transcription Complete",
          description: "Your voice has been converted to text",
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: "Please speak clearly and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: "Unable to convert speech to text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check browser support
  const supportCheck = isVoiceSupported();
  const isSupported = supportCheck.supported;

  const isEmbedded = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const handleOpenInNewTab = useCallback(() => {
    try {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
    } catch {
      // ignore
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!isSupported) return;

    // If permission was denied previously, show help instead of retrying.
    if (!isRecording && permissionState === 'denied') {
      setPermissionHelpOpen(true);
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, isSupported, permissionState, startRecording, stopRecording]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={permissionHelpOpen} onOpenChange={setPermissionHelpOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                onClick={handleClick}
                disabled={isProcessing || !isSupported}
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className={`rounded-full h-10 w-10 transition-all ${
                  isRecording
                    ? 'animate-pulse bg-destructive hover:bg-destructive/90 ring-4 ring-destructive/30'
                    : permissionState === 'denied'
                      ? 'border-destructive text-destructive'
                      : 'border-border hover:border-primary'
                }`}
                aria-label={
                  isProcessing
                    ? "Processing audio..."
                    : isRecording
                      ? "Stop recording"
                      : "Start voice recording"
                }
              >
                {isProcessing ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isRecording ? (
                  <Square className="h-4 w-4" />
                ) : permissionState === 'denied' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              {/* Recording duration indicator */}
              {isRecording && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                  {formatDuration(recordingDuration)}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            {!isSupported ? (
              <p>{supportCheck.reason}</p>
            ) : permissionState === 'denied' ? (
              <p>Mic access denied — tap for help</p>
            ) : isProcessing ? (
              <p>Converting speech to text...</p>
            ) : isRecording ? (
              <p>Tap to stop recording</p>
            ) : (
              <p>Tap to start voice input</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enable microphone access</AlertDialogTitle>
          <AlertDialogDescription>
            Your browser is blocking microphone access, so voice input can’t start.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 text-sm text-foreground">
          {isEmbedded && (
            <p className="text-muted-foreground">
              Tip: Embedded previews / in-app browsers often block mic access. Opening the app in a new tab usually fixes it.
            </p>
          )}

          <div className="space-y-2">
            <p className="font-medium">Fix steps</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                Desktop Chrome/Edge: click the lock icon → Site settings → Microphone → Allow → reload.
              </li>
              <li>
                iPhone/iPad: Settings → Safari → Microphone → Allow (or Safari → aA → Website Settings → Microphone).
              </li>
              <li>
                Android: System Settings → Apps → your browser → Permissions → Microphone → Allow; then reload.
              </li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleOpenInNewTab}>Open in new tab</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VoiceRecorder;
