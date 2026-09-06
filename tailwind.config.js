/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                border: "hsl(var(--border) / <alpha-value>)",
                input: "hsl(var(--input) / <alpha-value>)",
                ring: "hsl(var(--ring) / <alpha-value>)",
                background: {
                    DEFAULT: "hsl(var(--background) / <alpha-value>)",
                    secondary: "hsl(var(--background-secondary) / <alpha-value>)",
                    tertiary: "hsl(var(--background-tertiary) / <alpha-value>)",
                },
                foreground: "hsl(var(--foreground) / <alpha-value>)",
                primary: {
                    DEFAULT: "hsl(var(--primary) / <alpha-value>)",
                    foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
                    hover: "hsl(var(--primary-hover) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
                    foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
                    foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
                    hover: "hsl(var(--destructive-hover) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted) / <alpha-value>)",
                    foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent) / <alpha-value>)",
                    foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover) / <alpha-value>)",
                    foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
                },
                card: {
                    DEFAULT: "hsl(var(--card) / <alpha-value>)",
                    foreground: "hsl(var(--card-foreground) / <alpha-value>)",
                },
                surface: {
                    DEFAULT: "hsl(var(--surface) / <alpha-value>)",
                    elevated: "hsl(var(--surface-elevated) / <alpha-value>)",
                    hover: "hsl(var(--surface-hover) / <alpha-value>)",
                },
                success: {
                    DEFAULT: "hsl(var(--success) / <alpha-value>)",
                    foreground: "hsl(var(--success-foreground) / <alpha-value>)",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning) / <alpha-value>)",
                    foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
                },
                info: {
                    DEFAULT: "hsl(var(--info) / <alpha-value>)",
                    foreground: "hsl(var(--info-foreground) / <alpha-value>)",
                },
                overlay: "hsl(var(--overlay) / <alpha-value>)",
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
                    foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
                    accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
                    "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
                    border: "hsl(var(--sidebar-border) / <alpha-value>)",
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)'],
            },
            borderRadius: {
                lg: "0.75rem", // 12px
                md: "calc(0.75rem - 2px)",
                sm: "calc(0.75rem - 4px)",
            },
        },
    },
    plugins: [],
};
