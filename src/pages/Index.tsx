import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import Sidebar from "@/components/chat/Sidebar";
import { Volume2, VolumeX, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import kashifLogo from "@/assets/kashif-ai-logo.png";

const Index = () => {
  const [conversations, setConversations] = useState([
    { id: "1", title: "New Conversation", timestamp: new Date() }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState("1");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      title: "New Conversation",
      timestamp: new Date(),
    };
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newId);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar 
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={setCurrentConversationId}
          onNewChat={handleNewChat}
        />
      )}
      
      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar 
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={(id) => {
                setCurrentConversationId(id);
                setIsSidebarOpen(false);
              }}
              onNewChat={() => {
                handleNewChat();
                setIsSidebarOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {isMobile && (
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              )}
              <img 
                src={kashifLogo} 
                alt="Kashif's AI Logo" 
                className="h-8 w-8 md:h-12 md:w-12 object-contain shrink-0"
              />
              <div>
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Kashif's AI
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Advanced AI Assistant</p>
              </div>
            </div>
            
            <Button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              variant="outline"
              size="icon"
              className="rounded-full shrink-0"
              title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
            >
              {voiceEnabled ? (
                <Volume2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              ) : (
                <VolumeX className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </header>
        
        <ChatInterface conversationId={currentConversationId} voiceEnabled={voiceEnabled} />
      </div>
    </div>
  );
};

export default Index;
