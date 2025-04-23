import { rest } from '../polygon.js';

export default async function handler(req, res) {
  const symbol = req.query.id;
  if (!symbol) return res.status(400).json({ error: 'Missing ?id=' });

  try {
    const { results } = await rest.reference.tickerDetails(symbol);
    res.status(200).json(results);
  } catch {
    res.status(404).json({ error: 'Ticker not found' });
  }
}
