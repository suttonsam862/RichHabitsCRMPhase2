import React from 'react';

interface PrintLayoutProps {
  children: React.ReactNode;
}

/**
 * Minimal layout for print/export routes
 * No navigation, sidebar, or app chrome - just clean content
 */
export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="w-full max-w-none p-8 print:p-0 print:max-w-none">
        {children}
      </div>
      
      {/* Print-specific styles */}
      <style>
        {`
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
          }
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}