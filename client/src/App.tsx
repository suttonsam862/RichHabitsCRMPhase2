import { Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { RouteTransition } from "@/components/route-transition";
import { AppLayout } from "@/layouts/AppLayout";
import Home from "./pages/index";
import Organizations from "./pages/organizations-enhanced";
import OrderDetails from "./pages/order-details";
import NotFound from "./pages/not-found";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";

function Router() {
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <RouteTransition>
          <Switch>
            {/* Main Organizations page */}
            <Route path="/" component={Home} />
            <Route path="/organizations" component={Organizations} />

            {/* Order details page */}
            <Route path="/orders/:id" component={OrderDetails} />

            {/* Future routes - commented for now */}
            {/* <Route path="/orders" component={Orders}/> */}
            {/* <Route path="/designs" component={Designs}/> */}

            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
        </RouteTransition>
      </AnimatePresence>
    </AppLayout>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;