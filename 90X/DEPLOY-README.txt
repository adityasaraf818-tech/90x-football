90X FOOTBALL - FIXED DEPLOYMENT
================================

I fixed the Netlify function so it no longer imports server.js.
That was the reason Netlify was failing to build the function.

WHAT YOU MUST HAVE IN NETLIFY
-----------------------------
Environment variable:
FOOTBALL_API_KEY = your football-data.org API key

You do NOT need NEWS_API_KEY anymore. News and transfer sections now use football RSS feeds.

IMPORTANT
---------
football-data.org's free plan provides fixtures and league tables, but not live scores.
The Live tab will therefore show no live matches unless you use a plan that includes livescores.

DEPLOY FROM GITHUB
------------------
1. Replace your repository files with the files in this ZIP.
2. Commit the changes to the main branch.
3. Netlify will automatically create a new deploy if your site is connected to GitHub.
4. In Netlify: Project configuration -> Environment variables.
5. Add FOOTBALL_API_KEY with your football-data.org key.
6. Trigger a new deploy if Netlify does not automatically redeploy.

CHECK
-----
Open your site and these URLs should return JSON:
/api/health
/api/matches?type=upcoming
/api/news
/api/transfers
/api/standings/PL
