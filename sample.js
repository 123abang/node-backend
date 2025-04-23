import { rest } from '../polygon.js';

/* 5‑req/min throttle isn’t needed here because Vercel functions
   spin up on demand, but you can add p‑throttle if you like. */

const topFive = async (market) => {
  const { results } = await rest.reference.tickers({
    market,
    active: true,
    limit: 5,
    sort: 'ticker',
    order: 'asc',
  });
  return results;
};

export default async function handler(req, res) {
  try {
    const [stocks, crypto] = await Promise.all([
      topFive('stocks'),
      topFive('crypto'),
    ]);
    res.status(200).json([...crypto, ...stocks]);
  } catch (err) {
    res.status(500).json({ error: 'Polygon failed' });
  }
}
