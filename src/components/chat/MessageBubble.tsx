import { useState } from "react";
import { User, Bot, FileText, Image as ImageIcon, Copy, Volume2, Check, Pause, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import VoicePlayer from "./VoicePlayer";
import ReactMarkdown from "react-markdown";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  preview?: string;
  analysis?: {
    topic: string;
    subtopics: string[];
    summary: string;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: UploadedFile[];
  audioContent?: string;
}

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const handleReadAloud = () => {
    if (isReadingAloud) return;
    
    if (!window.speechSynthesis) {
      toast({
        title: "Not Available",
        description: "Text-to-speech is not available on this device",
        variant: "destructive",
      });
      return;
    }
    
    window.speechSynthesis.cancel();
    setIsReadingAloud(true);
    
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(message.content);
        utterance.rate = speechRate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        
        utterance.onend = () => {
          setIsReadingAloud(false);
        };
        
        utterance.onerror = (event) => {
          console.error('Speech error:', event);
          setIsReadingAloud(false);
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            toast({
              title: "Playback Failed",
              description: "Could not play audio. Try again.",
              variant: "destructive",
            });
          }
        };
        
        window.speechSynthesis.speak(utterance);
        
      } catch (error) {
        console.error('Speech synthesis error:', error);
        setIsReadingAloud(false);
        toast({
          title: "Error",
          description: "Text-to-speech failed. Your browser may not support this feature.",
          variant: "destructive",
        });
      }
    }, 150);
  };

  const handlePauseResume = () => {
    if (!window.speechSynthesis) return;
    
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: message.content,
          title: "Share message"
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      await handleCopy();
      toast({
        title: "Copied",
        description: "Message copied to clipboard (share not supported)",
      });
    }
  };

  return (
    <div 
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
      )}
      
      <div className="flex flex-col gap-2 max-w-[80%] md:max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-3 space-y-3 ${
            isUser
              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg"
              : "bg-card border border-border text-card-foreground shadow-sm"
          }`}
        >
          {/* Attached Files */}
          {message.files && message.files.length > 0 && (
            <div className="space-y-2 pb-3 border-b border-border/30">
              {message.files.map((file, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {file.preview ? (
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : file.type.startsWith('image/') ? (
                      <ImageIcon className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                    <span className="truncate font-medium">{file.name}</span>
                  </div>
                  
                  {/* PDF Analysis Display */}
                  {file.analysis && (
                    <div className={`text-xs p-2 rounded-lg ${isUser ? 'bg-white/10' : 'bg-muted'}`}>
                      <p className="font-semibold">Topic: {file.analysis.topic}</p>
                      <p className="text-muted-foreground mt-1">
                        Subtopics: {file.analysis.subtopics.slice(0, 3).join(', ')}
                        {file.analysis.subtopics.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Message Content with Markdown */}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          
          {message.audioContent && message.role === "assistant" && (
            <div className="pt-2">
              <VoicePlayer audioContent={message.audioContent} autoPlay />
            </div>
          )}
        </div>

        {/* Action Controls */}
        {!isUser && (
          <div className={`flex flex-col gap-2 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-1 text-xs">Copy</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReadAloud}
                disabled={isReadingAloud}
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <Volume2 className={`h-4 w-4 ${isReadingAloud ? 'animate-pulse text-primary' : ''}`} />
                <span className="ml-1 text-xs">{isReadingAloud ? 'Playing' : 'Read'}</span>
              </Button>
              {isReadingAloud && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePauseResume}
                  className="h-8 px-2.5 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="h-8 px-2.5 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Speech Rate Slider */}
            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">{speechRate.toFixed(1)}x</span>
              <Slider
                value={[speechRate]}
                onValueChange={(value) => setSpeechRate(value[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="w-24"
              />
            </div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted border border-border">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
