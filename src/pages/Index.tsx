import { useState } from "react";
import ChatInterface from "@/components/chat/ChatInterface";
import Sidebar from "@/components/chat/Sidebar";
import { MessageSquare } from "lucide-react";

const Index = () => {
  const [conversations, setConversations] = useState([
    { id: "1", title: "New Conversation", timestamp: new Date() }
  ]);
  const [currentConversationId, setCurrentConversationId] = useState("1");

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
      <Sidebar 
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversationId}
        onNewChat={handleNewChat}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-elegant">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                MKA AI Tool
              </h1>
              <p className="text-sm text-muted-foreground">Advanced AI Assistant</p>
            </div>
          </div>
        </header>
        
        <ChatInterface conversationId={currentConversationId} />
      </div>
    </div>
  );
};

export default Index;
