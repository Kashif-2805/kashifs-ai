import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoicePlayerProps {
  audioContent: string;
  autoPlay?: boolean;
}

const VoicePlayer = ({ audioContent, autoPlay = false }: VoicePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioContent && audioRef.current) {
      const audio = audioRef.current;
      audio.src = `data:audio/mp3;base64,${audioContent}`;
      
      if (autoPlay) {
        audio.play().catch(console.error);
      }
    }
  }, [audioContent, autoPlay]);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-xl">
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      <Button
        onClick={togglePlayback}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
      >
        {isPlaying ? (
          <VolumeX className="h-4 w-4 text-primary" />
        ) : (
          <Volume2 className="h-4 w-4 text-primary" />
        )}
      </Button>
      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r from-primary to-secondary transition-all ${
            isPlaying ? 'animate-pulse' : ''
          }`}
          style={{ width: isPlaying ? '100%' : '0%' }}
        />
      </div>
    </div>
  );
};

export default VoicePlayer;
