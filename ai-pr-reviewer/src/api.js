export async function reviewPR(prUrl) {
  const res = await fetch("/api/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prUrl }),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}