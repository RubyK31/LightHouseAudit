import express from "express";
import cors from "cors";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static HTML

app.post("/run-audit", (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ message: "URL is required" });

  console.log(`Running Lighthouse audit for: ${url}`);

  exec(`node lighthouse-audit.js ${url}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res
        .status(500)
        .json({ message: "Audit failed", error: error.message });
    }
    console.log(`Audit complete for ${url}`);
    res.json({ message: "Audit completed! Check the reports folder." });
  });
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
