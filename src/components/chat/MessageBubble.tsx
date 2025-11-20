import { useState } from "react";
import { User, Bot, FileText, Image as ImageIcon, Copy, Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import VoicePlayer from "./VoicePlayer";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  preview?: string;
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
    if (isReadingAloud || !('speechSynthesis' in window)) {
      if (!('speechSynthesis' in window)) {
        toast({
          title: "Not Supported",
          description: "Text-to-speech is not supported in your browser",
          variant: "destructive",
        });
      }
      return;
    }
    
    // Cancel any ongoing speech (important for mobile)
    window.speechSynthesis.cancel();
    
    setIsReadingAloud(true);
    
    // Small delay for mobile browsers to process the cancel
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onend = () => {
        setIsReadingAloud(false);
      };
      
      utterance.onerror = (event) => {
        console.log('Speech error:', event);
        setIsReadingAloud(false);
        toast({
          title: "Error",
          description: "Failed to read message aloud",
          variant: "destructive",
        });
      };
      
      // For iOS Safari compatibility
      utterance.onstart = () => {
        console.log('Speech started');
      };
      
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} group`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-elegant">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      
      <div className="flex flex-col gap-2">
        <div
          className={`max-w-[70%] rounded-2xl px-4 py-3 space-y-3 ${
            isUser
              ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-elegant"
              : "bg-card border border-border text-card-foreground"
          }`}
        >
          {message.files && message.files.length > 0 && (
            <div className="space-y-2 pb-2 border-b border-border/30">
              {message.files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {file.preview ? (
                    <img 
                      src={file.preview} 
                      alt={file.name}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ) : file.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  <span className="truncate font-medium">{file.name}</span>
                </div>
              ))}
            </div>
          )}
          
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          
          {message.audioContent && message.role === "assistant" && (
            <div className="pt-2">
              <VoicePlayer audioContent={message.audioContent} autoPlay />
            </div>
          )}
        </div>

        <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReadAloud}
            disabled={isReadingAloud}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
          >
            <Volume2 className={`h-3 w-3 ${isReadingAloud ? 'animate-pulse' : ''}`} />
          </Button>
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
