import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip, Sparkles, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MessageBubble from "./MessageBubble";
import FileUpload from "./FileUpload";
import VoiceRecorder from "./VoiceRecorder";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const [pdfContext, setPdfContext] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setPdfContext(null);
  }, [conversationId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

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
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }
    
    // Build rich context with file analysis
    let messageContent = userMessage.content;
    let systemContext = "";
    
    if (userMessage.files && userMessage.files.length > 0) {
      const fileAnalyses = userMessage.files.map(f => {
        if (f.analysis) {
          return `[Document: ${f.name}]
Topic: ${f.analysis.topic}
Subtopics: ${f.analysis.subtopics.join(', ')}
Summary: ${f.analysis.summary}`;
        }
        return `[Attached file: ${f.name}]`;
      }).join('\n\n');
      
      systemContext = `The user has uploaded the following document(s):\n${fileAnalyses}\n\nProvide advanced insights based on this context.`;
    }

    // Include PDF context for follow-up questions
    if (pdfContext) {
      systemContext = `${pdfContext}\n\n${systemContext}`;
    }
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })), 
            { role: userMessage.role, content: messageContent }
          ],
          systemContext,
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

  const handleFileAnalyzed = (file: UploadedFile, analysis: { topic: string; subtopics: string[]; summary: string }) => {
    // Update file with analysis
    setUploadedFiles(prev => prev.map(f => 
      f.name === file.name ? { ...f, analysis } : f
    ));
    
    // Store PDF context for follow-up questions
    if (file.type === 'application/pdf') {
      setPdfContext(`PDF Document Context - Topic: ${analysis.topic}\nSubtopics: ${analysis.subtopics.join(', ')}\nSummary: ${analysis.summary}`);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input || "Please analyze the attached files in depth",
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = [
    "Explain quantum computing in depth",
    "Write a Python web scraper with error handling",
    "Analyze the stock market trends",
    "Create a business plan outline",
  ];

  return (
    <div className="flex flex-1 flex-col h-full bg-gradient-to-b from-background to-muted/20">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center space-y-8 max-w-2xl w-full">
              {/* Hero Section */}
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary via-primary to-secondary flex items-center justify-center shadow-2xl animate-pulse">
                    <Sparkles className="h-12 w-12 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  How can I help you today?
                </h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  Advanced AI with deep reasoning, PDF analysis, and intelligent responses
                </p>
              </div>
              
              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(prompt)}
                    className="group p-4 text-left rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-lg"
                  >
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>

              {/* PDF Context Indicator */}
              {pdfContext && (
                <div className="flex items-center justify-center gap-2 text-sm text-primary">
                  <FileText className="h-4 w-4" />
                  <span>PDF context active - ask follow-up questions</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPdfContext(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="space-y-6">
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                  </div>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-lg p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* PDF Context Badge */}
          {pdfContext && messages.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-xl border border-primary/20">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary flex-1">PDF context active</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPdfContext(null)}
                className="h-6 w-6 p-0 hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* File Upload Area */}
          {showFileUpload && (
            <FileUpload
              files={uploadedFiles}
              onFileUpload={(file) => setUploadedFiles(prev => [...prev, file])}
              onFileRemove={(fileName) => setUploadedFiles(prev => prev.filter(f => f.name !== fileName))}
              onFileAnalyzed={handleFileAnalyzed}
            />
          )}
          
          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && !showFileUpload && (
            <div className="flex flex-wrap gap-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
                  <FileText className="h-3 w-3" />
                  <span className="max-w-32 truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadedFiles(prev => prev.filter(f => f.name !== file.name))}
                    className="h-4 w-4 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Input Row */}
          <div className="flex items-end gap-2">
            <div className="flex gap-1">
              <Button
                onClick={() => setShowFileUpload(!showFileUpload)}
                variant="ghost"
                size="icon"
                className={cn(
                  "rounded-full h-10 w-10 shrink-0 transition-colors",
                  showFileUpload && "bg-primary/10 text-primary"
                )}
                title="Attach file (PDF, images, documents)"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <VoiceRecorder onTranscript={handleVoiceTranscript} />
            </div>
            
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... I'll provide deep, advanced insights"
                className="min-h-[52px] max-h-[200px] resize-none rounded-2xl border-border bg-muted/50 focus-visible:ring-primary pr-12 py-3.5"
                disabled={isLoading}
                rows={1}
              />
            </div>
            
            <Button
              onClick={handleSend}
              disabled={(!input.trim() && uploadedFiles.length === 0) || isLoading}
              size="icon"
              className={cn(
                "rounded-full h-12 w-12 shrink-0 transition-all duration-200",
                "bg-gradient-to-r from-primary to-secondary hover:opacity-90",
                "text-primary-foreground shadow-lg hover:shadow-xl",
                (!input.trim() && uploadedFiles.length === 0) && "opacity-50"
              )}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          
          {/* Hint Text */}
          <p className="text-xs text-center text-muted-foreground">
            Press Enter to send, Shift+Enter for new line • Supports PDF, images, and documents
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
