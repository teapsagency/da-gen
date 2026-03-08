"use client";

import "./globals.css";
import { useDAStore } from "@/store/daStore";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useDAStore((state) => state.theme);

  return (
    <html
      lang="fr"
      data-theme={theme}
      className={theme === "dark" ? "dark" : ""}
    >
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@900,700,500,300,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@900,800,700,500,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased selection:bg-foreground selection:text-background">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
