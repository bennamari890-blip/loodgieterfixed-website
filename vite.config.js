const { resolve } = require('path');
const { readFileSync, existsSync } = require('fs');
const { defineConfig } = require('vite');
const { sendContactRequest } = require('./api/_mail');

function loadLocalEnv() {
  const envPath = resolve(__dirname, '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
    });

    req.on('end', () => {
      try {
        resolveBody(raw ? JSON.parse(raw) : {});
      } catch (error) {
        rejectBody(error);
      }
    });

    req.on('error', rejectBody);
  });
}

module.exports = defineConfig({
  plugins: [
    {
      name: 'local-contact-api',
      configureServer(server) {
        loadLocalEnv();

        server.middlewares.use('/api/contact', async (req, res) => {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');

          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ message: 'Alleen POST aanvragen zijn toegestaan.' }));
            return;
          }

          try {
            const body = await readJsonBody(req);
            await sendContactRequest(body);
            res.statusCode = 200;
            res.end(JSON.stringify({ message: 'Aanvraag verzonden.' }));
          } catch (error) {
            res.statusCode = error.statusCode || 500;
            res.end(JSON.stringify({ message: error.message || 'Verzenden is niet gelukt.' }));
          }
        });
      },
    },
  ],
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
