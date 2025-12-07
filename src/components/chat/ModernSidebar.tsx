import { Home, MessageSquare, Clock, Calendar, FileText, Video, ImageIcon, Settings, Plus, ChevronDown, Circle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface ModernSidebarProps {
  onCloseMobile?: () => void;
}

const ModernSidebar = ({ onCloseMobile }: ModernSidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const userEmail = user?.email || "";
  const userName = userEmail.split('@')[0] || "User";
  const initials = userName.slice(0, 2).toUpperCase();

  const navItems: Array<{ icon: any; label: string; href: string; badge?: number }> = [
    { icon: Home, label: "Home", href: "/" },
    { icon: MessageSquare, label: "AI Chat", href: "/chat" },
    { icon: Clock, label: "History", href: "/history" },
    { icon: Calendar, label: "Calendar", href: "/calendar" },
    { icon: FileText, label: "AI PPT", href: "/ppt" },
    { icon: Video, label: "AI Video", href: "/video" },
    { icon: ImageIcon, label: "Image Generator", href: "/images" },
  ];

  const handleNavClick = (href: string) => {
    navigate(href);
    onCloseMobile?.();
  };

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
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && (
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
      </div>

      {/* Settings at Bottom */}
      <div className="p-2 border-t border-border">
        <button 
          onClick={() => handleNavClick('/settings')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ModernSidebar;
