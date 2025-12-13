import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Slide } from "@/pages/PPT";

interface PPTSlidePreviewProps {
  slide: Slide;
  theme: string;
  onCopy: () => void;
}

const themeStyles: Record<string, { bg: string; titleColor: string; textColor: string; accent: string }> = {
  corporate: {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100",
    titleColor: "text-slate-900",
    textColor: "text-slate-700",
    accent: "bg-blue-600",
  },
  minimal: {
    bg: "bg-white",
    titleColor: "text-gray-900",
    textColor: "text-gray-600",
    accent: "bg-gray-800",
  },
  startup: {
    bg: "bg-gradient-to-br from-violet-50 to-purple-50",
    titleColor: "text-violet-900",
    textColor: "text-violet-700",
    accent: "bg-violet-600",
  },
  dark: {
    bg: "bg-gradient-to-br from-slate-900 to-slate-800",
    titleColor: "text-white",
    textColor: "text-slate-300",
    accent: "bg-cyan-500",
  },
  creative: {
    bg: "bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50",
    titleColor: "text-orange-900",
    textColor: "text-orange-800",
    accent: "bg-orange-500",
  },
};

const PPTSlidePreview = ({ slide, theme, onCopy }: PPTSlidePreviewProps) => {
  const styles = themeStyles[theme] || themeStyles.corporate;

  return (
    <div className="space-y-4">
      {/* Slide Card */}
      <Card className={cn("aspect-video overflow-hidden shadow-lg", styles.bg)}>
        <CardContent className="h-full p-6 md:p-10 flex flex-col">
          {/* Slide Number Indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className={cn("w-12 h-1 rounded-full", styles.accent)} />
            <span className={cn("text-xs font-medium", styles.textColor)}>
              Slide {slide.slideNumber}
            </span>
          </div>

          {/* Title */}
          <h2 className={cn("text-2xl md:text-4xl font-bold mb-6", styles.titleColor)}>
            {slide.title}
          </h2>

          {/* Bullets */}
          <div className="flex-1 space-y-3">
            {slide.bullets.map((bullet, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", styles.accent)} />
                <p className={cn("text-base md:text-lg", styles.textColor)}>
                  {bullet}
                </p>
              </div>
            ))}
          </div>

          {/* Visual Suggestion */}
          {slide.visualSuggestion && (
            <div className={cn("mt-4 p-3 rounded-lg bg-black/5", theme === "dark" && "bg-white/10")}>
              <p className={cn("text-xs italic", styles.textColor)}>
                💡 Visual: {slide.visualSuggestion}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Slide
        </Button>
      </div>

      {/* Speaker Notes */}
      {slide.speakerNotes && (
        <Card className="bg-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h4 className="font-medium text-sm">Speaker Notes</h4>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {slide.speakerNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PPTSlidePreview;
