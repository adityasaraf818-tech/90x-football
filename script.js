// =====================================================
// 90X FOOTBALL - FRONTEND
// =====================================================

// =====================================================
// HELPERS
// =====================================================

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function formatDate(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateValue) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =====================================================
// MOBILE MENU
// =====================================================

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", () => {
    if (nav) {
      nav.classList.remove("open");
    }
  });
});

// =====================================================
// MATCHES
// =====================================================

let currentMatchType = "live";

async function loadMatches(type = currentMatchType) {
  const matchesGrid = document.getElementById("matchesGrid");

  if (!matchesGrid) return;

  currentMatchType = type;

  matchesGrid.innerHTML = `
        <p class="loading">
            Loading ${type === "live" ? "live" : "upcoming"} matches...
        </p>
    `;

  try {
    const response = await fetch(
      `/api/matches?type=${encodeURIComponent(type)}`,
    );

    if (!response.ok) {
      throw new Error(`Matches API returned ${response.status}`);
    }

    const data = await response.json();

    const matches = Array.isArray(data.matches) ? data.matches : [];

    if (matches.length === 0) {
      matchesGrid.innerHTML = `
                <p class="loading">
                    No ${type === "live" ? "live" : "upcoming"} matches right now.
                </p>
            `;

      return;
    }

    renderMatches(matches);
  } catch (error) {
    console.error("MATCHES ERROR:", error);

    matchesGrid.innerHTML = `
            <div class="error-message">
                Unable to load matches.
                <br>
                <small>Make sure the server and football API are working.</small>
            </div>
        `;
  }
}

function renderMatches(matches) {
  const matchesGrid = document.getElementById("matchesGrid");

  if (!matchesGrid) return;

  matchesGrid.innerHTML = "";

  matches.slice(0, 12).forEach((match) => {
    const home = match.homeTeam || {};
    const away = match.awayTeam || {};
    const competition = match.competition || {};

    const status = match.status || "SCHEDULED";

    const isLive = status === "IN_PLAY" || status === "PAUSED";

    const homeScore =
      match.score?.fullTime?.home ?? match.score?.halfTime?.home ?? "-";

    const awayScore =
      match.score?.fullTime?.away ?? match.score?.halfTime?.away ?? "-";

    const date = formatDate(match.utcDate);
    const time = formatTime(match.utcDate);

    const card = document.createElement("article");

    card.className = "match-card";

    card.innerHTML = `

            <div class="match-league">
                ${escapeHTML(competition.name || "FOOTBALL")}
            </div>

            <span class="match-status ${isLive ? "live" : ""}">
                ${isLive ? "● LIVE" : escapeHTML(status)}
            </span>

            <div class="match-teams">

                <div class="team">

                    ${
                      home.crest
                        ? `
                                <img
                                    src="${escapeAttribute(home.crest)}"
                                    alt="${escapeAttribute(home.name)}"
                                >
                            `
                        : ""
                    }

                    <div class="team-name">
                        ${escapeHTML(home.shortName || home.name || "HOME")}
                    </div>

                </div>

                <div class="score">

                    ${escapeHTML(homeScore)}
                    -
                    ${escapeHTML(awayScore)}

                </div>

                <div class="team">

                    ${
                      away.crest
                        ? `
                                <img
                                    src="${escapeAttribute(away.crest)}"
                                    alt="${escapeAttribute(away.name)}"
                                >
                            `
                        : ""
                    }

                    <div class="team-name">
                        ${escapeHTML(away.shortName || away.name || "AWAY")}
                    </div>

                </div>

            </div>

            <div class="match-time">

                ${escapeHTML(date)}
                ${date && time ? " • " : ""}
                ${escapeHTML(time)}

            </div>
        `;

    matchesGrid.appendChild(card);
  });
}

// =====================================================
// MATCH TABS
// =====================================================

document.querySelectorAll(".match-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".match-tab").forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    loadMatches(button.dataset.type);
  });
});

const refreshMatches = document.getElementById("refreshMatches");

if (refreshMatches) {
  refreshMatches.addEventListener("click", () => {
    loadMatches(currentMatchType);
  });
}

// =====================================================
// NEWS
// =====================================================

async function loadNews() {
  const newsGrid = document.getElementById("newsGrid");

  if (!newsGrid) return;

  newsGrid.innerHTML = `
        <p class="loading">
            Loading latest football news...
        </p>
    `;

  try {
    const response = await fetch("/api/news");

    if (!response.ok) {
      throw new Error(`News API returned ${response.status}`);
    }

    const data = await response.json();

    const articles = Array.isArray(data.articles) ? data.articles : [];

    if (articles.length === 0) {
      newsGrid.innerHTML = `
                <p class="loading">
                    No football news available right now.
                </p>
            `;

      return;
    }

    renderNews(articles);
  } catch (error) {
    console.error("NEWS ERROR:", error);

    newsGrid.innerHTML = `
            <div class="error-message">
                Unable to load football news.
                <br>
                <small>Check your NEWS_API_KEY in .env</small>
            </div>
        `;
  }
}

function renderNews(articles) {
  const newsGrid = document.getElementById("newsGrid");

  if (!newsGrid) return;

  newsGrid.innerHTML = "";

  articles.slice(0, 9).forEach((article) => {
    const card = document.createElement("article");

    card.className = "news-card";

    const image = article.urlToImage || "image/logo.PNG";

    const title = article.title || "Football News";

    const description =
      article.description || "Latest football news from around the world.";

    const source = article.source?.name || "FOOTBALL";

    const date = formatDate(article.publishedAt);

    card.innerHTML = `

            <img
                src="${escapeAttribute(image)}"
                alt="${escapeAttribute(title)}"
                class="news-image"
            >

            <div class="news-content">

                <span class="news-category">
                    ${escapeHTML(source)}
                </span>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(description)}
                </p>

                <span class="news-date">
                    ${escapeHTML(date)}
                </span>

            </div>
        `;

    const imageElement = card.querySelector(".news-image");

    if (imageElement) {
      imageElement.addEventListener(
        "error",
        () => {
          imageElement.src = "image/logo.PNG";
        },
        { once: true },
      );
    }

    if (article.url) {
      card.addEventListener("click", () => {
        window.open(article.url, "_blank", "noopener,noreferrer");
      });
    }

    newsGrid.appendChild(card);
  });
}

const refreshNews = document.getElementById("refreshNews");

if (refreshNews) {
  refreshNews.addEventListener("click", loadNews);
}

// =====================================================
// TRANSFERS
// =====================================================

async function loadTransfers() {
  const transferGrid = document.querySelector(".transfer-grid");

  if (!transferGrid) return;

  transferGrid.innerHTML = `
        <p class="loading">
            Loading transfer radar...
        </p>
    `;

  try {
    const response = await fetch("/api/transfers");

    if (!response.ok) {
      throw new Error(`Transfer API returned ${response.status}`);
    }

    const data = await response.json();

    const transfers = Array.isArray(data.articles) ? data.articles : [];

    if (transfers.length === 0) {
      transferGrid.innerHTML = `
                <p class="loading">
                    No transfer news available.
                </p>
            `;

      return;
    }

    renderTransfers(transfers);
  } catch (error) {
    console.error("TRANSFER ERROR:", error);

    transferGrid.innerHTML = `
            <div class="error-message">
                Unable to load transfer news.
            </div>
        `;
  }
}

function renderTransfers(transfers) {
  const transferGrid = document.querySelector(".transfer-grid");

  if (!transferGrid) return;

  transferGrid.innerHTML = "";

  transfers.slice(0, 6).forEach((transfer) => {
    const title = transfer.title || "Latest Football Transfer News";

    const description =
      transfer.description ||
      "Latest transfer rumours, deals and player movements from around football.";

    const source = transfer.source?.name || "FOOTBALL";

    const date = formatDate(transfer.publishedAt);

    const url = transfer.url || null;

    const card = document.createElement("article");

    card.className = "transfer-card";

    card.innerHTML = `

            <div class="transfer-top">

                <span class="transfer-tag">
                    TRANSFER
                </span>

                <span class="transfer-status">
                    LATEST
                </span>

            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(description)}
            </p>

            <div class="transfer-route">

                <span>
                    NEWS
                </span>

                <strong>
                    ${escapeHTML(source)}
                </strong>

                <span>
                    ${escapeHTML(date)}
                </span>

            </div>
        `;

    if (url) {
      card.addEventListener("click", () => {
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }

    transferGrid.appendChild(card);
  });
}

const refreshTransfers = document.getElementById("refreshTransfers");

if (refreshTransfers) {
  refreshTransfers.addEventListener("click", loadTransfers);
}

// =====================================================
// STANDINGS
// =====================================================

const leagueNames = {
  PL: "PREMIER LEAGUE",
  PD: "LA LIGA",
  BL1: "BUNDESLIGA",
  SA: "SERIE A",
};

async function loadStandings(league = "PL") {
  const standingsTable = document.getElementById("standingsTable");

  const leagueTitle = document.getElementById("leagueTitle");

  if (!standingsTable) return;

  standingsTable.innerHTML = `
        <p class="loading">
            Loading league standings...
        </p>
    `;

  try {
    const response = await fetch(`/api/standings/${league}`);

    if (!response.ok) {
      throw new Error(`Standings API returned ${response.status}`);
    }

    const data = await response.json();

    const table = data.standings?.[0]?.table || [];

    if (leagueTitle) {
      const name = leagueNames[league] || "LEAGUE";

      const parts = name.split(" ");

      leagueTitle.innerHTML = `${escapeHTML(
        parts.slice(0, -1).join(" "),
      )} <span>${escapeHTML(parts[parts.length - 1])}.</span>`;
    }

    if (table.length === 0) {
      standingsTable.innerHTML = `
                <p class="loading">
                    No standings available.
                </p>
            `;

      return;
    }

    standingsTable.innerHTML = "";

    table.forEach((club) => {
      const row = document.createElement("div");

      row.className = "standing-row";

      const crest = club.team?.crest || "";

      const clubName =
        club.team?.shortName || club.team?.name || "Unknown Club";

      row.innerHTML = `

                <span class="position">
                    ${escapeHTML(club.position)}
                </span>

                <div class="standing-team">

                    ${
                      crest
                        ? `
                                <img
                                    src="${escapeAttribute(crest)}"
                                    alt="${escapeAttribute(clubName)}"
                                    class="standing-logo"
                                >
                            `
                        : `
                                <div class="standing-logo-placeholder">
                                    ⚽
                                </div>
                            `
                    }

                    <span>
                        ${escapeHTML(clubName)}
                    </span>

                </div>

                <span>
                    ${escapeHTML(club.playedGames ?? 0)}
                </span>

                <span>
                    ${escapeHTML(club.goalDifference ?? 0)}
                </span>

                <strong>
                    ${escapeHTML(club.points ?? 0)}
                </strong>
            `;

      standingsTable.appendChild(row);
    });
  } catch (error) {
    console.error("STANDINGS ERROR:", error);

    standingsTable.innerHTML = `
            <div class="error-message">
                Unable to load league standings.
                <br>
                <small>
                    Check your FOOTBALL_API_KEY in .env
                </small>
            </div>
        `;
  }
}

// =====================================================
// LEAGUE BUTTONS
// =====================================================

document.querySelectorAll(".league-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".league-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    button.classList.add("active");

    loadStandings(button.dataset.league);
  });
});

// =====================================================
// START EVERYTHING
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  loadMatches("live");

  loadNews();

  loadTransfers();

  loadStandings("PL");
});
