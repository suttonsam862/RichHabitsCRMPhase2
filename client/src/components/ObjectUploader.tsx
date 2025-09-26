import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ObjectUploaderProps {
  onUploadComplete?: (url: string) => void;
  currentImageUrl?: string;
  organizationId?: string;
  className?: string;
  children?: ReactNode;
}

export function ObjectUploader({
  onUploadComplete,
  currentImageUrl,
  organizationId,
  className = "",
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  // Get displayable URL - now simplified since we store full URLs
  const getDisplayUrl = (url: string | undefined | null) => {
    if (!url) return null;
    
    // If it's already a full URL, use it directly
    if (url.startsWith("http")) return url;
    
    // Legacy support: convert old storage paths to public URLs
    if (url.startsWith("org/") || url.startsWith("app/")) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const displayUrl = `${supabaseUrl}/storage/v1/object/public/app/${url}`;
      console.log("Converting legacy storage path to URL:", url, "->", displayUrl);
      return displayUrl;
    }
    
    return url;
  };

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getDisplayUrl(currentImageUrl),
  );

  // Update preview URL when currentImageUrl prop changes
  useEffect(() => {
    const newDisplayUrl = getDisplayUrl(currentImageUrl);
    setPreviewUrl(newDisplayUrl);
  }, [currentImageUrl]);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file) {
      console.warn("No file provided to upload");
      return;
    }

    // Defensive file validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ];

    if (file.size > maxSize) {
      console.error("File too large:", file.size);
      onUploadComplete?.("");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      console.error("Invalid file type:", file.type);
      onUploadComplete?.("");
      return;
    }

    try {
      setIsUploading(true);
      console.log("Starting upload for:", file.name, "size:", file.size);

      // Get upload URL using unified assets endpoint
      let uploadResponse;
      try {
        uploadResponse = await apiRequest(`/v1/organizations/${organizationId}/assets/upload`, {
          method: "POST",
          data: {
            filename: file.name,
          },
        });
      } catch (apiError) {
        console.error(
          "API request failed for assets upload endpoint:",
          apiError,
        );
        throw new Error("Failed to get upload URL from API");
      }

      if (!uploadResponse?.success || !uploadResponse.uploadUrl) {
        console.error("Invalid upload response:", uploadResponse);
        throw new Error("Invalid upload URL response");
      }

      console.log("Got upload URL, proceeding with file upload");

      // Upload file with enhanced timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        const uploadResult = await fetch(uploadResponse.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log("Upload request completed with status:", uploadResult.status);

        if (!uploadResult.ok) {
          const responseText = await uploadResult.text().catch(() => 'Unknown error');
          console.error("Upload failed:", {
            status: uploadResult.status,
            statusText: uploadResult.statusText,
            response: responseText,
            url: uploadResponse.uploadUrl
          });
          throw new Error(`Upload failed with status: ${uploadResult.status} - ${responseText}`);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
          console.error("Upload timeout after 30 seconds");
          throw new Error("Upload timeout - please try again with a smaller file");
        }
        throw error;
      }

      console.log("Upload successful, now updating organization logo");

      // Update the organization logo with the full public URL
      const updateResponse = await apiRequest(`/v1/organizations/${organizationId}/logo/update`, {
        method: "POST",
        data: {
          logoUrl: uploadResponse.publicUrl,
        },
      });

      if (!updateResponse?.success) {
        console.warn("Failed to update organization logo in database, but upload succeeded");
      }

      // Use the full public URL from the API response
      const finalUrl = uploadResponse.publicUrl || "";

      console.log("Using public URL as final URL:", finalUrl);

      // Update preview immediately with the uploaded file
      const displayUrl = getDisplayUrl(finalUrl);
      console.log("Setting preview URL:", displayUrl);
      setPreviewUrl(displayUrl);

      onUploadComplete?.(finalUrl);
      setIsUploading(false);
    } catch (error) {
      console.error("Logo upload error:", error);
      setIsUploading(false);
      onUploadComplete?.("");
      // Always call completion even on error to reset UI state
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
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

    // Directly call the new handleUpload function
    await handleUpload(file);

    // Reset the input value so the same file can be uploaded again if needed
    event.target.value = "";
  };

  const clearImage = () => {
    setPreviewUrl(null);
    onUploadComplete?.("");
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
                {isUploading ? "Uploading..." : children || "Upload Image"}
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}
