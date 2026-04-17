"use client";
import { useState } from "react";
import { AnalyzeResult, FileDetail, Level } from "@/lib/types";

const styles = {
  app: {
    maxWidth: 960,
    margin: "0 auto",
    padding: "3rem 1.5rem 4rem",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    minHeight: "100vh",
    background: "#0d0f14",
    color: "#E8EAF0",
  } as React.CSSProperties,
};

const C = {
  bg: "#0d0f14",
  surface: "#13161d",
  surface2: "#1b1f2a",
  surface3: "#222736",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  accent: "#6EE7B7",
  accent2: "#818CF8",
  accent3: "#F472B6",
  gold: "#F0C060",
  text: "#E8EAF0",
  muted: "#8892A4",
  muted2: "#5a6378",
};

function Card({
  title,
  dotColor = C.accent,
  children,
}: {
  title: string;
  dotColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
          }}
        />
        {title}
      </div>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: C.muted2,
        display: "block",
        marginBottom: 8,
      }}
    >
      {children}
    </span>
  );
}

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

  async function handleAnalyze() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    setSelectedFile(null);
    setFileDetail(null);

    const messages = [
      "Fetching repo...",
      "Reading files...",
      "Building context...",
      "Analyzing with AI...",
    ];
    let i = 0;
    setLoadingMsg(messages[0]);
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 1800);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, level }),
      });
      if (!res.ok) throw new Error("Failed to analyze repo");
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function handleFileClick(path: string) {
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
          level,
        }),
      });
      const data = await res.json();
      setFileDetail(data);
    } catch {
      setFileDetail(null);
    } finally {
      setFileLoading(false);
    }
  }

  const levels: Level[] = ["beginner", "intermediate", "advanced"];
  const levelEmoji: Record<Level, string> = {
    beginner: "👶",
    intermediate: "💻",
    advanced: "🧠",
  };
  const levelAccent: Record<Level, string> = {
    beginner: C.accent3,
    intermediate: C.accent2,
    advanced: C.accent,
  };
  const levelBorder: Record<Level, string> = {
    beginner: "rgba(244,114,182,0.35)",
    intermediate: "rgba(129,140,248,0.35)",
    advanced: "rgba(110,231,183,0.35)",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .repo-dot { animation: blink 2s ease-in-out infinite; }
        .loading-bar {
          height: 2px;
          background: linear-gradient(90deg, #6EE7B7, #818CF8, #F472B6, #6EE7B7);
          background-size: 200% 100%;
          border-radius: 2px;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .loading-msg {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: #8892A4;
          text-align: center;
          letter-spacing: 0.04em;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .file-row {
          transition: all 0.18s;
        }
        .file-row:hover {
          border-color: rgba(255,255,255,0.12) !important;
          background: #222736 !important;
        }
        .tech-tag:hover {
          border-color: rgba(129,140,248,0.4) !important;
          background: rgba(129,140,248,0.08) !important;
        }
        .file-btn:hover {
          border-color: rgba(129,140,248,0.5) !important;
          color: #818CF8 !important;
          background: rgba(129,140,248,0.08) !important;
        }
      `}</style>

      <main style={styles.app}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: C.accent,
              textTransform: "uppercase",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 32, height: 1, background: C.accent, opacity: 0.4, display: "inline-block" }} />
            Open Source Intelligence
            <span style={{ width: 32, height: 1, background: C.accent, opacity: 0.4, display: "inline-block" }} />
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 48,
              fontWeight: 300,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: C.text,
              margin: "0 0 0.75rem",
            }}
          >
            Repo<em style={{ fontStyle: "italic", color: C.accent }}>Explainer</em>
          </h1>
          <p style={{ fontSize: 15, color: C.muted, fontWeight: 300, margin: 0 }}>
            Paste any public GitHub URL — AI decodes it instantly
          </p>
        </div>

        {/* Input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "flex",
              gap: 10,
              background: C.surface,
              border: `1px solid ${C.border2}`,
              borderRadius: 12,
              padding: "6px 6px 6px 18px",
            }}
          >
            <input
              type="text"
              placeholder="https://github.com/owner/repo"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                outline: "none",
                fontFamily: "'DM Mono', monospace",
                fontSize: 13,
                color: C.text,
                fontWeight: 300,
                padding: "6px 0",
                letterSpacing: "0.01em",
              }}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              style={{
                background: loading || !url.trim() ? "rgba(110,231,183,0.4)" : C.accent,
                color: "#0d1a12",
                border: "none",
                borderRadius: 8,
                padding: "10px 22px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                cursor: loading || !url.trim() ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
                transition: "all 0.2s",
              }}
            >
              {loading ? loadingMsg : "Analyze →"}
            </button>
          </div>

          {/* Level selector */}
          <div
            style={{
              display: "flex",
              gap: 8,
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 6,
            }}
          >
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                style={{
                  flex: 1,
                  background: level === l ? C.surface3 : "none",
                  border: level === l ? `1px solid ${levelBorder[l]}` : "1px solid transparent",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: level === l ? 500 : 400,
                  color: level === l ? levelAccent[l] : C.muted,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.18s",
                }}
              >
                {levelEmoji[l]} {l.charAt(0).toUpperCase() + l.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}>
            <div className="loading-bar" />
            <div className="loading-msg">{loadingMsg}</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(234,75,74,0.08)",
              border: "1px solid rgba(234,75,74,0.25)",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#F09595",
              fontFamily: "'DM Mono', monospace",
              fontSize: 12,
              marginBottom: "1.5rem",
            }}
          >
            ✗ {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Repo badge */}
            <div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 20,
                  padding: "5px 14px",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                <span
                  className="repo-dot"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block" }}
                />
                {result.owner}/{result.repo}
              </span>
            </div>

            {/* Top row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card title="What it does">
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: C.text, fontWeight: 300 }}>
                  {result.summary}
                </p>
              </Card>
              <Card title="Tech Stack" dotColor={C.accent2}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {result.techStack.map((t) => (
                    <span
                      key={t}
                      className="tech-tag"
                      style={{
                        background: C.surface2,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: "5px 11px",
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: C.accent2,
                        fontWeight: 400,
                        transition: "all 0.15s",
                        cursor: "default",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Card>
            </div>

            {/* Key insight */}
            <div
              style={{
                background: "rgba(240,192,96,0.06)",
                border: `1px solid rgba(240,192,96,0.2)`,
                borderLeft: `3px solid ${C.gold}`,
                borderRadius: "0 8px 8px 0",
                padding: "14px 18px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  color: C.gold,
                  textTransform: "uppercase",
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                insight
              </span>
              <span style={{ fontSize: 14, color: "#D4B870", lineHeight: 1.6, fontWeight: 300 }}>
                {result.keyInsight}
              </span>
            </div>

            {/* How to run */}
            <Card title="How to Run" dotColor={C.accent3}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.howToRun.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: C.surface3,
                        border: `1px solid ${C.border2}`,
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 10,
                        color: C.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 14, color: C.text, lineHeight: 1.6, fontWeight: 300 }}>{step}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Files section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: selectedFile ? "1fr 1fr" : "1fr",
                gap: 16,
              }}
            >
              {/* File list */}
              <Card title="Files & Folders" dotColor={C.accent2}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    maxHeight: 500,
                    overflowY: "auto",
                  }}
                >
                  {result.fileExplanations.map((f) => (
                    <div
                      key={f.path}
                      className="file-row"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 8,
                        border: selectedFile === f.path
                          ? "1px solid rgba(129,140,248,0.4)"
                          : "1px solid transparent",
                        background: selectedFile === f.path
                          ? "rgba(129,140,248,0.06)"
                          : C.surface2,
                        cursor: "pointer",
                      }}
                      onClick={() => handleFileClick(f.path)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <code
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 12,
                            color: C.accent2,
                            display: "block",
                            marginBottom: 3,
                            wordBreak: "break-all",
                            letterSpacing: "0.01em",
                          }}
                        >
                          {f.path}
                        </code>
                        <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{f.explanation}</span>
                      </div>
                      <button
                        className="file-btn"
                        onClick={(e) => { e.stopPropagation(); handleFileClick(f.path); }}
                        style={{
                          flexShrink: 0,
                          background: "none",
                          border: `1px solid ${C.border2}`,
                          borderRadius: 6,
                          padding: "5px 10px",
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11,
                          color: C.muted,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s",
                        }}
                      >
                        inspect →
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* File detail panel */}
              {selectedFile && (
                <Card title={selectedFile.split("/").pop() ?? selectedFile}>
                  {fileLoading ? (
                    <p
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 12,
                        color: C.muted,
                        letterSpacing: "0.06em",
                      }}
                    >
                      Analyzing file...
                    </p>
                  ) : fileDetail ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                      <div>
                        <Label>Purpose</Label>
                        <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.65, fontWeight: 300 }}>
                          {fileDetail.purpose}
                        </p>
                      </div>

                      <div>
                        <Label>What it does</Label>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                          {fileDetail.whatItDoes.map((b, i) => (
                            <li key={i} style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, display: "flex", gap: 8, alignItems: "flex-start" }}>
                              <span style={{ color: C.accent, fontSize: 14, flexShrink: 0, marginTop: -1 }}>›</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {fileDetail.keyFunctions.length > 0 && (
                        <div>
                          <Label>Key functions</Label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {fileDetail.keyFunctions.map((fn) => (
                              <div
                                key={fn.name}
                                style={{
                                  background: C.surface2,
                                  borderRadius: 6,
                                  padding: "10px 12px",
                                  border: `1px solid ${C.border}`,
                                }}
                              >
                                <code
                                  style={{
                                    fontFamily: "'DM Mono', monospace",
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: C.accent,
                                    display: "block",
                                    marginBottom: 4,
                                  }}
                                >
                                  {fn.name}
                                </code>
                                <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{fn.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fileDetail.dependsOn.length > 0 && (
                        <div>
                          <Label>Depends on</Label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                            {fileDetail.dependsOn.map((d) => (
                              <span
                                key={d}
                                style={{
                                  background: "rgba(110,231,183,0.08)",
                                  border: "1px solid rgba(110,231,183,0.2)",
                                  borderRadius: 5,
                                  padding: "4px 10px",
                                  fontFamily: "'DM Mono', monospace",
                                  fontSize: 11,
                                  color: C.accent,
                                }}
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div
                        style={{
                          background: "rgba(110,231,183,0.05)",
                          border: "1px solid rgba(110,231,183,0.15)",
                          borderLeft: `3px solid ${C.accent}`,
                          borderRadius: "0 8px 8px 0",
                          padding: "11px 14px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: 10,
                            letterSpacing: "0.1em",
                            color: C.accent,
                            textTransform: "uppercase",
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          tip
                        </span>
                        <span style={{ fontSize: 13, color: "rgba(110,231,183,0.75)", lineHeight: 1.55 }}>
                          {fileDetail.tip}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
