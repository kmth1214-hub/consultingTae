// Keep the root package compatible with the existing CommonJS engine tests.
module.exports = {
  publicDir: false,
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0
  }
};
