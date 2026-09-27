// generate_heatmap.js
// Fetches the last ~53 weeks of GitHub contribution data via the GraphQL API
// and renders it as an arcade-cabinet-styled SVG heatmap (contrib-heatmap.svg)
// with a pixel-art ship flying along the bottom, firing a laser up through
// the grid, on a continuous loop.
//
// Requires env vars:
//   GH_TOKEN     - a token with read access (the default GITHUB_TOKEN works
//                  for public contribution data when run from the repo's own
//                  Action)
//   GH_USERNAME  - the GitHub username to fetch contributions for

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
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
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

  const calendar = json.data.user.contributionsCollection.contributionCalendar;
  const weeks = calendar.weeks;
  const total = calendar.totalContributions;

  const cell = 12;
  const gap = 3;
  const leftPad = 30;
  const topPad = 40;
  const gridWidth = leftPad + weeks.length * (cell + gap) + 20;
  const gridHeight = topPad + 7 * (cell + gap) + 20;

  const bezel = 34;
  const marqueeH = 34;
  const shipLaneH = 26;
  const width = gridWidth + bezel * 2;
  const height = gridHeight + bezel * 2 + marqueeH + shipLaneH;

  function colorFor(count) {
    if (count === 0) return "#161b1e";
    if (count <= 2) return "#264742";
    if (count <= 5) return "#377b6f";
    if (count <= 9) return "#4ea592";
    return "#5fdcc0";
  }

  let cells = "";
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day) => {
      const date = new Date(day.date);
      const dow = date.getUTCDay();
      const x = leftPad + wi * (cell + gap);
      const y = topPad + dow * (cell + gap);
      const fill = colorFor(day.contributionCount);
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${fill}"><title>${day.date}: ${day.contributionCount} contributions</title></rect>\n`;
    });
  });

  let monthLabels = "";
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week.contributionDays[0];
    if (!firstDay) return;
    const date = new Date(firstDay.date);
    const month = date.getUTCMonth();
    if (month !== lastMonth) {
      const x = leftPad + wi * (cell + gap);
      monthLabels += `<text x="${x}" y="${topPad - 12}" font-family="'JetBrains Mono', monospace" font-size="10" fill="#5c6b70">${date.toLocaleString("en-US", { month: "short" })}</text>\n`;
      lastMonth = month;
    }
  });

  const gridOffsetX = bezel;
  const gridOffsetY = bezel;
  const screenInnerW = gridWidth + 28;
  const screenInnerH = gridHeight + 8 + shipLaneH;
  const shipTravel = screenInnerW - 40;

  const svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cabinetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2a1f3d"/>
      <stop offset="100%" stop-color="#1a1229"/>
    </linearGradient>
    <linearGradient id="marqueeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff2e63"/>
      <stop offset="50%" stop-color="#ff9f1c"/>
      <stop offset="100%" stop-color="#ff2e63"/>
    </linearGradient>
    <pattern id="scanlines" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="2" fill="#000" opacity="0.12"/>
    </pattern>
    <clipPath id="screenClip">
      <rect x="${gridOffsetX - 14}" y="${gridOffsetY - 4}" width="${screenInnerW}" height="${screenInnerH}" rx="6"/>
    </clipPath>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" rx="14" fill="url(#cabinetGrad)" stroke="#0d0815" stroke-width="2"/>

  <circle cx="14" cy="14" r="4" fill="#0d0815"/>
  <circle cx="${width - 14}" cy="14" r="4" fill="#0d0815"/>
  <circle cx="14" cy="${height - 14}" r="4" fill="#0d0815"/>
  <circle cx="${width - 14}" cy="${height - 14}" r="4" fill="#0d0815"/>

  <rect x="10" y="8" width="${width - 20}" height="20" rx="4" fill="url(#marqueeGrad)"/>
  <text x="${width / 2}" y="22" text-anchor="middle" font-family="'Press Start 2P', 'JetBrains Mono', monospace" font-size="10" fill="#1a1229" font-weight="700">CONTRIB-INVADERS</text>

  <rect x="${gridOffsetX - 14}" y="${gridOffsetY - 4}" width="${screenInnerW}" height="${screenInnerH}" rx="6" fill="#050508" stroke="#000" stroke-width="3"/>
  <rect x="${gridOffsetX - 14}" y="${gridOffsetY - 4}" width="${screenInnerW}" height="${screenInnerH}" rx="6" fill="#5fdcc0" opacity="0.04"/>

  <g clip-path="url(#screenClip)">
    <g transform="translate(${gridOffsetX}, ${gridOffsetY})">
      <text x="0" y="24" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5fdcc0" font-weight="700">${total} CONTRIBUTIONS · HIGH SCORE</text>
      ${monthLabels}
      ${cells}
    </g>

    <g id="laserGroup">
      <rect x="0" y="0" width="3" height="16" fill="#ff2e63">
        <animate attributeName="y" values="${gridOffsetY + gridHeight};${gridOffsetY + gridHeight};-20;-20" keyTimes="0;0.05;0.45;1" dur="2.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.42;0.45;1" dur="2.6s" repeatCount="indefinite"/>
        <animate attributeName="x" values="${gridOffsetX + 20};${gridOffsetX + 20};${gridOffsetX + 20 + shipTravel};${gridOffsetX + 20 + shipTravel};${gridOffsetX + 20}" keyTimes="0;0.0;0.5;0.55;1" dur="5.2s" repeatCount="indefinite"/>
      </rect>
    </g>

    <g id="ship" transform="translate(${gridOffsetX + 12}, ${gridOffsetY + gridHeight + 6})">
      <animateTransform attributeName="transform" type="translate"
        values="${gridOffsetX + 12},${gridOffsetY + gridHeight + 6}; ${gridOffsetX + 12 + shipTravel},${gridOffsetY + gridHeight + 6}; ${gridOffsetX + 12 + shipTravel},${gridOffsetY + gridHeight + 6}; ${gridOffsetX + 12},${gridOffsetY + gridHeight + 6}; ${gridOffsetX + 12},${gridOffsetY + gridHeight + 6}"
        keyTimes="0;0.5;0.55;1;1"
        dur="5.2s" repeatCount="indefinite" additive="replace"/>
      <rect x="7" y="0" width="2" height="2" fill="#5fdcc0"/>
      <rect x="5" y="2" width="6" height="2" fill="#5fdcc0"/>
      <rect x="3" y="4" width="10" height="2" fill="#5fdcc0"/>
      <rect x="0" y="6" width="16" height="2" fill="#4ea592"/>
      <rect x="2" y="8" width="2" height="2" fill="#ff9f1c"/>
      <rect x="12" y="8" width="2" height="2" fill="#ff9f1c"/>
    </g>
  </g>

  <rect x="${gridOffsetX - 14}" y="${gridOffsetY - 4}" width="${screenInnerW}" height="${screenInnerH}" rx="6" fill="url(#scanlines)"/>

  <text x="${width / 2}" y="${height - 14}" text-anchor="middle" font-family="'Press Start 2P', 'JetBrains Mono', monospace" font-size="9" fill="#ff9f1c">
    <animate attributeName="opacity" values="1;1;0.2;1" keyTimes="0;0.85;0.9;1" dur="2.4s" repeatCount="indefinite"/>
    INSERT COIN TO CONTINUE
  </text>

  <g fill="#0d0815">
    <circle cx="20" cy="${height / 2}" r="2.5"/>
    <circle cx="20" cy="${height / 2 + 10}" r="2.5"/>
    <circle cx="20" cy="${height / 2 - 10}" r="2.5"/>
    <circle cx="${width - 20}" cy="${height / 2}" r="2.5"/>
    <circle cx="${width - 20}" cy="${height / 2 + 10}" r="2.5"/>
    <circle cx="${width - 20}" cy="${height / 2 - 10}" r="2.5"/>
  </g>
</svg>`;

  fs.writeFileSync("contrib-heatmap.svg", svg);
  console.log(`Wrote contrib-heatmap.svg (${total} total contributions)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
