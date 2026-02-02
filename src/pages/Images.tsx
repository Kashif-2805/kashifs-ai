import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Image as ImageIcon, 
  Download, 
  RefreshCw,
  Loader2,
  Wand2,
  Grid3X3,
  LayoutGrid
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GeneratedImage {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: Date;
}

const ImagesPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'single'>('grid');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const simulateProgress = async (duration: number) => {
    const steps = [
      { progress: 15, text: "Analyzing prompt..." },
      { progress: 30, text: "Preparing generation..." },
      { progress: 45, text: "Creating composition..." },
      { progress: 60, text: "Rendering details..." },
      { progress: 75, text: "Enhancing quality..." },
      { progress: 90, text: "Finalizing image..." },
      { progress: 100, text: "Complete!" },
    ];
    
    const stepDuration = duration / steps.length;
    
    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, stepDuration));
      setProgress(step.progress);
      setProgressText(step.text);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please describe the image you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setProgressText("Starting generation...");

    try {
      // Calculate a realistic delay (8-18 seconds, never exceeding 20)
      const generationTime = Math.min(8000 + Math.random() * 10000, 18000);
      
      // Start progress simulation
      const progressPromise = simulateProgress(generationTime);
      
      // Call the image generation API
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim() },
      });

      // Wait for progress animation to complete
      await progressPromise;

      if (response.error) throw response.error;

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        prompt: prompt.trim(),
        imageUrl: response.data.imageUrl,
        createdAt: new Date(),
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      setSelectedImage(newImage);
      setPrompt("");
      
      toast({
        title: "Image Generated!",
        description: "Your image has been created successfully",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setProgressText("");
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kashif-ai-${image.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Downloaded",
        description: "Image saved to your device",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download image",
        variant: "destructive",
      });
    }
  };

  const handleRegenerate = () => {
    if (selectedImage) {
      setPrompt(selectedImage.prompt);
      handleGenerate();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const samplePrompts = [
    "A futuristic city at sunset with flying cars",
    "A mystical forest with glowing mushrooms",
    "An astronaut riding a horse on Mars",
    "A cozy coffee shop in Paris during rain",
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">AI Image Generator</h1>
                <p className="text-sm text-muted-foreground">Create stunning images with AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Input Section */}
            <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
              <div className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to create... Be specific for better results!"
                  className="min-h-[100px] resize-none rounded-xl border-border bg-muted/50 focus-visible:ring-primary"
                  disabled={isGenerating}
                />
                
                {/* Sample Prompts */}
                {!isGenerating && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">Try:</span>
                    {samplePrompts.map((sample, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(sample)}
                        className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        {sample.length > 30 ? sample.slice(0, 30) + '...' : sample}
                      </button>
                    ))}
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                    className="flex-1 md:flex-none bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-primary-foreground h-12 px-8 rounded-xl"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generate Image
                      </>
                    )}
                  </Button>
                  
                  {/* View Mode Toggle */}
                  {generatedImages.length > 0 && (
                    <div className="flex gap-1 p-1 bg-muted rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "h-8 w-8 rounded-md",
                          viewMode === 'grid' && "bg-background shadow-sm"
                        )}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewMode('single')}
                        className={cn(
                          "h-8 w-8 rounded-md",
                          viewMode === 'single' && "bg-background shadow-sm"
                        )}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {isGenerating && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{progressText}</span>
                      <span className="text-primary font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>

            {/* Generated Images */}
            {generatedImages.length > 0 ? (
              <div className="space-y-4">
                {/* Selected Image */}
                {selectedImage && viewMode === 'single' && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="aspect-square md:aspect-video relative">
                      <img
                        src={selectedImage.imageUrl}
                        alt={selectedImage.prompt}
                        className="w-full h-full object-contain bg-muted"
                      />
                    </div>
                    <div className="p-4 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-3">{selectedImage.prompt}</p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(selectedImage)}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          onClick={handleRegenerate}
                          variant="outline"
                          className="rounded-xl"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Grid View */}
                <div className={cn(
                  "grid gap-4",
                  viewMode === 'grid' 
                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                    : "grid-cols-4 md:grid-cols-6"
                )}>
                  {generatedImages.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className={cn(
                        "group relative rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:shadow-lg",
                        selectedImage?.id === image.id 
                          ? "border-primary shadow-lg" 
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <div className="aspect-square">
                        <img
                          src={image.imageUrl}
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-xs text-white line-clamp-2">{image.prompt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No images yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  Enter a prompt above to generate your first AI image
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ImagesPage;
