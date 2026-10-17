/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0F11",
        steel: "#1B1E22",
        graphite: "#2A2E34",
        bone: "#F4F1EA",
        paper: "#FBFAF7",
        line: "#D8D2C4",
        brass: { DEFAULT: "#A9834A", light: "#C9A46E", deep: "#7D5F33" },
      },
      fontFamily: {
        display: ['"Archivo"', "system-ui", "sans-serif"],
        body: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: { technical: "0.14em" },
    },
  },
  plugins: [],
};
