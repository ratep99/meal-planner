export default {
  plugins: {
    // Tailwind 4 ships its own PostCSS plugin and handles vendor prefixing,
    // so autoprefixer is no longer part of this pipeline.
    "@tailwindcss/postcss": {},
  },
};
