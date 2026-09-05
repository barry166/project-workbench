export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const started = performance.now();
  res.status(200).json({
    online: true,
    responseTimeMs: Math.max(0, Math.round((performance.now() - started) * 100) / 100),
    checkedAt: new Date().toISOString(),
  });
}
