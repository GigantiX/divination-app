import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getThemePreference } from "@/app/actions/profile";
import { ThemeProvider, ThemeScript } from "@/components/theme-provider";
import { DEFAULT_THEME } from "@/lib/theme";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Divination Dashboard",
    description: "Event Management Dashboard",
    icons: {
        icon: "/logo.svg",
        shortcut: "/logo.svg",
        apple: "/logo.svg",
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const persistedTheme = await getThemePreference();
    const initialTheme = persistedTheme ?? DEFAULT_THEME;
    const useStorageFallback = persistedTheme === null;

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <ThemeScript defaultTheme={initialTheme} useStorageFallback={useStorageFallback} />
            </head>
            <body
                suppressHydrationWarning
                className={cn(
                    "min-h-screen bg-background font-sans antialiased",
                    inter.variable
                )}
            >
                <ThemeProvider defaultTheme={initialTheme} useStorageFallback={useStorageFallback}>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
