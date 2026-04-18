"use client";
import { useState, useCallback } from "react";
import { AnalyzeResult, FileDetail, Level } from "@/lib/type";

const MESSAGES = [
  "🔍 Fetching repo...",
  "📁 Reading file structure...",
  "🧠 Building context...",
  "⚡ Analyzing with AI...",
  "✨ Formatting results..."
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [level, setLevel] = useState<Level>("intermediate");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDetail, setFileDetail] = useState<FileDetail | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [cached, setCached] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setResult(null);
    setError("");
    setSelectedFile(null);
    setFileDetail(null);
    setCached(false);

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % MESSAGES.length;
      setLoadingMsg(MESSAGES[i]);
    }, 1500);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, level })
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle rate limiting
        if (res.status === 429) {
          setError(`Rate limited: ${data.error}`);
        } else {
          setError(data.error || "Failed to analyze repo");
        }
        return;
      }

      setResult(data);
      setCached(data._cached || false);
    } catch (e: any) {
      setError(e.message || "Network error");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [url, level]);

  const handleFileClick = useCallback(
    async (path: string) => {
      if (!result) return;
      setSelectedFile(path);
      setFileDetail(null);
      setFileLoading(true);

      try {
        const res = await fetch("/api/file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: result.owner,
            repo: result.repo,
            path,
            level
          })
        });

        if (!res.ok) {
          if (res.status === 429) {
            setFileDetail({ error: "Rate limited. Please try again soon." } as any);
          } else {
            setFileDetail({ error: "Failed to load file details" } as any);
          }
          return;
        }

        const data = await res.json();
        setFileDetail(data);
      } catch {
        setFileDetail({ error: "Network error" } as any);
      } finally {
        setFileLoading(false);
      }
    },
    [result, level]
  );

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 0.5rem" }}>RepoExplainer Pro</h1>
        <p style={{ color: "#666", margin: 0 }}>AI-powered GitHub repository analysis — powered by LLaMA 3.3</p>
      </div>

      {/* Input Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          disabled={loading}
          style={{
            padding: "12px 16px",
            fontSize: 15,
            border: "1px solid #ddd",
            borderRadius: 8,
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
            opacity: loading ? 0.6 : 1
          }}
        />

        {/* Level Selector */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 0",
                border: "1px solid #ddd",
                borderRadius: 8,
                background: level === l ? "#1a1a1a" : "#fff",
                color: level === l ? "#fff" : "#333",
                fontWeight: level === l ? 600 : 400,
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
                textTransform: "capitalize",
                transition: "all 0.15s",
                opacity: loading ? 0.6 : 1
              }}
            >
              {l === "beginner" ? "👶" : l === "intermediate" ? "💻" : "🧠"} {l}
            </button>
          ))}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !url.trim()}
          style={{
            padding: "13px 0",
            background: loading ? "#888" : "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s"
          }}
        >
          {loading ? loadingMsg : "Analyze Repo →"}
        </button>
      </div>

      {error && (
        <div style={{
          background: "#fff1f1",
          border: "1px solid #fcc",
          borderRadius: 8,
          padding: "12px 16px",
          color: "#c00",
          marginBottom: "1rem",
          animation: "slideIn 0.3s ease"
        }}>
          {error}
        </div>
      )}

      {/* Cache indicator */}
      {cached && (
        <div style={{
          background: "#f0f8ff",
          border: "1px solid #b0d4ff",
          borderRadius: 8,
          padding: "8px 12px",
          color: "#0066cc",
          marginBottom: "1rem",
          fontSize: 12,
          fontWeight: 500
        }}>
          ⚡ Cached result (loaded instantly)
        </div>
      )}

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top row: Summary + Tech Stack */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Card title="📋 What it does">
              <p style={{ margin: 0, lineHeight: 1.7, color: "#333" }}>{result.summary}</p>
            </Card>
            <Card title="🔧 Tech Stack">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {result.techStack.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: "#f0f0f0",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          </div>

          {/* Key Insight */}
          <div style={{
            background: "#fffbea",
            border: "1px solid #f0d060",
            borderRadius: 10,
            padding: "14px 18px"
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>💡 Key Insight: </span>
            <span style={{ color: "#555", fontSize: 14 }}>{result.keyInsight}</span>
          </div>

          {/* How to Run */}
          <Card title="▶ How to Run">
            <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 2 }}>
              {result.howToRun.map((step, i) => (
                <li key={i} style={{ color: "#333", fontSize: 14 }}>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          {/* Files Section */}
          <div style={{ display: "grid", gridTemplateColumns: selectedFile ? "1fr 1fr" : "1fr", gap: 16 }}>
            <Card title="📁 Files & Folders">
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "500px", overflowY: "auto" }}>
                {result.fileExplanations.map((f) => (
                  <div
                    key={f.path}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: selectedFile === f.path ? "#f0f0ff" : "#fafafa",
                      border: selectedFile === f.path ? "1px solid #aaa8ff" : "1px solid #eee",
                      gap: 12
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <code style={{
                        fontSize: 12,
                        color: "#555",
                        display: "block",
                        marginBottom: 2,
                        wordBreak: "break-all"
                      }}>
                        {f.path}
                      </code>
                      <span style={{ fontSize: 13, color: "#666" }}>{f.explanation}</span>
                    </div>
                    <button
                      onClick={() => handleFileClick(f.path)}
                      disabled={fileLoading}
                      style={{
                        flexShrink: 0,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        background: "#fff",
                        cursor: "pointer",
                        color: "#333",
                        whiteSpace: "nowrap",
                        opacity: fileLoading ? 0.6 : 1
                      }}
                    >
                      Explain →
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {selectedFile && (
              <Card title={`🔍 ${selectedFile.split("/").pop()}`}>
                {fileLoading ? (
                  <div style={{ color: "#888", fontSize: 14, padding: "1rem 0" }}>Analyzing file...</div>
                ) : fileDetail && !(fileDetail as any).error ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <Label>Purpose</Label>
                      <p style={{ margin: "4px 0 0", fontSize: 14, color: "#333", lineHeight: 1.6 }}>
                        {(fileDetail as any).purpose}
                      </p>
                    </div>
                    <div>
                      <Label>What it does</Label>
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {(fileDetail as any).whatItDoes?.map((b: string, i: number) => (
                          <li key={i} style={{ fontSize: 13, color: "#444", lineHeight: 1.8 }}>
                            {b}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {(fileDetail as any).keyFunctions?.length > 0 && (
                      <div>
                        <Label>Key functions</Label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                          {(fileDetail as any).keyFunctions.map((fn: any) => (
                            <div key={fn.name} style={{ background: "#f5f5f5", borderRadius: 6, padding: "8px 10px" }}>
                              <code style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
                                {fn.name}
                              </code>
                              <span style={{ fontSize: 12, color: "#666", display: "block", marginTop: 2 }}>
                                {fn.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ background: "#f0fff4", border: "1px solid #a0d8b0", borderRadius: 8, padding: "10px 12px" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#2a6e40" }}>💡 Tip: </span>
                      <span style={{ fontSize: 13, color: "#2a6e40" }}>{(fileDetail as any).tip}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "#c00", fontSize: 13 }}>{(fileDetail as any)?.error || "Failed to load"}</div>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e5e5",
      borderRadius: 10,
      padding: "16px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
    }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "#999"
    }}>
      {children}
    </span>
  );
}
