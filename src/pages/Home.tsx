import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, Video, ImageIcon, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  title: string;
  type: string;
  updated_at: string;
}

const Home = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [recentActivities, setRecentActivities] = useState<Conversation[]>([]);
  const [stats, setStats] = useState({ chat: 0, ppt: 0, video: 0, image: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentActivities(data || []);

      // Calculate stats
      const { data: allData } = await supabase
        .from('conversations')
        .select('type');

      if (allData) {
        const counts = { chat: 0, ppt: 0, video: 0, image: 0 };
        allData.forEach(item => {
          if (item.type in counts) {
            counts[item.type as keyof typeof counts]++;
          }
        });
        setStats(counts);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
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

  const userName = user.email?.split('@')[0] || "User";

  const quickActions = [
    {
      icon: MessageSquare,
      title: "AI Chat",
      description: "Start a conversation with AI",
      href: "/chat",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: FileText,
      title: "AI PPT",
      description: "Generate presentations",
      href: "/ppt",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      icon: Video,
      title: "AI Video",
      description: "Create AI videos",
      href: "/video",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: ImageIcon,
      title: "Image Generator",
      description: "Generate & search images",
      href: "/images",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  const statItems = [
    { label: "Chats", value: stats.chat.toString(), icon: MessageSquare },
    { label: "PPTs Created", value: stats.ppt.toString(), icon: FileText },
    { label: "Videos", value: stats.video.toString(), icon: Video },
    { label: "Images", value: stats.image.toString(), icon: ImageIcon },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'chat': return MessageSquare;
      case 'ppt': return FileText;
      case 'video': return Video;
      case 'image': return ImageIcon;
      default: return MessageSquare;
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-bold">
            Welcome back, <span className="text-primary">{userName}</span>!
          </h2>
          <p className="text-muted-foreground">
            What would you like to create today?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map((action) => (
            <Card 
              key={action.title}
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
              onClick={() => navigate(action.href)}
            >
              <CardContent className="p-4 md:p-6 flex flex-col items-center text-center gap-3">
                <div className={`p-3 rounded-xl ${action.bgColor}`}>
                  <action.icon className={`h-6 w-6 md:h-8 md:w-8 ${action.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">{action.title}</h3>
                  <p className="text-xs text-muted-foreground hidden md:block">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {statItems.map((stat) => (
            <Card key={stat.label} className="bg-card/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  No recent activity
                </div>
              ) : (
                recentActivities.map((activity) => {
                  const Icon = getIcon(activity.type);
                  return (
                    <div 
                      key={activity.id} 
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Events
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>
                  View Calendar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">No upcoming events</p>
                <Button variant="link" size="sm" onClick={() => navigate('/calendar')}>
                  Add an event
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Suggestion Card */}
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
          <CardContent className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-semibold text-lg">Try AI PPT Generator</h3>
              <p className="text-sm text-muted-foreground">
                Create professional presentations in seconds. Just describe your topic!
              </p>
            </div>
            <Button onClick={() => navigate('/ppt')} className="shrink-0">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Home;
