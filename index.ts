//@ts-check

import { BEARER_TOKEN } from "./KEYS";

import express from "express"; // Express web server framework
import request from "request"; // "Request" library
import cors from "cors";
import querystring from "querystring";
import cookieParser from "cookie-parser";
import { client_id, redirect_uri, state_key, authToken } from "./KEYS";
import { generateRandomString } from "./util";
import { addNewArtistsTracks, addNewTracks } from "./playlistSubscriptions";

const ARTIST_TARGET_ID = "3Bx9orXGNyLZ4S7S0gZ8Vo";

const app = express();

app
  .use(express.static(__dirname + "/public"))
  .use(cors())
  .use(cookieParser());

app.get("/login", (req, res) => {
  const state = generateRandomString(16);
  res.cookie(state_key, state);

  var queryParams = querystring.stringify({
    response_type: "code",
    client_id: client_id,
    scope: "playlist-modify-public playlist-modify-private user-follow-read",
    redirect_uri: redirect_uri,
    state: state,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

// redirect_uri target
app.get("/callback", (req, res) => {
  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies?.[state_key] || null;

  if (state === null || state !== storedState) {
    res.redirect("/#" + querystring.stringify({ error: "state_mismatch" }));
    return;
  }

  res.clearCookie(state_key);
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: { Authorization: "Basic " + authToken },
    form: { code, redirect_uri, grant_type: "authorization_code" },
    json: true,
  };

  request.post(authOptions, (error, response, body) => {
    if (error || response.statusCode !== 200) {
      res.redirect("/#" + querystring.stringify({ error: "invalid_token" }));
      return;
    }

    const access_token = body.access_token;
    const refresh_token = body.refresh_token;
    BEARER_TOKEN.set(access_token);

    const options = {
      url: "https://api.spotify.com/v1/me",
      headers: { Authorization: "Bearer " + access_token },
      json: true,
    };
    

    // we can also pass the token to the browser to make requests from there
    res.redirect("/#" + querystring.stringify({ access_token, refresh_token }));
  });
});

app.get("/refresh_token", (req, res) => {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const options = {
    url: "https://accounts.spotify.com/api/token",
    headers: { Authorization: "Basic " + authToken },
    form: { grant_type: "refresh_token", refresh_token },
    json: true,
  };

  request.post(options, (error, response, body) => {
    if (error || response.statusCode !== 200) return;

    BEARER_TOKEN.set(body.access_token);
    res.send({ access_token: body.access_token });
  });
});

app.get("/add_subscriptions", (req, res) => {
  addNewArtistsTracks(ARTIST_TARGET_ID).then((r) =>
    console.log("added new tracks: ", r)
  );
});

app.get("/add_lists", (req, res) => {
  addNewTracks("78d1cKN9xYtKialnOYkI92", "2a6NRXiwvTiJt57UKds76d").then((r) =>
    console.log("added new playlist tracks: ", r)
  );
});

console.log("Listening on 8888");
app.listen(8888);
