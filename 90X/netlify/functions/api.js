// 90X FOOTBALL - Netlify API function
// This function is intentionally standalone so Netlify does not need to bundle server.js.

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

const cache = new Map();
const CACHE_MS = 60 * 1000;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=30",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function getCached(key) {
  const item = cache.get(key);
  if (!item || Date.now() - item.time > CACHE_MS) return null;
  return item.value;
}

function setCached(key, value) {
  cache.set(key, { time: Date.now(), value });
}

async function footballAPI(endpoint) {
  if (!FOOTBALL_API_KEY) {
    throw new Error("FOOTBALL_API_KEY is missing in Netlify environment variables");
  }

  const response = await fetch(`https://api.football-data.org/v4${endpoint}`, {
    headers: { "X-Auth-Token": FOOTBALL_API_KEY },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `HTTP ${response.status}`;
    throw new Error(`football-data.org: ${message}`);
  }

  return data;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function readTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? escapeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()) : "";
}

async function rssNews(url, category) {
  const cached = getCached(`rss:${url}`);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: { "User-Agent": "90X-Football/1.0" },
  });

  if (!response.ok) throw new Error(`News feed returned HTTP ${response.status}`);

  const xml = await response.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

  const articles = blocks.slice(0, 20).map((block) => ({
    title: readTag(block, "title"),
    description: readTag(block, "description"),
    url: readTag(block, "link"),
    publishedAt: readTag(block, "pubDate"),
    urlToImage: "",
    source: { name: category },
  })).filter((article) => article.title && article.url);

  setCached(`rss:${url}`, articles);
  return articles;
}

async function loadNews(transfers = false) {
  // BBC Sport RSS is used instead of NewsAPI so the public Netlify site does not
  // depend on a development-only NewsAPI subscription.
  const feeds = transfers
    ? [
        ["https://feeds.bbci.co.uk/sport/football/gossip/rss.xml", "BBC Sport - Transfer Gossip"],
        ["https://www.skysports.com/rss/12040", "Sky Sports - Transfer Centre"],
      ]
    : [
        ["https://feeds.bbci.co.uk/sport/football/rss.xml", "BBC Sport - Football"],
        ["https://www.skysports.com/rss/12040", "Sky Sports - Football"],
      ];

  const results = await Promise.allSettled(feeds.map(([url, source]) => rssNews(url, source)));
  const articles = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);

  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url || article.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function getMatches(type) {
  const cacheKey = `matches:${type}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // football-data.org's free tier provides fixtures/schedules but not live scores.
  // Therefore live mode returns a clean empty result instead of a failed API call.
  if (type === "live") {
    const result = {
      status: "ok",
      matches: [],
      message: "Live scores require a football-data.org plan with livescores.",
    };
    setCached(cacheKey, result);
    return result;
  }

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const data = await footballAPI(
    `/matches?dateFrom=${dateOnly(today)}&dateTo=${dateOnly(nextWeek)}`,
  );

  const matches = (data.matches || []).filter((match) =>
    ["SCHEDULED", "TIMED"].includes(match.status),
  );

  const result = { status: "ok", matches: matches.slice(0, 30) };
  setCached(cacheKey, result);
  return result;
}

async function getStandings(league) {
  const allowed = ["PL", "PD", "BL1", "SA"];
  if (!allowed.includes(league)) {
    return { error: "Invalid league" };
  }

  const cacheKey = `standings:${league}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await footballAPI(`/competitions/${league}/standings`);
  setCached(cacheKey, data);
  return data;
}

exports.handler = async (event) => {
  try {
    const path = event.path || "";
    const method = event.httpMethod || "GET";

    if (method !== "GET") return json(405, { error: "Method not allowed" });

    // Netlify sends the original /api/... path because of our redirect.
    const apiPath = path.replace(/^.*?\/api\/?/, "/");
    const parts = apiPath.split("/").filter(Boolean);

    if (parts[0] === "health") {
      return json(200, {
        status: "ok",
        footballApiKeyConfigured: Boolean(FOOTBALL_API_KEY),
      });
    }

    if (parts[0] === "matches") {
      const type = event.queryStringParameters?.type || "live";
      return json(200, await getMatches(type));
    }

    if (parts[0] === "news") {
      return json(200, { status: "ok", articles: await loadNews(false) });
    }

    if (parts[0] === "transfers") {
      return json(200, { status: "ok", articles: await loadNews(true) });
    }

    if (parts[0] === "standings" && parts[1]) {
      const league = parts[1].toUpperCase();
      const data = await getStandings(league);
      return json(data.error ? 400 : 200, data);
    }

    return json(404, { error: "API route not found" });
  } catch (error) {
    console.error("90X API ERROR:", error);
    return json(500, {
      error: "Unable to load football data",
      details: error.message,
      matches: [],
      articles: [],
    });
  }
};
