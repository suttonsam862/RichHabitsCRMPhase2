import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { AppRoutes } from "./routes";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import DevOverlay from '@/components/DevOverlay';
import SentryErrorBoundary from '@/components/SentryErrorBoundary';

function App() {
  return (
    <SentryErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
            <DevOverlay />
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </SentryErrorBoundary>
  );
}

export default App;