const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "User-Agent": "repo-explainer-app",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {})
};

const GITHUB_RAW_HEADERS = {
  Accept: "application/vnd.github.raw",
  "User-Agent": "repo-explainer-app",
  ...(process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {})
};

export function parseGitHubUrl(url: string) {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) throw new Error("Invalid GitHub URL");
  return { owner: match[1], repo: match[2].replace(".git", "") };
}

export async function fetchReadme(owner: string, repo: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { headers: GITHUB_RAW_HEADERS }
    );
    if (!res.ok) return "No README found.";
    return await res.text();
  } catch {
    return "No README found.";
  }
}

export async function fetchFileTree(owner: string, repo: string): Promise<string[]> {
  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: GITHUB_HEADERS }
    );

    if (!repoRes.ok) throw new Error(`Repo fetch failed: ${repoRes.status}`);
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || "main";
    console.log("✅ Default branch:", defaultBranch);

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers: GITHUB_HEADERS }
    );

    if (!treeRes.ok) throw new Error(`Tree fetch failed: ${treeRes.status}`);
    const treeData = await treeRes.json();

    if (!treeData.tree || !Array.isArray(treeData.tree)) {
      throw new Error("Invalid tree response from GitHub");
    }

    return treeData.tree
      .filter((f: any) => f.type === "blob")
      .map((f: any) => f.path)
      .filter((p: string) =>
        !p.includes("node_modules") &&
        !p.includes(".git") &&
        !p.endsWith(".png") &&
        !p.endsWith(".jpg") &&
        !p.endsWith(".svg") &&
        !p.endsWith(".ico") &&
        !p.endsWith(".lock") &&
        !p.endsWith(".min.js")
      )
      .slice(0, 60);

  } catch (e) {
    console.error("❌ fetchFileTree error:", e);
    throw e;
  }
}

export async function fetchFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: GITHUB_RAW_HEADERS }
    );
    if (!res.ok) return "Could not load file.";
    return await res.text();
  } catch {
    return "Could not load file.";
  }
}