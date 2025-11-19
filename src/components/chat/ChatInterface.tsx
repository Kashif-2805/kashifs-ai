import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MessageBubble from "./MessageBubble";
import FileUpload from "./FileUpload";
import VoiceRecorder from "./VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";

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

interface ChatInterfaceProps {
  conversationId: string;
  voiceEnabled?: boolean;
}

const ChatInterface = ({ conversationId, voiceEnabled = false }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([]);
  }, [conversationId]);

  const generateVoice = async (text: string) => {
    if (!voiceEnabled) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text },
      });

      if (error) throw error;
      
      return data?.audioContent;
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const streamChat = async (userMessage: Message) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    // Get user session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare message content with file context
    let messageContent = userMessage.content;
    if (userMessage.files && userMessage.files.length > 0) {
      const fileContext = userMessage.files.map(f => 
        `[Attached file: ${f.name}]`
      ).join('\n');
      messageContent = `${fileContext}\n\n${messageContent}`;
    }
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [...messages.map(m => ({ role: m.role, content: m.content })), 
          { role: userMessage.role, content: messageContent }] 
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        } else if (resp.status === 402) {
          toast({
            title: "Payment Required",
            description: "Please add credits to continue using Kashif's AI.",
            variant: "destructive",
          });
        }
        throw new Error("Failed to start stream");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Generate voice for complete response if enabled
      if (voiceEnabled && assistantContent) {
        const audioContent = await generateVoice(assistantContent);
        if (audioContent) {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => 
                i === prev.length - 1 ? { ...m, audioContent } : m
              );
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      toast({
        title: "Error",
        description: "Failed to get response from AI.",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input || "Please analyze the attached files",
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedFiles([]);
    setShowFileUpload(false);
    setIsLoading(true);

    try {
      await streamChat(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-elegant">
                  <span className="text-3xl font-bold text-primary-foreground">KAI</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-foreground">Welcome to Kashif's AI</h2>
              <p className="text-muted-foreground">
                Ask me anything! I can help with coding, research, creative tasks, and much more.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {showFileUpload && (
            <FileUpload
              files={uploadedFiles}
              onFileUpload={(file) => setUploadedFiles(prev => [...prev, file])}
              onFileRemove={(fileName) => setUploadedFiles(prev => prev.filter(f => f.name !== fileName))}
            />
          )}
          
          <div className="flex gap-3">
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFileUpload(!showFileUpload)}
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <VoiceRecorder onTranscript={handleVoiceTranscript} />
            </div>
            
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kashif's AI anything..."
              className="min-h-[60px] max-h-[200px] resize-none rounded-2xl border-border bg-background focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
              className="rounded-2xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground shadow-elegant h-[60px] px-6"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
