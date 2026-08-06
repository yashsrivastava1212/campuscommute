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
        navy: {
          DEFAULT: "#0F172A",
          muted: "#1E293B",
        },
        emerald: {
          DEFAULT: "#10B981",
          dark: "#059669",
          light: "#D1FAE5",
        },
        amber: {
          accent: "#F59E0B",
          light: "#FEF3C7",
        },
        background: {
          DEFAULT: "#F8FAFC",
          warm: "#F7F8F6",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F1F5F9",
        },
        border: {
          DEFAULT: "#E2E8F0",
          hover: "#CBD5E1",
        },
        on: {
          surface: "#0F172A",
          variant: "#64748B",
        },
        muted: "#94A3B8",
        error: {
          DEFAULT: "#EF4444",
          container: "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-lg": ["18px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      maxWidth: {
        container: "1120px",
        form: "720px",
      },
      spacing: {
        sidebar: "260px",
        gutter: "24px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
