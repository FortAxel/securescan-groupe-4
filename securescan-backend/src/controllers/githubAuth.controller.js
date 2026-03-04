import axios from "axios";
import { saveGithubOAuthData } from "../services/db/databaseManager.js";

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.BACKEND_URL}/api/githubAuth/callback`;

/**
 * Redirect authenticated user to GitHub OAuth
 */
export const redirectToGithub = (req, res) => {
  const redirectUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&scope=repo`+
    `&redirect_uri=${REDIRECT_URI}`;

  res.redirect(redirectUrl);
};

/**
 * GitHub OAuth callback
 */
export const githubCallback = async (req, res) => {
  const { code } = req.query;
  const userId = req.userId;

  try {
    // Exchange code for access token
    const { data } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = data.access_token;

    // Get GitHub user info
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const githubId = userResponse.data.id.toString();

    await saveGithubOAuthData(userId, {
      githubId,
      accessToken,
    });

    res.redirect("/dashboard?github=connected");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "GitHub OAuth failed" });
  }
};