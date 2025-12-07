import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";

const Chat = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState("1");

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AppLayout 
      voiceEnabled={voiceEnabled} 
      onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
      showVoiceToggle
    >
      <ChatInterface conversationId={currentConversationId} voiceEnabled={voiceEnabled} />
    </AppLayout>
  );
};

export default Chat;
