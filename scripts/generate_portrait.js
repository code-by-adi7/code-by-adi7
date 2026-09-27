// generate_portrait.js
// Fetches the user's GitHub avatar image, embeds it as base64 inside the
// portrait SVG (so it survives GitHub's SVG sanitization, which strips
// external <image> references), and applies a pixel-glitch effect on top
// of the real photo instead of a plain letter.
//
// Requires env var: GH_USERNAME (no token needed, avatars are public)

const fs = require("fs");

const USERNAME = process.env.GH_USERNAME || "code-by-adi7";

async function main() {
  const avatarUrl = `https://avatars.githubusercontent.com/${USERNAME}?size=200`;

  const res = await fetch(avatarUrl);
  if (!res.ok) {
    console.error(`Failed to fetch avatar: ${res.status}`);
    process.exit(1);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUri = `data:image/png;base64,${base64}`;

  const svg = `<svg viewBox="0 0 380 420" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#12181c"/>
      <stop offset="100%" stop-color="#0a0e11"/>
    </linearGradient>
    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#5fb3a3"/>
      <stop offset="100%" stop-color="#3d7d72"/>
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="190" cy="140" r="56"/>
    </clipPath>
    <filter id="rTint" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
    </filter>
    <filter id="cTint" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="380" height="420" rx="10" fill="url(#bgGrad)" stroke="#1f2a2e" stroke-width="1"/>

  <rect x="0" y="0" width="380" height="34" rx="10" fill="#101619"/>
  <rect x="0" y="24" width="380" height="10" fill="#101619"/>
  <circle cx="18" cy="17" r="5" fill="#e0605a"/>
  <circle cx="36" cy="17" r="5" fill="#e0b95a"/>
  <circle cx="54" cy="17" r="5" fill="#5fbf6f"/>
  <text x="190" y="21" text-anchor="middle" font-family="'JetBrains Mono', 'Fira Code', monospace" font-size="11" fill="#5c6b70">whoami.sh</text>

  <circle cx="190" cy="140" r="66" fill="none" stroke="url(#ring)" stroke-width="3"/>

  <g clip-path="url(#avatarClip)">
    <rect x="134" y="84" width="112" height="112" fill="#1a2226"/>

    <image href="${dataUri}" x="134" y="84" width="112" height="112" preserveAspectRatio="xMidYMid slice">
      <animate attributeName="opacity" values="1;1;0.3;1;1;1;0.35;1;1" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
    </image>

    <image href="${dataUri}" x="131" y="84" width="112" height="112" preserveAspectRatio="xMidYMid slice" filter="url(#rTint)" opacity="0" style="mix-blend-mode:screen">
      <animate attributeName="opacity" values="0;0;0.55;0;0;0;0.5;0;0" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="x" values="131;131;124;131;131;131;140;131;131" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
    </image>

    <image href="${dataUri}" x="137" y="84" width="112" height="112" preserveAspectRatio="xMidYMid slice" filter="url(#cTint)" opacity="0" style="mix-blend-mode:screen">
      <animate attributeName="opacity" values="0;0;0.55;0;0;0;0.5;0;0" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
      <animate attributeName="x" values="137;137;144;137;137;137;128;137;137" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
    </image>

    <g fill="#5fb3a3">
      <rect x="140" y="108" width="100" height="6" opacity="0">
        <animate attributeName="opacity" values="0;0;0.8;0;0" keyTimes="0;0.565;0.58;0.60;1" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="x" values="140;140;150;134;140" keyTimes="0;0.565;0.58;0.60;1" dur="6s" repeatCount="indefinite"/>
      </rect>
      <rect x="140" y="140" width="100" height="4" opacity="0">
        <animate attributeName="opacity" values="0;0;0.8;0;0" keyTimes="0;0.905;0.92;0.94;1" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="x" values="140;140;128;146;140" keyTimes="0;0.905;0.92;0.94;1" dur="6s" repeatCount="indefinite"/>
      </rect>
      <rect x="140" y="164" width="100" height="5" opacity="0">
        <animate attributeName="opacity" values="0;0;0.7;0;0" keyTimes="0;0.60;0.615;0.63;1" dur="6s" repeatCount="indefinite"/>
        <animate attributeName="x" values="140;140;146;136;140" keyTimes="0;0.60;0.615;0.63;1" dur="6s" repeatCount="indefinite"/>
      </rect>
    </g>

    <rect x="134" y="84" width="112" height="112" fill="#5fb3a3" opacity="0">
      <animate attributeName="opacity" values="0;0;0.06;0;0;0;0.05;0;0" keyTimes="0;0.55;0.58;0.61;0.75;0.90;0.93;0.96;1" dur="6s" repeatCount="indefinite"/>
    </rect>
  </g>

  <text x="190" y="228" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="14" fill="#e8ece9" font-weight="600">Adithya</text>
  <text x="190" y="250" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5c6b70">@${USERNAME}</text>

  <rect x="28" y="272" width="324" height="120" rx="6" fill="#0d1215" stroke="#1f2a2e" stroke-width="1"/>
  <text x="46" y="298" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5fb3a3">$ <tspan fill="#c9d1d3">whoami</tspan></text>
  <text x="46" y="320" font-family="'JetBrains Mono', monospace" font-size="12" fill="#c9d1d3">BCA student · building things</text>
  <text x="46" y="340" font-family="'JetBrains Mono', monospace" font-size="12" fill="#c9d1d3">across web, systems &amp; data</text>
  <text x="46" y="366" font-family="'JetBrains Mono', monospace" font-size="12" fill="#5fb3a3">$ <tspan fill="#c9d1d3">status</tspan></text>
  <text x="46" y="386" font-family="'JetBrains Mono', monospace" font-size="12" fill="#e8ece9">learning in public, one repo at a time</text>
</svg>
`;

  fs.writeFileSync("portrait.svg", svg);
  console.log("Wrote portrait.svg with embedded avatar for", USERNAME);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
