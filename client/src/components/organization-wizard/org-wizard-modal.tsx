import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X } from "lucide-react";
import { PrimaryStep } from "./primary-step";
import { BrandingStep } from "./branding-step";
import { SportsContactsStep } from "./sports-contacts-step";
import { type CreateOrgFormData } from "./types";

interface OrgWizardModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OrgWizardModal({ open, onClose, onSuccess }: OrgWizardModalProps) {
  const [activeTab, setActiveTab] = useState("primary");
  const [formData, setFormData] = useState<Partial<CreateOrgFormData>>({
    is_business: false,
    country: "United States",
    sports: [],
    brand_primary: "#3B82F6",
    brand_secondary: "#8B5CF6",
  });

  const updateFormData = (data: Partial<CreateOrgFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleSuccess = () => {
    setFormData({
      is_business: false,
      country: "United States",
      sports: [],
      brand_primary: "#3B82F6",
      brand_secondary: "#8B5CF6",
    });
    setActiveTab("primary");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900/95 border-white/20 backdrop-blur-xl max-w-[95vw] sm:max-w-4xl max-h-[90vh] p-0">
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white text-xl font-semibold">
                  Create New Organization
                </DialogTitle>
                <DialogDescription className="text-white/70 mt-1">
                  Upload a logo and fill in primary details, branding, and contact information.
                </DialogDescription>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors"
                data-testid="button-close-wizard"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          {/* Wizard Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              {/* Scrollable Tab Bar */}
              <div className="border-b border-white/10 px-4">
                <ScrollArea>
                  <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 h-12">
                    <TabsTrigger
                      value="primary"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white text-white/70"
                      data-testid="tab-primary"
                    >
                      Primary
                    </TabsTrigger>
                    <TabsTrigger
                      value="branding"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500/20 data-[state=active]:to-purple-500/20 data-[state=active]:text-white text-white/70"
                      data-testid="tab-branding"
                    >
                      Branding
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="primary" className="mt-0">
                  <PrimaryStep
                    formData={formData}
                    updateFormData={updateFormData}
                    onNext={() => setActiveTab("branding")}
                  />
                </TabsContent>

                <TabsContent value="branding" className="mt-0">
                  <BrandingStep
                    formData={formData}
                    updateFormData={updateFormData}
                    onNext={handleSuccess}
                    onPrev={() => setActiveTab("primary")}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}