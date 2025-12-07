import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, Video, ImageIcon, Trash2, ExternalLink } from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  title: string;
  type: string;
  created_at: string;
  updated_at: string;
}

const History = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== id));
      toast({ title: "Deleted", description: "Conversation removed from history" });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const handleOpen = (conversation: Conversation) => {
    if (conversation.type === 'chat') {
      navigate('/chat');
    } else if (conversation.type === 'ppt') {
      navigate('/ppt');
    } else if (conversation.type === 'video') {
      navigate('/video');
    } else if (conversation.type === 'image') {
      navigate('/images');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat': return MessageSquare;
      case 'ppt': return FileText;
      case 'video': return Video;
      case 'image': return ImageIcon;
      default: return MessageSquare;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chat': return 'Chat';
      case 'ppt': return 'Presentation';
      case 'video': return 'Video';
      case 'image': return 'Image';
      default: return 'Chat';
    }
  };

  const groupConversations = (items: Conversation[]) => {
    const groups: { label: string; items: Conversation[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'This Week', items: [] },
      { label: 'This Month', items: [] },
      { label: 'Older', items: [] },
    ];

    items.forEach(item => {
      const date = new Date(item.updated_at);
      if (isToday(date)) {
        groups[0].items.push(item);
      } else if (isYesterday(date)) {
        groups[1].items.push(item);
      } else if (isThisWeek(date)) {
        groups[2].items.push(item);
      } else if (isThisMonth(date)) {
        groups[3].items.push(item);
      } else {
        groups[4].items.push(item);
      }
    });

    return groups.filter(g => g.items.length > 0);
  };

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

  const groupedConversations = groupConversations(conversations);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">History</h2>
          <p className="text-muted-foreground">Your recent activities</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No activity yet</p>
              <Button onClick={() => navigate('/chat')}>Start a Chat</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedConversations.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">{group.label}</h3>
                <div className="space-y-2">
                  {group.items.map((conversation) => {
                    const Icon = getIcon(conversation.type);
                    return (
                      <Card 
                        key={conversation.id} 
                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleOpen(conversation)}
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{conversation.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {getTypeLabel(conversation.type)} • {format(new Date(conversation.updated_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpen(conversation);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(conversation.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default History;
