import express from "express";
import cors from "cors";
import { config } from "./configs/App.config";

const app = express();

// Middleware

// Routes

//

app.get("/", (req, res) => {
  res.send("Welcome to Wasl Management API");
});

const PORT = config.port;


app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`http://localhost:${PORT}`);
  console.log(`${config.appName} is running on port ${PORT}`);
});
