import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Hydration guard (helps when extensions inject into <html>/<body>)
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Keep font variables exactly as before */}
        <style
          id="font-vars"
          // use DSIH to avoid minor whitespace diffs across server/client
          dangerouslySetInnerHTML={{
            __html: `
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
          `,
          }}
        />
      </head>

      {/* Hydration guard on body as well */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
