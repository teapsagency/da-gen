"use client";

import "./globals.css";
import { useEffect, useState } from "react";
import { useDAStore } from "@/store/daStore";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme = useDAStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html
      lang="fr"
      data-theme={mounted ? theme : "light"}
      className={mounted && theme === "dark" ? "dark" : ""}
      suppressHydrationWarning
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
