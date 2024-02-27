const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', ...defaultTheme.fontFamily.sans],
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};

module.exports = config;