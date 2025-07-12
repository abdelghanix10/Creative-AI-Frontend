"use client";

import { useEffect } from "react";

export function ClientErrorHandler() {
  useEffect(() => {
    // Store original console.error to restore later if needed
    const originalConsoleError = console.error;

    // Override console.error to filter extension errors
    console.error = (...args: unknown[]) => {
      const message = args.join(' ');
      
      // Check if this is a browser extension error
      if (
        message.includes("Failed to parse selector") ||
        message.includes(":has-text") ||
        message.includes("content-scripts.js") ||
        message.includes("parseSelector") ||
        message.includes("##body:has-text")
      ) {
        // Suppress these extension errors - don't log them
        return;
      }
      
      // For all other errors, use the original console.error
      originalConsoleError.apply(console, args);
    };

    // Handle JavaScript errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message ?? '';
      const filename = event.filename ?? '';
      
      // Suppress browser extension selector parsing errors
      if (
        message.includes("Failed to parse selector") ||
        message.includes(":has-text") ||
        message.includes("parseSelector") ||
        filename.includes("content-scripts.js") ||
        message.includes("##body:has-text")
      ) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as unknown;
      let message = '';
      
      if (reason && typeof reason === 'object' && 'message' in reason) {
        message = (reason as Error).message ?? 'Error object without message';
      } else if (typeof reason === 'string') {
        message = reason;
      } else {
        message = 'Unknown error';
      }
      
      if (
        message.includes("Failed to parse selector") ||
        message.includes(":has-text") ||
        message.includes("content-scripts.js") ||
        message.includes("parseSelector") ||
        message.includes("##body:has-text")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return false;
      }
    };

    // Override window.onerror as well
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (
        (typeof message === 'string' && (
          message.includes("Failed to parse selector") ||
          message.includes(":has-text") ||
          message.includes("parseSelector") ||
          message.includes("##body:has-text")
        )) ||
        (typeof source === 'string' && source.includes("content-scripts.js"))
      ) {
        return true; // Prevent default error handling
      }
      
      // Call original handler for legitimate errors
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error) as boolean;
      }
      return false;
    };

    // Add event listeners
    window.addEventListener("error", handleError, true); // Use capture phase
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    // Cleanup function
    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
      
      // Restore original console.error and window.onerror
      console.error = originalConsoleError;
      window.onerror = originalOnError;
    };
  }, []);

  return null;
}
