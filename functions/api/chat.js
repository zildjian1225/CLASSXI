// ===== proxy aman ke gemini =====
// kunci API dibaca dari environment variable GEMINI_API_KEY di EdgeOne Pages.

const MODEL = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `
kamu adalah asisten belajar untuk kelas XI.FI.
jawab dengan bahasa indonesia yang ramah dan singkat.
bantu siswa memahami pelajaran, membuat ide tugas, dan menjawab pertanyaan umum.
jika pertanyaan tidak pantas atau berbahaya, tolak dengan sopan.
`;

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPost(context) {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'api key belum diatur di server.' }, 500);
  }

  let body;
  try {
    body = await context.request.json();
  } catch (e) {
    return json({ error: 'request tidak valid.' }, 400);
  }

  const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);
  if (!message) {
    return json({ error: 'pesan kosong.' }, 400);
  }

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
  const contents = history
    .filter(m => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text.slice(0, 2000) }]
    }));
]
  contents.push({ role: 'user', parts: [{ text: message } });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
        })
      }
    );

    if (!res.ok) {
      return json({ error: 'gagal menghubungi ai.' }, 502);
    }

    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('')
      || 'maaf, aku belum bisa menjawab itu.';

    return json({ reply });
  } catch (e) {
    return json({ error: 'server ai sedang bermasalah.' }, 500);
  }
}
