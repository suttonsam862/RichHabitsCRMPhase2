import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Upload, X, Image as ImageIcon } from "lucide-react";
import { type CreateOrgFormData } from "./types";

const brandingSchema = z.object({
  brand_primary: z.string().optional(),
  brand_secondary: z.string().optional(),
});

interface BrandingStepProps {
  formData: Partial<CreateOrgFormData>;
  updateFormData: (data: Partial<CreateOrgFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function BrandingStep({ formData, updateFormData, onNext, onPrev }: BrandingStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(formData.logo_url || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brand_primary: formData.brand_primary || "#3B82F6",
      brand_secondary: formData.brand_secondary || "#8B5CF6",
    },
  });

  const handleLogoUpload = (logoUrl: string) => {
    if (logoUrl) {
      setLogoPreview(logoUrl);
      updateFormData({ 
        logo_url: logoUrl
      });
    } else {
      // Fallback to local preview on error
      console.log('📁 Falling back to local preview');
      const fileInput = fileInputRef.current;
      if (fileInput?.files?.[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setLogoPreview(e.target?.result as string);
        updateFormData({ logo_url: e.target?.result as string });
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    }
  };

  const removeLogo = () => {
    setLogoPreview(null);
    updateFormData({ logo_url: undefined, logo_file: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: z.infer<typeof brandingSchema>) => {
    updateFormData(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Branding</h3>
        <p className="text-white/70">Upload logo and set brand colors</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-4">
            <label className="text-white font-medium">Organization Logo</label>
            
            {logoPreview ? (
              <div className="relative w-32 h-32 mx-auto">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain rounded-lg border border-white/20 bg-white/5"
                  data-testid="img-logo-preview"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  data-testid="button-remove-logo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div
                className="w-full h-32 border-2 border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-white/50 transition-colors bg-white/5"
                onClick={() => fileInputRef.current?.click()}
                data-testid="div-logo-upload-area"
              >
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
                    <p className="text-white/70 text-sm">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 text-white/50 mb-2" />
                    <p className="text-white/70 text-sm">Click to upload logo</p>
                    <p className="text-white/50 text-xs mt-1">PNG, JPG, SVG up to 5MB</p>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input for fallback */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg"
              className="hidden"
              data-testid="input-logo-file"
            />

            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-white/20 text-white hover:bg-white/5"
                data-testid="button-upload-logo"
              >
                <Upload className="w-4 h-4 mr-2" />
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </Button>
            </div>
          </div>

          {/* Brand Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="brand_primary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Primary Brand Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 border-white/20 bg-transparent"
                        data-testid="input-brand-primary"
                        {...field}
                      />
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#3B82F6"
                        className="glass text-white border-white/20 focus:border-blue-400 flex-1"
                        data-testid="input-brand-primary-text"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="brand_secondary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Secondary Brand Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        className="w-12 h-10 p-1 border-white/20 bg-transparent"
                        data-testid="input-brand-secondary"
                        {...field}
                      />
                      <Input
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="#8B5CF6"
                        className="glass text-white border-white/20 focus:border-blue-400 flex-1"
                        data-testid="input-brand-secondary-text"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              onClick={onPrev}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/5"
              data-testid="button-prev-branding"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <Button
              type="submit"
              className="neon-button"
              data-testid="button-next-branding"
            >
              <div className="neon-button-inner flex items-center">
                Next: Sports & Contacts
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}