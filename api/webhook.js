// Vercel serverless function — proxies POST requests to Make webhook
// This avoids CORS issues since the browser talks to the same origin

const MAKE_WEBHOOK_URL = "https://hook.us2.make.com/1gmk49s06qr9lfcd1rq29oj3rmju501p";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(502).json({ error: "Failed to reach Make webhook" });
  }
}
