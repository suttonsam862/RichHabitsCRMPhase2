// DEPRECATED: Old Wouter routing system replaced by centralized routes.tsx
// See client/src/routes.tsx for all routing configuration
// import { Route, Switch } from "wouter";

import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
// import { AppRoutes } from "./routes"; // Routes removed during cleanup
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";

// DEPRECATED: Replaced by centralized routing in routes.tsx
// function Router() {
//   return (
//     <AppLayout>
//       <AnimatePresence mode="wait">
//         <RouteTransition>
//           <Switch>
//             {/* All routes moved to routes.tsx for centralized management */}
//           </Switch>
//         </RouteTransition>
//       </AnimatePresence>
//     </AppLayout>
//   );
// }

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          {/* <AppRoutes /> */}
          <div>Application routes removed during cleanup</div>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;