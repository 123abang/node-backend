/* ───────── dependencies ───────── */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { restClient } from '@polygon.io/client-js';

dotenv.config();
const { POLYGON_API_KEY } = process.env;

if (!POLYGON_API_KEY) {
  console.error('\n❌  POLYGON_API_KEY missing in .env – server aborted.\n');
  process.exit(1);
}

const rest = restClient(POLYGON_API_KEY);

/* ───────── express setup ───────── */
const app = express();
app.use(cors());
const port = 4000;

/* ───────── safe helper ───────── */
async function safe(cb, fallback = []) {
  try {
    return await cb();
  } catch (err) {
    console.dir(err, { depth: 2 });            // show entire object once
    const http = err.response?.status ?? 'n/a';
    const txt =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'unknown';
    console.error(`Polygon error: ${txt} | HTTP ${http}\n`);
    return fallback;
  }
}

/* ───────── helpers ───────── */
const topTickers = (market, limit = 5) =>
  safe(async () => {
    const { results } = await rest.reference.tickers({
      market,
      active: true,
      limit,
      sort: 'ticker',
      order: 'asc',
    });
    return results;
  });

const enrichStockRows = (rows) =>
  Promise.all(
    rows.map(async (row) => {
      if (row.market !== 'stocks' || row.type !== 'CS') return row;
      return safe(async () => {
        const { results } = await rest.reference.tickerDetails(row.ticker);
        return { ...row, ...results.branding };
      }, row);
    }),
  );

/* ───────── routes ───────── */

/* 5 stocks + 5 crypto */
app.get('/api/samples', async (_, res) => {
  const [stocks, crypto] = await Promise.all([
    topTickers('stocks'),
    topTickers('crypto'),
  ]);
  res.json([...crypto, ...(await enrichStockRows(stocks))]);
});

/* search */
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const markets = ['stocks', 'crypto'];
  const data = await Promise.all(
    markets.map((m) =>
      safe(async () => {
        const { results } = await rest.reference.tickers({
          market: m,
          search: q,
          active: true,
          limit: 5,
        });
        return results;
      })
    )
  );

  res.json(await enrichStockRows(data.flat()));
});

/* ticker details – stocks only */
app.get('/api/ticker/:symbol', async (req, res) => {
  const symbol = req.params.symbol;

  /* crude test: crypto tickers start with "X:" */
  if (symbol.startsWith('X:')) {
    return res
      .status(501)
      .json({ error: 'Details for crypto tickers not implemented' });
  }

  const data = await safe(async () => {
    const { results } = await rest.reference.tickerDetails(symbol);
    return results;
  });

  if (!data) return res.status(404).json({ error: 'Ticker not found' });
  res.json(data);
});

/* ───────── launch ───────── */
app.listen(port, () =>
  console.log(`⬢  API running →  http://localhost:${port}\n`)
);
