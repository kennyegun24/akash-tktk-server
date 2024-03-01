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
        const queryUserInfo = await axios.post(
          "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
          null,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "applicatimodon/json; charset=UTF-8",
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

app.post("/upload/video", async (req, res) => {
  const bufferData = req.body.bufferData;
  const userVideoDetails = req.body.userVideoDetails;
  const access_token = req.body.access_token;
  const fileSize = req.body.fileSize;
  console.log(req.body);
  try {
    const initializeUploadToTiktokApi = async () => {
      try {
        const req = await axios.post(
          "https://open.tiktokapis.com/v2/post/publish/video/init/",
          {
            post_info: { ...userVideoDetails },
            source_info: {
              source: "FILE_UPLOAD",
              video_size: fileSize,
              chunk_size: fileSize,
              total_chunk_count: 1,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const response = await req.data;
        console.log(response);

        if (response) {
          const axiosCreate = axios.create({
            baseURL: response?.data?.upload_url,
            headers: {
              Authorization: `Bearer ${access_token}`,
              "Content-Type": "video/mp4",
              "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
            },
          });
          const req = await axiosCreate.post("", {
            bufferData,
          });
          console.log(req);
        }
      } catch (error) {
        console.log(error?.data?.error, "error 422");
        res.status(422).send(error);
      }
    };
    await initializeUploadToTiktokApi();
  } catch (error) {
    console.log(error);
    res.status(422).send("Something went wrong");
  }
});

app.listen(port, () => {});
