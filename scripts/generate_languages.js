// generate_languages.js
// Fetches language byte-counts across the user's repos and renders a
// horizontal bar chart SVG (languages-card.svg) in the terminal theme.
//
// Requires env vars: GH_TOKEN, GH_USERNAME

const fs = require("fs");

const USERNAME = process.env.GH_USERNAME || "code-by-adi7";
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error("Missing GH_TOKEN environment variable.");
  process.exit(1);
}

const query = `
  query($login: String!, $after: String) {
    user(login: $login) {
      repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
        pageInfo { hasNextPage endCursor }
        nodes {
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node { name color }
            }
          }
        }
      }
    }
  }
`;

// A few named-language accent colors to keep the palette consistent with
// the rest of the profile even if GitHub's own language color differs.
const paletteFallback = ["#5fb3a3", "#4ea592", "#377b6f", "#5fdcc0", "#8fd6c7", "#2a5750", "#7fc9bb", "#264742"];

async function fetchAllRepos() {
  let repos = [];
  let after = null;
  while (true) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables: { login: USERNAME, after } }),
    });
    const json = await res.json();
    if (json.errors) {
      console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
      process.exit(1);
    }
    const page = json.data.user.repositories;
    repos = repos.concat(page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return repos;
}

async function main() {
  const repos = await fetchAllRepos();

  const totals = {};
  repos.forEach((repo) => {
    repo.languages.edges.forEach((e) => {
      totals[e.node.name] = (totals[e.node.name] || 0) + e.size;
    });
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const grandTotal = sorted.reduce((sum, [, v]) => sum + v, 0);

  const cardWidth = 620;
  const rowHeight = 30;
  const topPad = 46;
  const cardHeight = topPad + sorted.length * rowHeight + 16;
  const barMaxWidth = 340;

  let rows = "";
  sorted.forEach(([lang, size], i) => {
    const pct = grandTotal ? (size / grandTotal) * 100 : 0;
    const barWidth = (pct / 100) * barMaxWidth;
    const y = topPad + i * rowHeight;
    const color = paletteFallback[i % paletteFallback.length];
    rows += `
    <text x="20" y="${y + 15}" font-family="'JetBrains Mono', monospace" font-size="13" fill="#c9d1d3">${lang}</text>
    <rect x="180" y="${y + 3}" width="${barMaxWidth}" height="14" rx="4" fill="#161b1e"/>
    <rect x="180" y="${y + 3}" width="${barWidth.toFixed(1)}" height="14" rx="4" fill="${color}"/>
    <text x="${180 + barMaxWidth + 14}" y="${y + 15}" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5c6b70">${pct.toFixed(1)}%</text>`;
  });

  const svg = `<svg viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#0a0e11" stroke="#1f2a2e"/>
  <text x="20" y="26" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5fb3a3" font-weight="700"># top languages</text>
  ${rows}
</svg>`;

  fs.writeFileSync("languages-card.svg", svg);
  console.log(`Wrote languages-card.svg with ${sorted.length} languages`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
