import { User, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
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
        className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-elegant"
            : "bg-card border border-border text-card-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
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
