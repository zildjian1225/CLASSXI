export default async function handler(req, res) {

  // Semua error AI dikembalikan sebagai JSON reply.
  function debug(message) {
    return res.status(200).json({
      reply: message
    });
  }

  // Tes endpoint melalui browser.
  if (req.method === "GET") {
    return res.status(200).json({
      reply: "API CHAT XYZ AKTIF"
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "Method tidak diizinkan."
    });
  }

  const API_KEY = process.env.GROQ_API_KEY;

  if (!API_KEY) {
    return debug(
      "DEBUG: GROQ_API_KEY tidak ditemukan di Vercel Environment Variables."
    );
  }

  const BASE_URL = "https://api.groq.com/openai/v1";

  // Timeout untuk setiap permintaan.
  async function requestWithTimeout(url, options, timeout = 10000) {

    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {

      return await fetch(url, {
        ...options,
        signal: controller.signal
      });

    } finally {
      clearTimeout(timer);
    }
  }

  // Membaca error asli dari Groq.
  async function readError(response) {

    const text = await response.text();

    try {

      const json = JSON.parse(text);

      return json.error?.message ||
             json.message ||
             text;

    } catch {

      return text || "Tidak ada detail error.";

    }
  }

  try {

    const body = req.body || {};

    const message = body.message;

    const history = Array.isArray(body.history)
      ? body.history
      : [];

    if (!message || typeof message !== "string") {
      return debug("DEBUG: Pesan kosong atau tidak valid.");
    }

    // 1. AMBIL DAFTAR MODEL GROQ

    let modelResponse;

    try {

      modelResponse = await requestWithTimeout(
        BASE_URL + "/models",
        {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + API_KEY,
            "Content-Type": "application/json"
          }
        },
        10000
      );

    } catch (error) {

      return debug(
        "DEBUG: Gagal mengambil daftar model Groq: " +
        error.message
      );

    }

    if (!modelResponse.ok) {

      const error = await readError(modelResponse);

      return debug(
        "DEBUG: Gagal mengambil daftar model. HTTP " +
        modelResponse.status +
        ": " + error
      );

    }

    const modelData = await modelResponse.json();

    if (!Array.isArray(modelData.data)) {

      return debug(
        "DEBUG: Format daftar model Groq tidak sesuai."
      );

    }

    // 2. FILTER MODEL CHAT

    const availableModels = modelData.data
      .filter(model => {

        if (!model.id) return false;

        if (model.active === false) return false;

        const id = model.id.toLowerCase();

        const excluded = [
          "whisper",
          "tts",
          "orpheus",
          "guard",
          "embedding",
          "embed",
          "speech"
        ];

        return !excluded.some(word => id.includes(word));

      })
      .map(model => model.id);

    if (availableModels.length === 0) {

      return debug(
        "DEBUG: Groq berhasil dihubungi, tetapi tidak ditemukan kandidat model chat."
      );

    }

    // 3. PRIORITAS MODEL

    const preferredModels = [
      "openai/gpt-oss-20b",
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b"
    ];

    const models = [
      ...preferredModels.filter(id =>
        availableModels.includes(id)
      ),

      ...availableModels.filter(id =>
        !preferredModels.includes(id)
      )
    ].slice(0, 5);

    // 4. SIAPKAN RIWAYAT CHAT

    const messages = [
      {
        role: "system",
        content: "Kamu adalah asisten AI yang ramah, "
          + "cerdas, dan membantu. Jawablah menggunakan "
          + "bahasa yang sesuai dengan pengguna."
      }
    ];

    for (const item of history.slice(-12)) {

      if (
        item &&
        ["user", "assistant"].includes(item.role) &&
        typeof item.content === "string"
      ) {

        messages.push({
          role: item.role,
          content: item.content
        });

      }

    }

    // Hindari mengirim pesan terakhir dua kali.
    const lastMessage = messages[messages.length - 1];

    if (
      !lastMessage ||
      lastMessage.role !== "user" ||
      lastMessage.content !== message
    ) {

      messages.push({
        role: "user",
        content: message
      });

    }

    // 5. COBA MODEL SATU PER SATU

    const errors = [];

    for (const model of models) {

      try {

        const response = await requestWithTimeout(
          BASE_URL + "/chat/completions",
          {
            method: "POST",

            headers: {
              "Authorization": "Bearer " + API_KEY,
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              model: model,
              messages: messages,
              stream: false
            })

          },
          20000
        );

        if (!response.ok) {

          const error = await readError(response);

          errors.push(
            model + " (HTTP " +
            response.status + "): " + error
          );

          continue;

        }

        const result = await response.json();

        const reply =
          result.choices?.[0]?.message?.content;

        if (typeof reply === "string" && reply.trim()) {

          console.log("MODEL BERHASIL:", model);

          return res.status(200).json({
            reply: reply
          });

        }

        errors.push(
          model + ": Respons kosong atau format tidak sesuai."
        );

      } catch (error) {

        errors.push(
          model + ": " + error.message
        );

      }

    }

    // 6. SEMUA MODEL GAGAL

    console.error("GROQ DEBUG:", errors);

    return debug(
      "DEBUG GROQ: Semua model gagal.\n\n" +
      errors.join("\n\n")
    );

  } catch (error) {

    console.error("CHAT ERROR:", error);

    return debug(
      "DEBUG SERVER: " + error.message
    );

  }

}
