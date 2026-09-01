const { resolve } = require('path');
const { defineConfig } = require('vite');

module.exports = defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        loodgieterswerk: resolve(__dirname, 'diensten/loodgieterswerk.html'),
        installatietechniek: resolve(__dirname, 'diensten/installatietechniek.html'),
        sanitair: resolve(__dirname, 'diensten/sanitair.html'),
        onderhoud: resolve(__dirname, 'diensten/onderhoud.html'),
      },
    },
  },
});
