import type React from "react"
import "~/components/guest/globals.css";
import { Inter } from "next/font/google"
import type { Metadata } from "next"
import { ThemeProvider } from "~/components/guest/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Creative Ai",
  description: "Boost productivity, reduce costs, and scale your business with our all-in-one Ai platform.",
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
