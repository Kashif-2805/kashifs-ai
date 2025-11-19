import { Home, MessageSquare, Clock, Inbox, Calendar, BarChart3, Settings, Plus, ChevronDown, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
}

interface ModernSidebarProps {
  conversations: Conversation[];
  currentConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

const ModernSidebar = ({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: ModernSidebarProps) => {
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = userEmail.split('@')[0] || "User";
  const initials = userName.slice(0, 2).toUpperCase();

  const navItems = [
    { icon: Home, label: "Home", active: true },
    { icon: MessageSquare, label: "AI Chat", active: false },
    { icon: Clock, label: "History", active: false },
    { icon: Inbox, label: "Inbox", badge: 6, active: false },
    { icon: Calendar, label: "Calendar", active: false },
    { icon: BarChart3, label: "Reports & Analytics", active: false },
  ];

  const projectColors = [
    "bg-purple-500",
    "bg-blue-500",
    "bg-cyan-500",
  ];

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* User Profile Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="" alt={userName} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  item.active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <Badge 
                    variant="secondary" 
                    className="h-5 min-w-5 rounded-full bg-primary text-primary-foreground px-1.5"
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* My Projects Section */}
        <div className="mt-6 px-2">
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">My Projects</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-primary hover:text-primary/90 text-sm font-medium"
              onClick={onNewChat}
            >
              + Add
            </Button>
          </div>
          
          <div className="space-y-1 mt-2">
            {conversations.slice(0, 3).map((conversation, index) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group",
                  currentConversationId === conversation.id
                    ? "bg-muted"
                    : "hover:bg-muted/50"
                )}
              >
                <Circle 
                  className={cn(
                    "h-2 w-2 flex-shrink-0 fill-current",
                    projectColors[index % projectColors.length],
                    projectColors[index % projectColors.length].replace('bg-', 'text-')
                  )}
                />
                <span className="flex-1 text-left truncate">{conversation.title}</span>
                {currentConversationId === conversation.id && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-muted-foreground">...</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings at Bottom */}
      <div className="p-2 border-t border-border">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ModernSidebar;
