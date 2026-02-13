const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const port = parseInt(process.env.PORT || '3200', 10);
const dev = process.argv.includes('--dev');
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res, parse(req.url, true)))
    .listen(port, '0.0.0.0', () => {
      console.log(`> BidPilot [${dev ? 'dev' : 'prod'}] on http://0.0.0.0:${port}`);
    });
});
