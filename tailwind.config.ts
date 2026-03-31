module.exports = {
  darkMode: "class",
  plugins: [require("@tailwindcss/typography")],
  theme: {
    extend: {
      animation: {
        "slide": "slide 0.4 ease-in-out",
      },
      keyframes: {
        slide: {
          '0%': { transform: 'translateX(5px)' },
          '50%': { transform: 'translateX(-5px)' },
          '100%': { transform: 'translateX(0)' },
        }
      },
      boxShadow: {
        'darkShadow': '0 1px 3px 0 rgb(255 255 255 / 0.6), 0 1px 2px -1px rgb(255 255 255 / 0.6)',
      }
    },
  },
};
