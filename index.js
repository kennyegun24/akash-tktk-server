import express from "express";
import fetch from "node-fetch";
import queryString from "querystring";
import cors from "cors";
import axios from "axios";
const app = express();
const port = 4000;
import dotenv from "dotenv";
// const bodyParser = require("body-parser");
import bodyParser from "body-parser";
dotenv.config();

const tiktokConfig = {
  clientKey: process.env.CLIENT_KEY,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
  scopes: process.env.SCOPES,
};
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
  })
);

app.get("/", (req, res) => {
  res.send("SERVER IS RUNNING");
});

app.get("/login", (req, res) => {
  const authorizeUrl = `https://www.tiktok.com/v2/auth/authorize?scope=${tiktokConfig.scopes}&client_key=${tiktokConfig.clientKey}&redirect_uri=${tiktokConfig.redirectUri}&response_type=code`;

  res.json({ url: authorizeUrl });
});

app.post("/oauth/redirect", async (req, res) => {
  const { code } = req.body;
  const decode = decodeURI(code);
  const tokenEndpoint = "https://open.tiktokapis.com/v2/oauth/token/";
  const params = {
    code: decode,
    client_key: tiktokConfig.clientKey,
    grant_type: process.env.GRANT_TYPE,
    redirect_uri: tiktokConfig.redirectUri,
    client_secret: tiktokConfig.clientSecret,
  };
  try {
    const response = await axios.post(
      tokenEndpoint,
      queryString.stringify(params),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cache-Control": "no-cache",
        },
      }
    );
    const access_token = await response.data?.access_token;

    if (access_token) {
      // res.status(200).send(access_token);
      try {
        const queryUserInfo = await axios.get(
          "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const getUserInfo = await queryUserInfo.data;
        res.send({ access_token, getUserInfo });
      } catch (error) {
        res.status(422).send("Could not get user information");
      }
    }

    if (response.data?.error) {
      res.status(401).send("An error occurred during the login process.");
    }
  } catch (error) {
    // console.error("Error during callback:", error.message);
    res.status(500).send("An error occurred during the login process.");
  }
});

app.listen(port, () => {});
