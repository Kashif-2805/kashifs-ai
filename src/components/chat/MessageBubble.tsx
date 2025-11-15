import { User, Bot, FileText, Image as ImageIcon } from "lucide-react";
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

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-elegant">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      
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

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
