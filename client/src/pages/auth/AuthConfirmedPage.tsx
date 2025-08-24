import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sb } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Home } from 'lucide-react';

export function AuthConfirmedPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthConfirmation = async () => {
      try {
        const { data, error } = await sb.auth.getSession();
        
        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Your email has been confirmed successfully!');
          // Redirect to dashboard after a short delay
          setTimeout(() => navigate('/'), 2000);
        } else {
          setStatus('error');
          setMessage('No session found. Please try signing in again.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.message || 'Something went wrong');
      }
    };

    handleAuthConfirmation();
  }, [navigate]);

  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isLoading = status === 'loading';

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black/80 border-white/20">
        <CardHeader className="text-center">
          {isLoading && (
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
              <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {isSuccess && (
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          )}
          {isError && (
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
          )}
          <CardTitle className="text-xl text-white">
            {isLoading && 'Confirming...'}
            {isSuccess && 'Email Confirmed!'}
            {isError && 'Confirmation Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-white/70 text-center">
            {isLoading && 'Please wait while we confirm your email...'}
            {message}
          </p>
          
          {(isSuccess || isError) && (
            <div className="flex flex-col gap-3">
              {isSuccess && (
                <p className="text-green-400 text-sm text-center">
                  Redirecting to dashboard...
                </p>
              )}
              <Button asChild className="w-full">
                <Link to={isSuccess ? "/" : "/login"} className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  {isSuccess ? 'Go to Dashboard' : 'Back to Login'}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}