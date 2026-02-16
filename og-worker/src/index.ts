import { fetchTournament, fetchTournamentName, VALID_FORMATS } from "./firebase";
import { calculateTournamentInfo } from "./standings";
import { generateOgImage } from "./image";
import { generateSharePage } from "./share-page";

export interface Env {}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
};

const ID_PATTERN = /^[a-zA-Z0-9]{4,20}$/;

function addCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    newHeaders.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function generateFallbackOgHtml(): string {
  return `<div style="display: flex; flex-direction: column; width: 1200px; height: 630px; backgroundImage: linear-gradient(135deg, #2563EB, #1D4ED8); justify-content: center; align-items: center; font-family: 'Space Grotesk', sans-serif;">
    <div style="display: flex; font-size: 64px; margin-bottom: 16px;">\uD83C\uDFBE</div>
    <div style="display: flex; font-size: 48px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">UberPadel</div>
    <div style="display: flex; font-size: 22px; color: rgba(255,255,255,0.8);">Padel Tournament Platform</div>
  </div>`;
}

type RouteMatch =
  | { type: "image"; format: string; id: string }
  | { type: "share"; format: string; id: string }
  | { type: "home" }
  | { type: "not_found" };

function matchRoute(pathname: string): RouteMatch {
  // Home route
  if (pathname === "/" || pathname === "") {
    return { type: "home" };
  }

  // Image route: /{format}/{id}.png
  const imageMatch = pathname.match(/^\/([^/]+)\/([^/]+)\.png$/);
  if (imageMatch) {
    return { type: "image", format: imageMatch[1], id: imageMatch[2] };
  }

  // Share page route: /{format}/{id}
  const shareMatch = pathname.match(/^\/([^/]+)\/([^/]+)$/);
  if (shareMatch) {
    return { type: "share", format: shareMatch[1], id: shareMatch[2] };
  }

  return { type: "not_found" };
}

function validateFormat(format: string): boolean {
  return (VALID_FORMATS as readonly string[]).includes(format);
}

function validateId(id: string): boolean {
  return ID_PATTERN.test(id);
}

async function handleImageRequest(
  format: string,
  id: string,
  request: Request,
  ctx: ExecutionContext
): Promise<Response> {
  // Validate inputs
  if (!validateFormat(format)) {
    return errorResponse("Invalid format", 400);
  }
  if (!validateId(id)) {
    return errorResponse("Invalid tournament ID", 400);
  }

  // Check Cloudflare Cache API
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return addCors(cachedResponse);
  }

  try {
    // Fetch tournament data and generate image
    const tournament = await fetchTournament(format, id);

    if (!tournament) {
      // Return a fallback branding image for missing tournaments
      const { ImageResponse } = await import("workers-og");
      const fallbackResponse = new ImageResponse(generateFallbackOgHtml(), {
        width: 1200,
        height: 630,
      });

      const fallbackWithHeaders = new Response(fallbackResponse.body, {
        status: 404,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60, s-maxage=300",
          ...CORS_HEADERS,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, fallbackWithHeaders.clone()));
      return fallbackWithHeaders;
    }

    const info = calculateTournamentInfo(format, tournament);
    if (!info) {
      // Tournament data exists but couldn't be parsed — use fallback
      const { ImageResponse } = await import("workers-og");
      const fallbackResponse = new ImageResponse(generateFallbackOgHtml(), {
        width: 1200,
        height: 630,
      });

      const fallbackWithHeaders = new Response(fallbackResponse.body, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=60, s-maxage=300",
          ...CORS_HEADERS,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, fallbackWithHeaders.clone()));
      return fallbackWithHeaders;
    }

    const imageResponse = await generateOgImage(info, ctx);

    // Read image into buffer so we can serve + cache reliably
    const imageBuffer = await imageResponse.arrayBuffer();

    const responseWithCache = new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        ...CORS_HEADERS,
      },
    });

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, responseWithCache.clone()));

    return responseWithCache;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`Image generation failed for ${format}/${id}:`, message);
    return errorResponse(message, 500);
  }
}

async function handleShareRequest(
  format: string,
  id: string,
  request: Request,
  ctx: ExecutionContext
): Promise<Response> {
  // Validate inputs
  if (!validateFormat(format)) {
    return errorResponse("Invalid format", 400);
  }
  if (!validateId(id)) {
    return errorResponse("Invalid tournament ID", 400);
  }

  // Check Cloudflare Cache API
  const cache = caches.default;
  const cacheKey = new Request(request.url);
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    return addCors(cachedResponse);
  }

  try {
    // Fetch tournament name
    const name = await fetchTournamentName(format, id);

    if (!name) {
      // Return a generic share page with fallback name
      const fallbackPage = generateSharePage(format, id, "Tournament", request.url);
      const fallbackWithCors = new Response(fallbackPage.body, {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=300",
          ...CORS_HEADERS,
        },
      });

      ctx.waitUntil(cache.put(cacheKey, fallbackWithCors.clone()));
      return fallbackWithCors;
    }

    const shareResponse = generateSharePage(format, id, name, request.url);

    // Add CORS headers
    const responseWithHeaders = new Response(shareResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        ...CORS_HEADERS,
      },
    });

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, responseWithHeaders.clone()));

    return responseWithHeaders;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error(`Share page failed for ${format}/${id}:`, message);
    return errorResponse(message, 500);
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Only allow GET requests
    if (request.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    const route = matchRoute(pathname);

    switch (route.type) {
      case "home":
        return jsonResponse({
          status: "ok",
          service: "UberPadel OG Image Worker",
          version: "1.0.0",
          endpoints: {
            image: "/{format}/{id}.png",
            share: "/{format}/{id}",
          },
        });

      case "image":
        return handleImageRequest(route.format, route.id, request, ctx);

      case "share":
        return handleShareRequest(route.format, route.id, request, ctx);

      case "not_found":
      default:
        return errorResponse("Not found", 404);
    }
  },
};
