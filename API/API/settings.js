const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=minimal,resolution=merge-duplicates' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (method === 'GET') return res.json();
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { key } = req.query;
    const data = await supabase('GET', `/settings?key=eq.${key}&select=*`);
    if (data && data.length > 0) {
      return res.status(200).json(data[0].data);
    }
    return res.status(200).json(null);
  }

  if (req.method === 'POST') {
    const { key, data } = req.body;
    await supabase('POST', '/settings', { key, data });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
