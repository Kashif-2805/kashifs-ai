import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ModernSidebar from "@/components/chat/ModernSidebar";
import { Volume2, VolumeX, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import kashifLogo from "@/assets/kashif-ai-logo.png";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: React.ReactNode;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  showVoiceToggle?: boolean;
}

const AppLayout = ({ 
  children, 
  voiceEnabled = false, 
  onVoiceToggle,
  showVoiceToggle = false
}: AppLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ModernSidebar onCloseMobile={() => setIsSidebarOpen(false)} />
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {isMobile && (
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    <ModernSidebar onCloseMobile={() => setIsSidebarOpen(false)} />
                  </SheetContent>
                </Sheet>
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
            
            <div className="flex items-center gap-2">
              {showVoiceToggle && onVoiceToggle && (
                <Button
                  onClick={onVoiceToggle}
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
              )}
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="icon"
                className="rounded-full shrink-0"
                title="Sign out"
              >
                <LogOut className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
