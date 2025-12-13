import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Wand2, Download, Copy, ChevronLeft, ChevronRight, Loader2, Sparkles, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PPTSlidePreview from "@/components/ppt/PPTSlidePreview";
import PPTSettingsPanel from "@/components/ppt/PPTSettingsPanel";

export interface Slide {
  slideNumber: number;
  title: string;
  bullets: string[];
  speakerNotes: string;
  visualSuggestion?: string;
}

export interface PPTSettings {
  presentationType: "academic" | "business" | "technical" | "marketing" | "training";
  audienceLevel: "school" | "college" | "professionals" | "executives";
  intent: "inform" | "persuade" | "explain" | "pitch";
  tone: "simple" | "professional" | "academic" | "executive";
  slideCount: number;
  theme: "corporate" | "minimal" | "startup" | "dark" | "creative";
  contentDepth: "basic" | "medium" | "detailed";
  includeSpeakerNotes: boolean;
}

const defaultSettings: PPTSettings = {
  presentationType: "business",
  audienceLevel: "professionals",
  intent: "inform",
  tone: "professional",
  slideCount: 12,
  theme: "corporate",
  contentDepth: "medium",
  includeSpeakerNotes: true,
};

const PPTPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [settings, setSettings] = useState<PPTSettings>(defaultSettings);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const generatePPT = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic for your presentation");
      return;
    }

    setIsGenerating(true);
    setSlides([]);
    setCurrentSlide(0);

    try {
      const { data, error } = await supabase.functions.invoke('generate-ppt', {
        body: {
          topic: topic.trim(),
          additionalContext: additionalContext.trim(),
          settings,
        },
      });

      if (error) throw error;
      
      if (data?.slides) {
        setSlides(data.slides);
        
        // Save to conversations
        await supabase.from('conversations').insert([{
          user_id: user?.id,
          title: topic.trim().substring(0, 100),
          type: 'ppt',
        }]);
        
        toast.success("Presentation generated successfully!");
      }
    } catch (error) {
      console.error('Error generating PPT:', error);
      toast.error("Failed to generate presentation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const copySlideContent = (slide: Slide) => {
    const content = `${slide.title}\n\n${slide.bullets.map(b => `• ${b}`).join('\n')}${slide.speakerNotes ? `\n\nSpeaker Notes:\n${slide.speakerNotes}` : ''}`;
    navigator.clipboard.writeText(content);
    toast.success("Slide content copied to clipboard");
  };

  const copyAllSlides = () => {
    const content = slides.map(slide => 
      `Slide ${slide.slideNumber}: ${slide.title}\n\n${slide.bullets.map(b => `• ${b}`).join('\n')}${slide.speakerNotes ? `\n\nSpeaker Notes:\n${slide.speakerNotes}` : ''}`
    ).join('\n\n---\n\n');
    navigator.clipboard.writeText(content);
    toast.success("All slides copied to clipboard");
  };

  const downloadAsPPTX = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-pptx', {
        body: { slides, settings },
      });

      if (error) throw error;

      if (data?.fileUrl) {
        const link = document.createElement('a');
        link.href = data.fileUrl;
        link.download = `${topic.substring(0, 30)}.pptx`;
        link.click();
        toast.success("PowerPoint file downloaded!");
      } else if (data?.base64) {
        const blob = base64ToBlob(data.base64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${topic.substring(0, 30)}.pptx`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("PowerPoint file downloaded!");
      }
    } catch (error) {
      console.error('Error downloading PPTX:', error);
      toast.error("Download feature coming soon! Use copy for now.");
    }
  };

  const base64ToBlob = (base64: string, type: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
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

  return (
    <AppLayout>
      <div className="h-full flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Input Panel */}
          <div className={cn(
            "w-full lg:w-96 border-r border-border bg-card flex flex-col transition-all",
            slides.length > 0 && "lg:w-80"
          )}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">AI PPT Generator</h1>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic">Presentation Topic *</Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="E.g., AI in Healthcare: Transforming Patient Care"
                    rows={3}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="context">Additional Context (Optional)</Label>
                  <Textarea
                    id="context"
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="Target audience, specific points to cover, industry focus..."
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={() => setShowSettings(!showSettings)}
                  variant="outline"
                  className="w-full"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  {showSettings ? "Hide" : "Show"} Advanced Settings
                </Button>

                {showSettings && (
                  <PPTSettingsPanel settings={settings} onSettingsChange={setSettings} />
                )}

                <Button
                  onClick={generatePPT}
                  disabled={isGenerating || !topic.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Presentation
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Slide Navigator */}
            {slides.length > 0 && (
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm">Slides ({slides.length})</h3>
                    <Button variant="ghost" size="sm" onClick={copyAllSlides}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy All
                    </Button>
                  </div>
                  {slides.map((slide, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-colors",
                        currentSlide === index
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {slide.slideNumber}
                        </span>
                        <span className="text-sm font-medium truncate">
                          {slide.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Preview Panel */}
          <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
            {slides.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Create Your Presentation</h2>
                  <p className="text-muted-foreground">
                    Enter a topic and let AI generate a professional presentation for you.
                    Customize settings to match your needs.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Slide Preview */}
                <div className="flex-1 p-4 md:p-8 overflow-auto">
                  <PPTSlidePreview 
                    slide={slides[currentSlide]} 
                    theme={settings.theme}
                    onCopy={() => copySlideContent(slides[currentSlide])}
                  />
                </div>

                {/* Navigation */}
                <div className="p-4 border-t border-border bg-card">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                      disabled={currentSlide === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Slide {currentSlide + 1} of {slides.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={downloadAsPPTX}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                        disabled={currentSlide === slides.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PPTPage;
