import { useState, useEffect } from "react";
import { reviewPR } from "./api";
import "./App.css";

export default function App() {
  const [prUrl, setPrUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    console.log("App loaded");
  }, []);

  const handleSubmit = async () => {
    if (!prUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await reviewPR(prUrl);
      setResult(data);
      setRecent((prev) => [prUrl, ...prev.filter((u) => u !== prUrl)].slice(0, 5));
    } catch (err) {
      setError("Something went wrong. Check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>AI PR Reviewer</h1>
      <p className="subtitle">Paste a public GitHub PR URL to get an AI-generated code review.</p>

      <div className="field">
        <input
          type="text"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="https://github.com/owner/repo/pull/123"
        />
        <button className="analyze-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? "Reviewing..." : "Review"}
        </button>
      </div>

      {recent.length > 0 && (
        <div className="recent">
          <span>Recent: </span>
          {recent.map((url, i) => (
            <button key={i} className="recent-chip" onClick={() => setPrUrl(url)}>
              {url.split("/").slice(-3).join("/")}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="loader">Fetching diff and generating review...</p>}
      {error && <p className="error-msg">{error}</p>}

      {result && (
        <div className="results">
          <p className={`risk-badge risk-${result.riskLevel}`}>Risk: {result.riskLevel}</p>
          <h3>Summary</h3>
          <p>{result.summary}</p>
          <h3>Potential Issues</h3>
          <ul>{result.potentialIssues?.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
          <h3>Suggestions</h3>
          <ul>{result.suggestions?.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
    </div>
  );
}