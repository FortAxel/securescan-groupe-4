import axios from "axios";
import { saveGithubOAuthData } from "../services/db/databaseManager.js";
import jwtPkg from 'jsonwebtoken';
const jwt = jwtPkg;

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.BACKEND_URL}/api/githubAuth/callback`;

/**
 * Redirect authenticated user to GitHub OAuth
 */
export const redirectToGithub = (req, res) => {
  const token = req.query.token ?? '';
  
  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  const redirectUrl =
    `https://github.com/login/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&scope=repo` +
    `&redirect_uri=${REDIRECT_URI}` +
    `&state=${token}`;

  res.redirect(redirectUrl);
};;

/**
 * GitHub OAuth callback
 */
export const githubCallback = async (req, res) => {
  const { code, state } = req.query;
  console.log('[githubCallback] code:', code);
  console.log('[githubCallback] state:', state);
  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId;
    
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

    res.redirect(`${process.env.FRONTEND_URL}/submit?github=connected`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "GitHub OAuth failed" });
  }
};