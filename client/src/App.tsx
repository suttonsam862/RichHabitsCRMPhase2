import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Organizations from "@/pages/organizations";
import OrderDetails from "@/pages/order-details";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Main Organizations page */}
      <Route path="/" component={Organizations} />
      <Route path="/organizations" component={Organizations} />
      
      {/* Order details page */}
      <Route path="/orders/:id" component={OrderDetails} />
      
      {/* Future routes - commented for now */}
      {/* <Route path="/orders" component={Orders}/> */}
      {/* <Route path="/designs" component={Designs}/> */}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
