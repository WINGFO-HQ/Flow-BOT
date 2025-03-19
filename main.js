const { setupDashboard } = require("./lib/dashboard");
const { runAutomation } = require("./lib/automation");

const screen = setupDashboard();
runAutomation(screen);

process.on("SIGINT", () => {
  console.log("\nReceived SIGINT signal (Ctrl+C)");
  console.log("Stopping program...");
  process.exit(0);
});
