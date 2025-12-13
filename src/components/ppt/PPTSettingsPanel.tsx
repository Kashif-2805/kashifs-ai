import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { PPTSettings } from "@/pages/PPT";

interface PPTSettingsPanelProps {
  settings: PPTSettings;
  onSettingsChange: (settings: PPTSettings) => void;
}

const PPTSettingsPanel = ({ settings, onSettingsChange }: PPTSettingsPanelProps) => {
  const updateSetting = <K extends keyof PPTSettings>(key: K, value: PPTSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Presentation Type</Label>
          <Select
            value={settings.presentationType}
            onValueChange={(v) => updateSetting("presentationType", v as PPTSettings["presentationType"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="business">Business / Pitch</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="training">Training / Workshop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Audience Level</Label>
          <Select
            value={settings.audienceLevel}
            onValueChange={(v) => updateSetting("audienceLevel", v as PPTSettings["audienceLevel"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="professionals">Professionals</SelectItem>
              <SelectItem value="executives">Executives</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Intent</Label>
          <Select
            value={settings.intent}
            onValueChange={(v) => updateSetting("intent", v as PPTSettings["intent"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inform">Inform</SelectItem>
              <SelectItem value="persuade">Persuade</SelectItem>
              <SelectItem value="explain">Explain</SelectItem>
              <SelectItem value="pitch">Pitch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Tone</Label>
          <Select
            value={settings.tone}
            onValueChange={(v) => updateSetting("tone", v as PPTSettings["tone"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(v) => updateSetting("theme", v as PPTSettings["theme"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corporate">Business Corporate</SelectItem>
              <SelectItem value="minimal">Education Minimal</SelectItem>
              <SelectItem value="startup">Startup Pitch</SelectItem>
              <SelectItem value="dark">Dark Mode</SelectItem>
              <SelectItem value="creative">Creative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Content Depth</Label>
          <Select
            value={settings.contentDepth}
            onValueChange={(v) => updateSetting("contentDepth", v as PPTSettings["contentDepth"])}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs">Number of Slides</Label>
          <span className="text-sm font-medium">{settings.slideCount}</span>
        </div>
        <Slider
          value={[settings.slideCount]}
          onValueChange={(v) => updateSetting("slideCount", v[0])}
          min={5}
          max={30}
          step={1}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Include Speaker Notes</Label>
        <Switch
          checked={settings.includeSpeakerNotes}
          onCheckedChange={(v) => updateSetting("includeSpeakerNotes", v)}
        />
      </div>
    </div>
  );
};

export default PPTSettingsPanel;
