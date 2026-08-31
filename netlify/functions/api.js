const serverless = require("serverless-http");
const express = require("express");

const app = express();

app.use(express.json());

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;

async function footballAPI(endpoint) {
  const response = await fetch(
    `https://api.football-data.org/v4${endpoint}`,
    {
      headers: {
        "X-Auth-Token": FOOTBALL_API_KEY,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Football API ${response.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

// MATCHES
app.get("/matches", async (req, res) => {
  try {
    const type = req.query.type || "live";

    if (type === "live") {
      const data = await footballAPI(
        "/matches?status=IN_PLAY,PAUSED"
      );

      return res.json({
        status: "ok",
        matches: data.matches || [],
      });
    }

    const today = new Date();
    const nextWeek = new Date();

    nextWeek.setDate(today.getDate() + 7);

    const dateFrom = today.toISOString().split("T")[0];
    const dateTo = nextWeek.toISOString().split("T")[0];

    const data = await footballAPI(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
    );

    const matches = (data.matches || []).filter(
      (match) =>
        match.status === "SCHEDULED" ||
        match.status === "TIMED"
    );

    return res.json({
      status: "ok",
      matches: matches.slice(0, 30),
    });
  } catch (error) {
    console.error("MATCHES ERROR:", error);

    return res.status(500).json({
      error: "Unable to load football matches",
      matches: [],
    });
  }
});

// NEWS
app.get("/news", async (req, res) => {
  try {
    if (!NEWS_API_KEY) {
      return res.status(500).json({
        error: "NEWS_API_KEY is missing",
        articles: [],
      });
    }

    const query = encodeURIComponent(
      'soccer OR football OR "Premier League" OR "Champions League" OR "La Liga" OR Bundesliga OR "Serie A" OR "Ligue 1" OR UEFA OR FIFA'
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

    if (!response.ok) {
      return res.status(response.status).json({
        error: "News API failed",
        details: data,
      });
    }

    const articles = (data.articles || []).filter(
      (article) => article.title && article.url
    );

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

// TRANSFERS
app.get("/transfers", async (req, res) => {
  try {
    if (!NEWS_API_KEY) {
      return res.status(500).json({
        error: "NEWS_API_KEY is missing",
        articles: [],
      });
    }

    const query = encodeURIComponent(
      "football transfer OR football transfers OR transfer rumours OR transfer news"
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

    const articles = (data.articles || []).filter(
      (article) => article.title && article.url
    );

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

// STANDINGS
app.get("/standings/:league", async (req, res) => {
  try {
    const league = req.params.league.toUpperCase();

    const allowedLeagues = ["PL", "PD", "BL1", "SA"];

    if (!allowedLeagues.includes(league)) {
      return res.status(400).json({
        error: "Invalid league",
      });
    }

    const data = await footballAPI(
      `/competitions/${league}/standings`
    );

    return res.json(data);
  } catch (error) {
    console.error("STANDINGS ERROR:", error);

    return res.status(500).json({
      error: "Unable to load standings",
      standings: [],
    });
  }
});

module.exports.handler = serverless(app);
