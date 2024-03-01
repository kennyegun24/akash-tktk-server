import express from "express";
import fetch from "node-fetch";
import queryString from "querystring";
import cors from "cors";
import axios from "axios";
const app = express();
const port = 4000;
import dotenv from "dotenv";
import multer from "multer";
// const bodyParser = require("body-parser");
import bodyParser from "body-parser";
dotenv.config();
const upload = multer();
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

app.post("/initiate/video/upload", upload.single("video"), async (req, res) => {
  const userVideoDetails = JSON.parse(req.body.userVideoDetails);
  const access_token = req.body.access_token;
  const fileSize = JSON.parse(req.body.fileSize);
  const videoBuffer = req.file ? req.file.buffer : null;
  // console.log(req.file?.buffer);
  // console.log(userVideoDetails.title, "uservideodetails");
  // console.log(access_token, "access_token");
  // console.log(fileSize, "filesize");
  try {
    async () => {
      try {
        const req = await axios.post(
          "https://open.tiktokapis.com/v2/post/publish/video/init/",
          {
            post_info: { ...userVideoDetails },
            source_info: {
              source: "FILE_UPLOAD",
              video_size: fileSize.size,
              chunk_size: fileSize.size,
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
        // console.log(response);

        if (response) {
          if (videoBuffer) {
            console.log(response.data.upload_url);
            res.status(200).send("data");
            // try {
            //   axios.post(`${response?.data?.upload_url}`, videoBuffer, {
            //     headers: {
            //       Authorization: `Bearer ${access_token}`,
            //       "Content-Type": "video/mp4",
            //       "Content-Range": `bytes 0-${fileSize.size - 1}/${
            //         fileSize.size
            //       }`,
            //     },
            //   });
            //   // console.log(req);
            // } catch (error) {
            //   res.status(422).send(error, "video upload");
            // }
          } else {
            res.status(422).send("Video buffer not present");
          }
        }
      } catch (error) {
        console.log(error?.data?.error, "error 422");
        res.status(422).send(error);
      }
    };
  } catch (error) {
    console.log(error);
    res.status(422).send("Something went wrong");
  }
});

app.listen(port, () => {});
