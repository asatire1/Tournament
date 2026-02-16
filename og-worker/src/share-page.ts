const FORMAT_NAMES: Record<string, string> = {
  americano: "Americano",
  mexicano: "Mexicano",
  mixicano: "Mixicano",
  tournament: "Tournament",
  mix: "Mix",
  knockout: "Knockout",
  "team-league": "Team League",
  "round-robin": "Round Robin",
  swiss: "Swiss",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function generateSharePage(
  format: string,
  id: string,
  name: string,
  requestUrl?: string
): Response {
  const formatName = FORMAT_NAMES[format] || format;
  const safeName = escapeHtml(name);
  const safeFormatName = escapeHtml(formatName);

  // Derive base URL from request so it works on workers.dev and custom domains
  let baseUrl = "https://uberpadel-og.asatire.workers.dev";
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      baseUrl = u.origin;
    } catch { /* fallback */ }
  }

  const ogImageUrl = `${baseUrl}/${encodeURIComponent(format)}/${encodeURIComponent(id)}.png`;
  const ogPageUrl = `${baseUrl}/${encodeURIComponent(format)}/${encodeURIComponent(id)}`;
  const redirectUrl = `https://uberpadel.com/quick-play/${encodeURIComponent(format)}/#/t/${encodeURIComponent(id)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeName} — UberPadel ${safeFormatName}</title>

  <!-- Open Graph -->
  <meta property="og:title" content="${safeName}">
  <meta property="og:description" content="Live ${safeFormatName} tournament standings on UberPadel">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${ogPageUrl}">
  <meta property="og:type" content="website">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeName}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <!-- Auto-redirect -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #F9FAFB;
      color: #374151;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    a {
      color: #2563EB;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <p>Redirecting to UberPadel...</p>
    <p><a href="${redirectUrl}">Click here if you are not redirected automatically</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
