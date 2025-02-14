import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
//this will allow the data endcode in url
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

//routes imports
import userRouter from "./routes/user.route.js";
import flatRouter from "./routes/flat.route.js";

//routes declartion

app.use("/api/v1/user", userRouter);
app.use("/api/v1/flat", flatRouter);

export { app };
