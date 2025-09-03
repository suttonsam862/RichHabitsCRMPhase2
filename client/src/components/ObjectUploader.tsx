import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  onUploadComplete?: (url: string) => void;
  currentImageUrl?: string;
  organizationId?: string;
  className?: string;
  children?: ReactNode;
}

export function ObjectUploader({ onUploadComplete, currentImageUrl, organizationId, className = "", children }: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Simplified approach: Use the working objects/upload endpoint for now
      // Step 1: Get upload URL
      const uploadUrlResponse = await apiRequest('/api/v1/objects/upload', {
        method: 'POST',
        data: {
          fileName: file.name,
          organizationId: organizationId || 'default'
        }
      });

      if (!uploadUrlResponse.uploadURL) {
        throw new Error('Failed to get upload URL');
      }

      // Step 2: Upload file using the URL
      const uploadResponse = await fetch(uploadUrlResponse.uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Get the object key for the uploaded file
      const objectKey = uploadUrlResponse.objectKey;
      
      // Step 4: Set preview to show the logo via the organization endpoint
      const previewUrl = organizationId ? 
        `/api/v1/organizations/${organizationId}/logo?v=${Date.now()}` : 
        objectKey;
      
      setPreviewUrl(previewUrl);
      onUploadComplete?.(objectKey);

      toast({
        title: "Upload successful", 
        description: "Your logo has been uploaded successfully.",
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    setPreviewUrl(null);
    onUploadComplete?.('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {previewUrl ? (
        <div className="relative group">
          <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-cyan-500/30">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearImage}
                className="text-white hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-24 border-2 border-dashed border-cyan-500/30 hover:border-cyan-500/50 bg-black/20 hover:bg-black/30"
            disabled={isUploading}
          >
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400" />
              ) : (
                <Upload className="h-6 w-6 text-cyan-400" />
              )}
              <span className="text-sm text-white/70">
                {isUploading ? 'Uploading...' : children || 'Upload Image'}
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
