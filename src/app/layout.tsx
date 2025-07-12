import "~/styles/globals.css";
import "~/components/guest/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "~/components/guest/theme-provider";
import { Providers } from "~/components/providers";
import { ClientErrorHandler } from "~/components/client/error-handler";
import { auth } from "~/server/auth";

export const metadata: Metadata = {
  title: "CreativeAI",
  description:
    "Boost productivity, reduce costs, and scale your business with our all-in-one Ai platform.",
  icons: [{ rel: "icon", url: "/CreativeAi.png" }],
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Early error suppression for browser extensions
              (function() {
                // Override console.error immediately
                const originalError = console.error;
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (message.includes('Failed to parse selector') || 
                      message.includes(':has-text') || 
                      message.includes('content-scripts.js') ||
                      message.includes('parseSelector') ||
                      message.includes('##body:has-text')) {
                    return; // Suppress extension errors
                  }
                  originalError.apply(console, args);
                };

                // Override window.onerror immediately
                window.onerror = function(msg, url, line, col, error) {
                  if (typeof msg === 'string' && (
                    msg.includes('Failed to parse selector') ||
                    msg.includes(':has-text') ||
                    msg.includes('parseSelector') ||
                    msg.includes('##body:has-text')
                  )) {
                    return true; // Suppress the error
                  }
                  if (typeof url === 'string' && url.includes('content-scripts.js')) {
                    return true; // Suppress extension script errors
                  }
                  return false; // Let other errors through
                };

                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  const reason = event.reason;
                  let message = '';
                  
                  if (reason && typeof reason === 'object' && reason.message) {
                    message = reason.message;
                  } else if (typeof reason === 'string') {
                    message = reason;
                  }
                  
                  if (message.includes('Failed to parse selector') ||
                      message.includes(':has-text') ||
                      message.includes('parseSelector') ||
                      message.includes('##body:has-text')) {
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <ClientErrorHandler />
        <Providers session={session}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
