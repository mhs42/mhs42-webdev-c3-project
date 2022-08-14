/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.{html,ejs}", "./resources/**/*.{html,js}"],
  theme: {
    minHeight: {
      'screen': '100vh',
    },
    extend: {},
  },
  plugins: [],
}
