import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-2">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <Button asChild variant="outline">
            <Link to="/" data-testid="link-home">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button asChild>
            <Link to="/organizations" data-testid="link-organizations">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Organizations
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}