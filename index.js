import express from "express";
import fetch from "node-fetch";
import queryString from "querystring";
import cors from "cors";
// const axios = require("axios");
import axios from "axios";
const app = express();
const port = 4000;

const tiktokConfig = {
  clientKey: "awp1l97zfgf2xei0",
  clientSecret: "39sEnJ5YOngngNZhl8rL1J9hUAzppLiY",
  redirectUri: "https://www.make.com/oauth/cb/app",
  scopes: "user.info.basic,video.upload,video.publish",
};

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

app.get("/login", (req, res) => {
  const authorizeUrl = `https://www.tiktok.com/v2/auth/authorize?scope=${tiktokConfig.scopes}&client_key=${tiktokConfig.clientKey}&redirect_uri=${tiktokConfig.redirectUri}&response_type=code`;

  res.json({ url: authorizeUrl });
});

app.get("/oauth/redirect", async (req, res) => {
  try {
    const { code } = req.body;
    const decode = decodeURI(code);
    const tokenEndpoint = "https://open.tiktokapis.com/v2/oauth/token/";
    const params = {
      code: decode,
      client_key: tiktokConfig.clientKey,
      grant_type: "authorization_code",
      redirect_uri: tiktokConfig.redirectUri,
      client_secret: tiktokConfig.clientSecret,
    };
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
    console.log("response>>>>>>>", access_token);
    const queryUserInfo = await axios.get(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );
    const getUserInfo = await queryUserInfo.data;
    res.send({ access_token, getUserInfo });
  } catch (error) {
    console.error("Error during callback:", error.message);
    res.status(500).send("An error occurred during the login process.");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
