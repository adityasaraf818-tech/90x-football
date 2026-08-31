// =====================================================
// 90X FOOTBALL SERVER
// =====================================================

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// =====================================================
// API KEYS
// =====================================================

const NEWS_API_KEY = process.env.NEWS_API_KEY;

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(express.static(path.join(__dirname)));

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =====================================================
// FOOTBALL API HELPER
// =====================================================

async function footballAPI(endpoint) {
  const response = await fetch(`https://api.football-data.org/v4${endpoint}`, {
    headers: {
      "X-Auth-Token": FOOTBALL_API_KEY,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Football API ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

// =====================================================
// MATCHES
// =====================================================

app.get("/api/matches", async (req, res) => {
  try {
    console.log("Loading football matches...");

    const type = req.query.type || "live";

    // -----------------------------------------
    // LIVE
    // -----------------------------------------

    if (type === "live") {
      const data = await footballAPI("/matches?status=IN_PLAY,PAUSED");

      return res.json({
        status: "ok",
        matches: data.matches || [],
      });
    }

    // -----------------------------------------
    // UPCOMING
    // -----------------------------------------

    const today = new Date();

    const nextWeek = new Date();

    nextWeek.setDate(today.getDate() + 7);

    const dateFrom = today.toISOString().split("T")[0];

    const dateTo = nextWeek.toISOString().split("T")[0];

    const data = await footballAPI(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    );

    const matches = (data.matches || []).filter(
      (match) => match.status === "SCHEDULED" || match.status === "TIMED",
    );

    return res.json({
      status: "ok",

      matches: matches.slice(0, 30),
    });
  } catch (error) {
    console.error("MATCHES ERROR:", error);

    res.status(500).json({
      error: "Unable to load football matches",

      matches: [],
    });
  }
});

// =====================================================
// NEWS
// =====================================================

app.get("/api/news", async (req, res) => {
  try {
    console.log("Loading football news...");

    if (!NEWS_API_KEY) {
      return res.status(500).json({
        error: "NEWS_API_KEY is missing",
      });
    }

    const query = encodeURIComponent(
      'soccer OR football OR "Premier League" OR "Champions League" OR "La Liga" OR Bundesliga OR "Serie A" OR "Ligue 1" OR UEFA OR FIFA OR "Real Madrid" OR Barcelona OR Arsenal OR Liverpool OR "Manchester City" OR "Manchester United" OR Chelsea OR Bayern OR Juventus OR PSG',
    );

    const url =
      `https://newsapi.org/v2/everything?` +
      `q=${query}` +
      `&language=en` +
      `&sortBy=publishedAt` +
      `&pageSize=30` +
      `&apiKey=${NEWS_API_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    console.log("News API status:", response.status);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "News API failed",

        details: data,
      });
    }

    const articles = (data.articles || []).filter((article) => {
      return article.title && article.url;
    });

    console.log(`Football articles found: ${articles.length}`);

    return res.json({
      status: "ok",

      articles: articles.slice(0, 10),
    });
  } catch (error) {
    console.error("NEWS ERROR:", error);

    return res.status(500).json({
      error: "Unable to load football news",

      articles: [],
    });
  }
});

// =====================================================
// TRANSFERS
// =====================================================

app.get("/api/transfers", async (req, res) => {
  try {
    console.log("Loading transfer news...");

    if (!NEWS_API_KEY) {
      return res.status(500).json({
        error: "NEWS_API_KEY is missing",

        articles: [],
      });
    }

    const query = encodeURIComponent(
      'football transfer OR football transfers OR transfer rumours OR transfer news OR "transfer window"',
    );

    const url =
      `https://newsapi.org/v2/everything?` +
      `q=${query}` +
      `&language=en` +
      `&sortBy=publishedAt` +
      `&pageSize=20` +
      `&apiKey=${NEWS_API_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Transfer news API failed",

        articles: [],
      });
    }

    const articles = (data.articles || []).filter((article) => {
      return article.title && article.url;
    });

    return res.json({
      status: "ok",

      articles: articles.slice(0, 10),
    });
  } catch (error) {
    console.error("TRANSFER ERROR:", error);

    return res.status(500).json({
      error: "Unable to load transfer news",

      articles: [],
    });
  }
});

// =====================================================
// STANDINGS
// =====================================================

app.get("/api/standings/:league", async (req, res) => {
  try {
    const league = req.params.league.toUpperCase();

    const allowedLeagues = ["PL", "PD", "BL1", "SA"];

    if (!allowedLeagues.includes(league)) {
      return res.status(400).json({
        error: "Invalid league",
      });
    }

    console.log(`Loading standings: ${league}`);

    const data = await footballAPI(`/competitions/${league}/standings`);

    return res.json(data);
  } catch (error) {
    console.error("STANDINGS ERROR:", error);

    return res.status(500).json({
      error: "Unable to load standings",

      standings: [],
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log("");
  console.log("================================");

  console.log("       90X FOOTBALL");

  console.log("================================");

  console.log(`Server: http://localhost:${PORT}`);

  console.log("");
});
