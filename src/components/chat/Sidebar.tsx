import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
}

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

const Sidebar = ({ 
  conversations, 
  currentConversationId, 
  onSelectConversation, 
  onNewChat 
}: SidebarProps) => {
  return (
    <div className="flex w-64 flex-col border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <Button
          onClick={onNewChat}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground shadow-elegant"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-2 py-4">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                currentConversationId === conv.id
                  ? "bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/20"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 truncate">
                  <p className="text-sm font-medium text-foreground truncate">
                    {conv.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {conv.timestamp.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-4">
        <div className="text-xs text-center text-muted-foreground">
          Powered by Kashif's AI
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
