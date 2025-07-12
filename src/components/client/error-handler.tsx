"use client";

import { useEffect } from "react";

export function ClientErrorHandler() {
  useEffect(() => {
    // Handle browser extension CSS selector errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message;
      
      // Suppress browser extension selector parsing errors
      if (
        message &&
        (message.includes("Failed to parse selector") ||
         message.includes(":has-text") ||
         message.includes("content-scripts.js"))
      ) {
        event.preventDefault();
        event.stopPropagation();
        console.warn("Suppressed browser extension selector error:", message);
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      
      if (
        reason &&
        reason.message &&
        (reason.message.includes("Failed to parse selector") ||
         reason.message.includes(":has-text") ||
         reason.message.includes("content-scripts.js"))
      ) {
        event.preventDefault();
        console.warn("Suppressed browser extension promise rejection:", reason.message);
        return false;
      }
    };

    // Add event listeners
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
