// generate_stats.js
// Fetches repo/star/commit counts for the user and renders a custom-styled
// SVG stats card (stats-card.svg), matching the terminal theme.
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
  query($login: String!) {
    user(login: $login) {
      repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
        totalCount
        nodes {
          stargazerCount
        }
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        restrictedContributionsCount
      }
      followers {
        totalCount
      }
    }
  }
`;

async function main() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const user = json.data.user;
  const totalRepos = user.repositories.totalCount;
  const totalStars = user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
  const totalCommitsThisYear = user.contributionsCollection.contributionCalendar.totalContributions;
  const followers = user.followers.totalCount;

  const stats = [
    { label: "Repos", value: totalRepos },
    { label: "Stars", value: totalStars },
    { label: "Commits (last yr)", value: totalCommitsThisYear },
    { label: "Followers", value: followers },
  ];

  const cardWidth = 620;
  const cardHeight = 150;
  const colWidth = (cardWidth - 40) / stats.length;

  let statBlocks = "";
  stats.forEach((s, i) => {
    const x = 20 + i * colWidth;
    statBlocks += `
    <text x="${x}" y="90" font-family="'JetBrains Mono', monospace" font-size="30" font-weight="700" fill="#5fb3a3">${s.value}</text>
    <text x="${x}" y="115" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5c6b70">${s.label}</text>`;
    if (i > 0) {
      statBlocks += `\n    <line x1="${x - 20}" y1="55" x2="${x - 20}" y2="120" stroke="#1f2a2e" stroke-width="1"/>`;
    }
  });

  const svg = `<svg viewBox="0 0 ${cardWidth} ${cardHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#0a0e11" stroke="#1f2a2e"/>
  <rect x="0" y="0" width="${cardWidth}" height="34" rx="10" fill="#101619"/>
  <rect x="0" y="24" width="${cardWidth}" height="10" fill="#101619"/>
  <circle cx="18" cy="17" r="5" fill="#e0605a"/>
  <circle cx="36" cy="17" r="5" fill="#e0b95a"/>
  <circle cx="54" cy="17" r="5" fill="#5fbf6f"/>
  <text x="${cardWidth / 2}" y="21" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" fill="#5c6b70">stats.json</text>
  ${statBlocks}
</svg>`;

  fs.writeFileSync("stats-card.svg", svg);
  console.log(`Wrote stats-card.svg — repos:${totalRepos} stars:${totalStars} commits:${totalCommitsThisYear} followers:${followers}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
