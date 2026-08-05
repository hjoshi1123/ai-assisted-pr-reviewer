export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prUrl } = req.body;
  if (!prUrl) {
    return res.status(400).json({ error: "Missing prUrl" });
  }

  // Step 1: turn a normal GitHub PR URL into its .diff equivalent.
  // e.g. https://github.com/owner/repo/pull/123 -> https://github.com/owner/repo/pull/123.diff
  const diffUrl = prUrl.replace(/\/$/, "") + ".diff";

  let diffText;
  try {
    const diffRes = await fetch(diffUrl);
    if (!diffRes.ok) {
      return res.status(400).json({ error: "Could not fetch diff. Is this a public PR URL?" });
    }
    diffText = await diffRes.text();
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch diff", details: err.message });
  }

  // Guard: huge diffs cost more tokens and slow things down. Truncate for the MVP.
  const truncatedDiff = diffText.slice(0, 8000);

  const prompt = `You are a senior code reviewer. Review the following pull request diff.
Respond with ONLY valid JSON, no markdown, in this exact shape:
{
  "summary": "<2-3 sentence plain-English summary of what changed>",
  "potentialIssues": [<strings, specific concerns you notice>],
  "suggestions": [<strings, concrete improvement suggestions>],
  "riskLevel": "<low|medium|high>"
}

DIFF:
${truncatedDiff}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: "LLM API error", details: data.error?.message || data });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "Empty response from LLM" });
    }

    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Review failed", details: err.message });
  }
}