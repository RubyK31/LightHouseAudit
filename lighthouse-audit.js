import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import axios from "axios";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sanitizeUrl(url) {
  return url.replace(/[^a-zA-Z0-9]/g, "_");
}

async function sendToMake(payload) {
  const webhookUrl =
    "https://hook.eu2.make.com/3wqmouo7dd0sjutm6bqthqkxb49b55ui"; 
  try {
    const response = await axios.post(webhookUrl, payload);
    console.log("Data sent to Make.com:", response.data);
  } catch (error) {
    console.error("Error sending data to Make.com:", error);
  }
}

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--disable-component-update",
      "--disable-default-apps",
      "--disable-dev-shm-usage",
      "--disable-domain-reliability",
      "--disable-features=TranslateUI,BlinkGenPropertyTrees",
      "--disable-hang-monitor",
      "--disable-ipc-flooding-protection",
      "--disable-popup-blocking",
      "--disable-prompt-on-repost",
      "--disable-renderer-backgrounding",
      "--disable-sync",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      "--safebrowsing-disable-auto-update",
      "--enable-automation",
      "--disable-gpu",
      "--headless",
    ],
  });

  const options = {
    port: chrome.port,
    output: "json",
    logLevel: "info",
    preset: "desktop",
    formFactor: "desktop",
    screenEmulation: { disabled: true },
    throttling: {
      cpuSlowdownMultiplier: 1,
      rttMs: 0,
      throughputKbps: 0,
    },
    disableStorageReset: true,
  };

  try {
    const runnerResult = await lighthouse(url, options);
    const lhr = runnerResult.lhr;

    // Save JSON report locally
    const reportsFolderPath = path.join(__dirname, "audit-reports");
    mkdirSync(reportsFolderPath, { recursive: true });
    const sanitizedUrl = sanitizeUrl(url);

    const timestamp = new Date().toISOString();
    const safeTimestamp = timestamp.replace(/[:.]/g, "-");

    // Folder name now includes the sanitized URL and the safe timestamp
    const folderName = `${sanitizedUrl}-${safeTimestamp}`;
    const urlFolderPath = path.join(reportsFolderPath, folderName);
    mkdirSync(urlFolderPath, { recursive: true });

    const jsonReportPath = path.join(urlFolderPath, "audit.json");
    writeFileSync(jsonReportPath, JSON.stringify(lhr, null, 2));
    console.log(`JSON report saved to ${jsonReportPath}`);

    // Read the JSON report file content
    const auditJsonContent = readFileSync(jsonReportPath, "utf8");

    const optimalPerformance = 80;

    // Prepare Performance data with extra details
    const performanceScore = lhr.categories.performance.score * 100;
    const performanceStatus =
      typeof performanceScore === "number" &&
      performanceScore >= optimalPerformance
        ? "Meets Optimal Value"
        : "Needs Improvement";
    const performanceData = {
      url,
      description: "A score for page speed and optimization",
      score: performanceScore,
      optimal: optimalPerformance,
      status: performanceStatus,
      fcp: lhr.audits["first-contentful-paint"].displayValue || "N/A",
      lcp: lhr.audits["largest-contentful-paint"].displayValue || "N/A",
      cls: lhr.audits["cumulative-layout-shift"].displayValue || "N/A",
      speedIndex: lhr.audits["speed-index"].displayValue || "N/A",
      timestamp,
    };

    // Prepare Accessibility data
    const accessibilityScore = lhr.categories.accessibility.score * 100;
    const accessibilityStatus =
      typeof accessibilityScore === "number" &&
      accessibilityScore >= optimalPerformance
        ? "Meets Optimal Value"
        : "Needs Improvement";
    const accessibilityData = {
      url,
      description:
        "A score of accessibility of the website for users with disabilities",
      score: accessibilityScore,
      optimal: optimalPerformance,
      status: accessibilityStatus,
      timestamp,
    };

    // Prepare Best Practices data
    const bestPracticesScore = lhr.categories["best-practices"].score * 100;
    const bestPracticesStatus =
      typeof bestPracticesScore === "number" &&
      bestPracticesScore >= optimalPerformance
        ? "Meets Optimal Value"
        : "Needs Improvement";
    const bestPracticesData = {
      url,
      description:
        "A score assessing adherence to web development best practices",
      score: bestPracticesScore,
      optimal: optimalPerformance,
      status: bestPracticesStatus,
      timestamp,
    };

    // Prepare SEO data
    const seoScore = lhr.categories.seo.score * 100;
    const seoStatus =
      typeof seoScore === "number" && seoScore >= optimalPerformance
        ? "Meets Optimal Value"
        : "Needs Improvement";
    const seoData = {
      url,
      description:
        "A score indicating how well the site is optimized for search engines",
      score: seoScore,
      optimal: optimalPerformance,
      status: seoStatus,
      timestamp,
    };

    // Combined payload with data for each category, plus the JSON file and folder name
    const auditData = {
      performance: performanceData,
      accessibility: accessibilityData,
      bestPractices: bestPracticesData,
      seo: seoData,
      folderName, 
      auditJsonFile: auditJsonContent, // JSON file content as a string
    };

    // Send the payload to Make.com
    await sendToMake(auditData);
  } catch (err) {
    console.error("Error running Lighthouse audit:", err);
  } finally {
    chrome.kill();
  }
}

const url = process.argv[2] || "http://google.com";
runLighthouse(url);
