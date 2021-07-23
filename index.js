//@ts-check

const express = require("express"); // Express web server framework
const request = require("request"); // "Request" library
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const { client_id, redirect_uri, state_key, authToken } = require("./KEYS");
const { generateRandomString } = require("./util");

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
    scope: "playlist-modify-private user-follow-read",
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

    const options = {
      url: "https://api.spotify.com/v1/me",
      headers: { Authorization: "Bearer " + access_token },
      json: true,
    };

    // use the access token to access the Spotify Web API
    request.get(options, (error, response, body) => {
      console.log(body);
    });

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

    res.send({ access_token: body.access_token });
  });
});

console.log("Listening on 8888");
app.listen(8888);
