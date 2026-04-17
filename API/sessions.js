const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=minimal' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (method === 'GET') return res.json();
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await supabase('GET', '/sessions?select=*&order=created_at.desc');
    const sessions = data.map(row => row.data);
    return res.status(200).json(sessions);
  }

  if (req.method === 'POST') {
    const session = req.body;
    await supabase('POST', '/sessions', { id: session.id.toString(), data: session });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await supabase('DELETE', `/sessions?id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
