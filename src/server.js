const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const TEN_MINUTES = 10 * 60 * 1000;
const DATA_RETENTION_LIMIT = 6 * 24 * 6; // roughly six days of 10-minute samples
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

const DATA_FILE = path.join(__dirname, '..', 'data', 'history.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

let history = loadHistory();
let isFetching = false;

function loadHistory() {
  try {
    const contents = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(contents);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => ({
          timestamp: item.timestamp,
          up: Number(item.up) || 0,
          down: Number(item.down) || 0,
          flat: Number(item.flat) || 0
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  } catch (error) {
    console.warn('Unable to read history file, starting with an empty history.', error.message);
  }
  return [];
}

function saveHistory() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Failed to write history file:', error.message);
  }
}

function fetchJSON(targetUrl) {
  return new Promise((resolve, reject) => {
    https
      .get(targetUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Request failed with status code ${res.statusCode}`));
          res.resume();
          return;
        }

        let rawData = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function collectMarketBreadth() {
  if (isFetching) {
    return null;
  }
  isFetching = true;
  try {
    const apiUrl = 'https://api.binance.com/api/v3/ticker/24hr';
    const tickers = await fetchJSON(apiUrl);
    if (!Array.isArray(tickers)) {
      throw new Error('Unexpected response format from Binance API');
    }

    let up = 0;
    let down = 0;
    let flat = 0;

    for (const ticker of tickers) {
      const change = Number.parseFloat(ticker.priceChangePercent);
      if (Number.isNaN(change)) {
        continue;
      }
      if (change > 0) {
        up += 1;
      } else if (change < 0) {
        down += 1;
      } else {
        flat += 1;
      }
    }

    const timestamp = new Date().toISOString();
    const latestEntry = history[history.length - 1];
    if (!latestEntry || latestEntry.timestamp !== timestamp) {
      history.push({ timestamp, up, down, flat });
    } else {
      latestEntry.up = up;
      latestEntry.down = down;
      latestEntry.flat = flat;
    }

    if (history.length > DATA_RETENTION_LIMIT) {
      history = history.slice(history.length - DATA_RETENTION_LIMIT);
    }

    saveHistory();
    return { timestamp, up, down, flat };
  } catch (error) {
    console.error('Failed to collect market breadth data:', error.message);
    return null;
  } finally {
    isFetching = false;
  }
}

function scheduleCollection() {
  const now = Date.now();
  const delayUntilNextInterval = TEN_MINUTES - (now % TEN_MINUTES);
  setTimeout(async () => {
    await collectMarketBreadth();
    scheduleCollection();
  }, delayUntilNextInterval);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function serveStatic(requestPath, res) {
  const safePath = path.normalize(path.join(PUBLIC_DIR, requestPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(safePath, (error, data) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': getContentType(safePath),
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url || '/');
  const pathname = parsedUrl.pathname || '/';

  if (req.method === 'GET' && pathname === '/api/history') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(history));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/collect') {
    const entry = await collectMarketBreadth();
    res.writeHead(entry ? 200 : 500, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify(entry || { error: 'Failed to collect data' }));
    return;
  }

  let filePath = pathname;
  if (filePath === '/') {
    filePath = '/index.html';
  }

  serveStatic(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

collectMarketBreadth()
  .catch((error) => {
    console.error('Initial collection failed:', error.message);
  })
  .finally(() => {
    scheduleCollection();
  });
