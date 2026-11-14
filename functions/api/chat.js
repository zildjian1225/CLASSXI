// api/chat.js
// kunci dibaca dari environment variable OPENROUTER_API_KEY di Vercel.

const MODEL = 'google/gemini-2.5-flash';

const SYSTEM_PROMPT = `
kamu adalah asisten belajar untuk kelas XI.FI.
jawab dengan bahasa indonesia yang ramah dan singkat.
bantu siswa memahami pelajaran, membuat ide tugas, dan menjawab pertanyaan umum.
jika pertanyaan tidak pantas atau berbahaya, tolak dengan sopan.
`;

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method tidak diizinkan.' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'api key belum diatur di server.' });
  }

  const body = req.body || {};
  const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);
  if (!message) {
    return res.status(400).json({ error: 'pesan kosong.' });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  history
    .filter(m => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .forEach(m => messages.push({ role: m.role, content: m.text.slice(0, 2000) }));

  messages.push({ role: 'user', content: message });

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!r.ok) {
      return res.status(502).json({ error: 'gagal menghubungi ai.' });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || 'maaf, aku belum bisa menjawab itu.';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'server ai sedang bermasalah.' });
  }
}
