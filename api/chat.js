// api/chat.js
// kunci dibaca dari environment variable GEMINI_API_KEY di Vercel.

export const config = { maxDuration: 60 };

const MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const TIMEOUT_MS = 20000;
const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

const SYSTEM_PROMPT = `
kamu adalah asisten belajar untuk kelas XI.FI.
jawab dengan bahasa indonesia yang ramah dan singkat.
bantu siswa memahami pelajaran, membuat ide tugas, dan menjawab pertanyaan umum.
jika pertanyaan tidak pantas atau berbahaya, tolak dengan sopan.
`;

async function callModel(model, messages, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, messages, max_tokens: 800, temperature: 0.7 }),
      signal: controller.signal
    });
    const text = await r.text();
    if (!r.ok) {
      return { ok: false, error: `${model} (status ${r.status}): ${text.slice(0, 150)}` };
    }
    const data = JSON.parse(text);
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) return { ok: false, error: `${model}: jawaban kosong` };
    return { ok: true, reply };
  } catch (e) {
    const why = e.name === 'AbortError' ? 'timeout' : e.message;
    return { ok: false, error: `${model}: ${why}` };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method tidak diizinkan.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({ reply: 'maaf, server belum diatur. (GEMINI_API_KEY kosong)' });
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
    const result = await callModel(model, messages, apiKey);
    if (result.ok) return res.status(200).json({ reply: result.reply });
    errors.push(result.error);
  }

  console.error('gemini errors:', errors);

  // sementara: tampilkan penyebab asli. Setelah jalan, ganti jadi pesan umum.
  return res.status(200).json({
    reply: `maaf, ai gagal menjawab.\nDETAIL:\n${errors.join('\n')}`.slice(0, 1500)
  });
}
