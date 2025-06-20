import "~/styles/globals.css";
import "~/components/guest/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "~/components/guest/theme-provider";
import { Providers } from "~/components/providers";
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
      <body className={inter.className}>
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
