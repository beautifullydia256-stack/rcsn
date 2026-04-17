import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border, hsl(0 0% 90%))",
        muted: "var(--muted, hsl(0 0% 96%))",
        "muted-foreground": "var(--muted-foreground, hsl(0 0% 45%))",
        primary: "var(--primary, hsl(221 83% 53%))",
        "primary-foreground": "var(--primary-foreground, #fff)",
        destructive: "var(--destructive, hsl(0 84% 60%))",
        "destructive-foreground": "var(--destructive-foreground, #fff)",
        ring: "var(--ring, hsl(221 83% 53%))",
      },
      spacing: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
      padding: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
      margin: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
    },
  },
  plugins: [],
};
export default config;
