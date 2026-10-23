const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  // The dev webServer is a single-threaded static server; parallel workers
  // starve each spec's ~40 serial script requests and time them out.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "python3 -m http.server 3000",
    url: "http://localhost:3000/index.html",
    reuseExistingServer: true,
  },
});
