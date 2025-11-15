import { useCallback, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  preview?: string;
}

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  onFileRemove: (fileName: string) => void;
  files: UploadedFile[];
}

const FileUpload = ({ onFileUpload, onFileRemove, files }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setIsProcessing(true);
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

        // Analyze file using edge function
        try {
          const { data, error } = await supabase.functions.invoke('analyze-file', {
            body: {
              fileName: file.name,
              fileContent: content,
              fileType: file.type,
            },
          });

          if (error) throw error;
          
          console.log('File analyzed:', data);
        } catch (err) {
          console.error('File analysis error:', err);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to process file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
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
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed rounded-2xl p-4 text-center transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isProcessing ? 'Processing...' : 'Drag & drop files or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOC, TXT, CSV, XLS, PPT, Images
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
            >
              {file.preview ? (
                <img 
                  src={file.preview} 
                  alt={file.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : file.type.startsWith('image/') ? (
                <ImageIcon className="h-10 w-10 text-primary" />
              ) : (
                <FileText className="h-10 w-10 text-primary" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onFileRemove(file.name)}
                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
