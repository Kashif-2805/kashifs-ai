import { useCallback, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2, CheckCircle2, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  preview?: string;
  analysis?: {
    topic: string;
    subtopics: string[];
    summary: string;
  };
}

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  onFileRemove: (fileName: string) => void;
  onFileAnalyzed?: (file: UploadedFile, analysis: { topic: string; subtopics: string[]; summary: string }) => void;
  files: UploadedFile[];
}

const FileUpload = ({ onFileUpload, onFileRemove, onFileAnalyzed, files }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const processFile = async (file: File) => {
    const fileName = file.name;
    setProcessingFiles(prev => new Set(prev).add(fileName));
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        const uploadedFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          content,
          preview: file.type.startsWith('image/') ? content : undefined,
        };

        onFileUpload(uploadedFile);

        // Analyze PDF files with AI
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            const { data, error } = await supabase.functions.invoke('analyze-file', {
              body: {
                fileName: file.name,
                fileContent: content,
                fileType: file.type,
                analyzeDeep: true,
              },
            });

            if (error) throw error;
            
            if (data?.analysis && onFileAnalyzed) {
              onFileAnalyzed(uploadedFile, data.analysis);
              toast({
                title: "PDF Analyzed",
                description: `Topic identified: ${data.analysis.topic}`,
              });
            }
          } catch (err) {
            console.error('PDF analysis error:', err);
            toast({
              title: "Analysis Complete",
              description: "File uploaded successfully",
            });
          }
        }
        
        setProcessingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileName);
          return next;
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process file",
        variant: "destructive",
      });
      setProcessingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(processFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(processFile);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: UploadedFile) => {
    if (file.preview) {
      return (
        <img 
          src={file.preview} 
          alt={file.name}
          className="h-12 w-12 rounded-lg object-cover"
        />
      );
    }
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-12 w-12 text-primary" />;
    }
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      return <FileType className="h-12 w-12 text-red-500" />;
    }
    return <FileText className="h-12 w-12 text-primary" />;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 ${
          isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif,.zip"
        />
        <label htmlFor="file-upload" className="cursor-pointer block">
          <div className={`mx-auto mb-3 h-14 w-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            <Upload className="h-7 w-7" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Drop files here or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOC, TXT, CSV, XLS, PPT, Images (JPG, PNG, WebP)
          </p>
          <p className="text-xs text-primary mt-2 font-medium">
            📄 PDFs will be analyzed for topic extraction & insights
          </p>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const isProcessing = processingFiles.has(file.name);
            
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow"
              >
                {getFileIcon(file)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    {isProcessing && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analyzing...
                      </span>
                    )}
                    {file.analysis && (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Analyzed
                      </span>
                    )}
                  </div>
                  {file.analysis && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      Topic: {file.analysis.topic}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileRemove(file.name)}
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
