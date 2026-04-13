/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./*.{ts,tsx}", "./react-app/**/*.{ts,tsx}", "./contents/**/*.ts"],
  theme: {
    extend: {},
  },
  plugins: [],
}

