// api/chat.js
// kunci dibaca dari environment variable GEMINI_API_KEY di Vercel.

export const config = { maxDuration: 30 };

const MODELS = [
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'api key belum diatur di server.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

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

  const errors = [];

  for (const model of MODELS) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages, max_tokens: 800, temperature: 0.7 })
      });

      const text = await r.text();

      if (r.ok) {
        const data = JSON.parse(text);
        const reply = data?.choices?.[0]?.message?.content;
        if (reply) return res.status(200).json({ reply });
        errors.push(`${model}: jawaban kosong`);
        continue;
      }

      errors.push(`${model} (status ${r.status}): ${text.slice(0, 150)}`);
    } catch (e) {
      errors.push(`${model}: ${e.message}`);
    }
  }

  console.error('gemini errors:', errors);

  // sementara: tampilkan semua error supaya terlihat. Setelah jalan, ganti jadi pesan umum.
  return res.status(200).json({
    reply: `maaf, semua model gagal.\nDETAIL:\n${errors.join('\n')}`.slice(0, 1500)
  });
}
