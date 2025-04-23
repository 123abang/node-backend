import { rest } from '../polygon.js';

export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(200).json([]);

  try {
    // Only markets available on the free key
    const markets = ['stocks', 'crypto'];

    const results = await Promise.all(
      markets.map(async (m) =>
        rest.reference.tickers({
          market: m,
          search: q,
          active: true,
          limit: 5,
        }).then((r) => r.results)
      )
    );

    res.status(200).json(results.flat());
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
}
