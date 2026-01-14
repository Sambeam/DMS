/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    "bg-gradient-to-br",
    "from-blue-500", "to-blue-600",
    "from-purple-500", "to-purple-600",
    "from-orange-500", "to-orange-600",
    "from-green-500", "to-green-600",
  ],
  theme: { extend: {} },
  plugins: [],
};

