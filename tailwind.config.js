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
                border: "#E2E8F0",
                input: "#E2E8F0",
                ring: "#3c83f6",
                background: {
                    DEFAULT: "#ffffff",
                    secondary: "#F8FAFC",
                    tertiary: "#F1F5F9",
                },
                foreground: "#0F172A",
                primary: {
                    DEFAULT: "#3c83f6", // Stitch Blue
                    foreground: "#ffffff",
                    hover: "#2563EB",
                },
                secondary: {
                    DEFAULT: "#F1F5F9",
                    foreground: "#0F172A",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "#F8FAFC",
                    foreground: "#64748B",
                },
                accent: {
                    DEFAULT: "#F1F5F9",
                    foreground: "#0F172A",
                },
                popover: {
                    DEFAULT: "#ffffff",
                    foreground: "#0F172A",
                },
                card: {
                    DEFAULT: "#ffffff",
                    foreground: "#0F172A",
                },
                text: {
                    primary: "#0F172A",
                    secondary: "#64748B",
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
