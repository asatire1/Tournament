import { ImageResponse } from "workers-og";
import type { TournamentInfo } from "./standings";

const ACCENT_GRADIENTS: Record<string, [string, string]> = {
  blue: ["#2563EB", "#1D4ED8"],
  teal: ["#0D9488", "#047857"],
  purple: ["#9333EA", "#7C3AED"],
  rose: ["#E11D48", "#BE185D"],
  emerald: ["#059669", "#047857"],
  amber: ["#D97706", "#B45309"],
  orange: ["#EA580C", "#C2410C"],
  indigo: ["#4F46E5", "#4338CA"],
};

// Must use TTF (not WOFF2) — workers-og / Satori only supports TTF/OTF
const FONT_URL =
  "https://fonts.gstatic.com/s/spacegrotesk/v22/V8mQoQDjQSkFtoMM3T6r8E7mF71Q-gOoraIAEj4PVksj.ttf";

let fontCache: ArrayBuffer | null = null;

async function loadFont(ctx: ExecutionContext): Promise<ArrayBuffer> {
  // Return in-memory cached font if available
  if (fontCache) {
    return fontCache;
  }

  // Check Cloudflare Cache API
  const cache = caches.default;
  const cacheKey = new Request(FONT_URL);
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    const buffer = await cachedResponse.arrayBuffer();
    fontCache = buffer;
    return buffer;
  }

  // Fetch from Google Fonts CDN
  const response = await fetch(FONT_URL);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  // Cache in Cloudflare Cache API
  const cacheResponse = new Response(buffer, {
    headers: {
      "Content-Type": "font/woff2",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  ctx.waitUntil(cache.put(cacheKey, cacheResponse));

  // Cache in-memory
  fontCache = buffer;
  return buffer;
}

function getMedalEmoji(rank: number): string {
  if (rank === 1) return "\uD83E\uDD47";
  if (rank === 2) return "\uD83E\uDD48";
  if (rank === 3) return "\uD83E\uDD49";
  return `${rank}`;
}

function getGradient(accentColor: string): [string, string] {
  return ACCENT_GRADIENTS[accentColor] || ACCENT_GRADIENTS.blue;
}

function getRankLabel(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}`;
}

function buildHtml(info: TournamentInfo): string {
  const [gradStart, gradEnd] = getGradient(info.accentColor);
  const standings = info.standings.slice(0, 8);
  const hasStandings = standings.length > 0;
  const progressPercent =
    info.totalMatches > 0
      ? Math.round((info.completedMatches / info.totalMatches) * 100)
      : 0;

  // Build standings rows
  const rows = standings
    .map((s) => {
      const rankLabel = getRankLabel(s.rank);
      const rowBg = s.rank % 2 === 0 ? "#F9FAFB" : "#FFFFFF";
      const rankColor = s.rank <= 3 ? gradStart : "#6B7280";
      const nameWeight = s.rank <= 3 ? 700 : 400;

      return `<div style="display:flex;width:1200px;flexDirection:row;alignItems:center;height:44px;backgroundColor:${rowBg};">
        <div style="display:flex;width:80px;fontSize:16px;fontWeight:700;color:${rankColor};justifyContent:center;">${rankLabel}</div>
        <div style="display:flex;flex:1;fontSize:18px;fontWeight:${nameWeight};color:#111827;paddingLeft:16px;">${escapeHtml(s.name)}</div>
        <div style="display:flex;width:100px;fontSize:18px;fontWeight:700;color:${gradStart};justifyContent:flex-end;paddingRight:40px;">${s.points}</div>
      </div>`;
    })
    .join("");

  // No-standings layout: show a larger hero card
  const noStandingsContent = !hasStandings ? `
    <div style="display:flex;flex:1;width:1200px;flexDirection:column;justifyContent:center;alignItems:center;backgroundColor:#F9FAFB;">
      <div style="display:flex;fontSize:20px;color:#6B7280;">Scores being recorded live</div>
    </div>` : "";

  // Standings table (only when we have data)
  const standingsContent = hasStandings ? `
    <div style="display:flex;width:1200px;flexDirection:row;alignItems:center;height:36px;backgroundColor:#F3F4F6;borderBottom:1px solid #E5E7EB;">
      <div style="display:flex;width:80px;fontSize:12px;fontWeight:700;color:#6B7280;justifyContent:center;">RANK</div>
      <div style="display:flex;flex:1;fontSize:12px;fontWeight:700;color:#6B7280;paddingLeft:16px;">PLAYER</div>
      <div style="display:flex;width:100px;fontSize:12px;fontWeight:700;color:#6B7280;justifyContent:flex-end;paddingRight:40px;">PTS</div>
    </div>
    ${rows}
    <div style="display:flex;flex:1;width:1200px;backgroundColor:#FFFFFF;"></div>` : "";

  return `<div style="display:flex;flexDirection:column;width:1200px;height:630px;backgroundColor:#FFFFFF;fontFamily:'Space Grotesk',sans-serif;">
    <div style="display:flex;width:1200px;flexDirection:column;padding:28px 40px 20px 40px;backgroundImage:linear-gradient(135deg, ${gradStart}, ${gradEnd});">
      <div style="display:flex;fontSize:32px;fontWeight:700;color:#FFFFFF;">${escapeHtml(info.name)}</div>
      <div style="display:flex;fontSize:16px;color:rgba(255,255,255,0.85);marginTop:4px;">${escapeHtml(info.formatName)}${info.subtitle ? " \u2014 " + escapeHtml(info.subtitle) : ""}</div>
    </div>
    ${standingsContent}
    ${noStandingsContent}
    <div style="display:flex;width:1200px;flexDirection:row;alignItems:center;height:48px;backgroundColor:#F9FAFB;borderTop:1px solid #E5E7EB;paddingLeft:24px;paddingRight:24px;">
      <div style="display:flex;flexDirection:row;alignItems:center;flex:1;">
        <div style="display:flex;width:200px;height:8px;backgroundColor:#E5E7EB;borderRadius:4px;overflow:hidden;position:relative;">
          <div style="display:flex;width:${progressPercent}%;height:8px;backgroundColor:${gradStart};borderRadius:4px;"></div>
        </div>
        <div style="display:flex;fontSize:13px;color:#6B7280;marginLeft:12px;">${info.completedMatches}/${info.totalMatches} matches</div>
      </div>
      <div style="display:flex;fontSize:16px;fontWeight:700;color:#9CA3AF;">uberpadel.com</div>
    </div>
  </div>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function generateOgImage(
  info: TournamentInfo,
  ctx: ExecutionContext
): Promise<Response> {
  const font = await loadFont(ctx);
  const html = buildHtml(info);

  return new ImageResponse(html, {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Space Grotesk",
        data: font,
        weight: 700,
        style: "normal",
      },
    ],
  });
}
