/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // aqua ramp for the "sparkling water" brand
        brand: {
          50: "#f0faff",
          100: "#dff4ff",
          200: "#b8ecff",
          300: "#78dcff",
          400: "#31c8f7",
          500: "#06aee4",
          600: "#008cc7",
          700: "#0070a1",
          800: "#075e85",
          900: "#0c4e6e",
          950: "#083249",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Segoe UI",
          "Roboto",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(8 50 73 / 0.04), 0 4px 16px rgb(8 50 73 / 0.06)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out both",
        "fade-up": "fade-up 0.35s ease-out both",
        "scale-in": "scale-in 0.18s ease-out both",
        float: "float 8s ease-in-out infinite",
        "float-slow": "float 12s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
