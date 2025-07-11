import { Inngest } from "inngest";
import { env } from "~/env";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: "creative-ai",
  eventKey: env.INNGEST_EVENT_KEY ?? "local-dev-key",
  isDev: env.NODE_ENV === "development",
});
