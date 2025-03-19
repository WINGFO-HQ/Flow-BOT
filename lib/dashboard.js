const blessed = require("blessed");
const contrib = require("blessed-contrib");
const config = require("./config");

let dashboardData = {
  accounts: [],
  logs: [],
  summary: {
    totalAccounts: 0,
    activeAccounts: 0,
    totalEarningPoints: 0,
    todayEarningPoints: 0,
  },
};

const setupDashboard = () => {
  const screen = blessed.screen({
    smartCSR: true,
    title: "Flow3 Bandwidth Sharing Dashboard",
  });

  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen: screen,
  });

  const accountsTable = grid.set(0, 0, 6, 6, contrib.table, {
    keys: true,
    fg: "white",
    label: "Accounts Status",
    columnSpacing: 2,
    columnWidth: [16, 18, 10, 10, 12],
    tags: true,
  });

  const logBox = grid.set(6, 0, 6, 12, contrib.log, {
    fg: "green",
    selectedFg: "green",
    label: "Activity Log",
  });

  const statsBox = grid.set(0, 6, 3, 6, contrib.bar, {
    label: "Point Statistics",
    barWidth: 4,
    barSpacing: 6,
    xOffset: 0,
    maxHeight: 9,
    barBgColor: "blue",
    labelColor: "white",
    showText: true,
    barLabelFormatter: function (value) {
      return Math.round(value).toString();
    },
  });

  const summaryBox = grid.set(3, 6, 3, 6, blessed.box, {
    label: "Summary",
    content: "",
    tags: true,
    border: {
      type: "line",
    },
    style: {
      fg: "white",
      border: {
        fg: "white",
      },
    },
  });

  accountsTable.setData({
    headers: ["Wallet", "Status", "Total Pts", "Today Pts", "Token Expires"],
    data: [["Loading...", "", "", "", ""]],
    tags: true,
  });

  statsBox.setData({
    titles: ["Total", "Today"],
    data: [
      parseFloat(dashboardData.summary.totalEarningPoints) || 0,
      parseFloat(dashboardData.summary.todayEarningPoints) || 0,
    ],
  });

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";

    return Math.round(parseFloat(num))
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatStatus = (status) => {
    if (status === "Active") return "{green-fg}Active{/green-fg}";
    if (status === "Waiting") return "{cyan-fg}Waiting{/cyan-fg}";
    if (status === "Sharing") return "{yellow-fg}Sharing{/yellow-fg}";
    if (status === "Sharing Bandwidth") return "{yellow-fg}Sharing{/yellow-fg}";
    if (status === "Refreshing Token") return "{blue-fg}Refreshing{/blue-fg}";
    if (status === "Error") return "{red-fg}Error{/red-fg}";
    if (status === "Login Failed") return "{red-fg}Login Failed{/red-fg}";
    if (status === "Logging in") return "{magenta-fg}Logging in{/magenta-fg}";

    return status;
  };

  const formatTimeRemaining = (expirationTimestamp) => {
    if (!expirationTimestamp) return "Unknown";

    const now = Date.now();
    const timeRemaining = expirationTimestamp - now;

    if (timeRemaining <= 0) return "Expired";

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const updateDashboard = () => {
    const accountData = dashboardData.accounts.map((account) => [
      account.walletAddress.substring(0, 8) + "...",
      formatStatus(account.status),
      formatNumber(account.totalPoints),
      formatNumber(account.todayPoints),
      formatTimeRemaining(account.tokenExpiration),
    ]);

    accountsTable.setData({
      headers: ["Wallet", "Status", "Total Pts", "Today Pts", "Token Expires"],
      data:
        accountData.length > 0
          ? accountData
          : [["No Accounts", "", "", "", ""]],
      tags: true,
    });

    statsBox.setData({
      titles: ["Total", "Today"],
      data: [
        parseFloat(dashboardData.summary.totalEarningPoints) || 0,
        parseFloat(dashboardData.summary.todayEarningPoints) || 0,
      ],
    });

    summaryBox.setContent(
      `{bold}Total Accounts:{/bold} ${dashboardData.summary.totalAccounts}\n` +
        `{bold}Active Accounts:{/bold} ${dashboardData.summary.activeAccounts}\n` +
        `{bold}Total Earning Points:{/bold} ${formatNumber(
          dashboardData.summary.totalEarningPoints
        )}\n` +
        `{bold}Today Earning Points:{/bold} ${formatNumber(
          dashboardData.summary.todayEarningPoints
        )}\n` +
        `{bold}Last Update:{/bold} ${new Date().toLocaleTimeString()}`
    );

    screen.render();
  };

  const addLog = (message) => {
    logBox.log(message);
    dashboardData.logs.push({
      time: new Date(),
      message,
    });

    if (dashboardData.logs.length > 1000) {
      dashboardData.logs.shift();
    }
  };

  const updateAccount = (index, data) => {
    dashboardData.accounts[index] = {
      ...dashboardData.accounts[index],
      ...data,
    };

    let totalPoints = 0;
    let todayPoints = 0;
    let activeAccounts = 0;

    dashboardData.accounts.forEach((account) => {
      totalPoints += parseFloat(account.totalPoints) || 0;
      todayPoints += parseFloat(account.todayPoints) || 0;
      if (account.status === "Active") activeAccounts++;
    });

    dashboardData.summary.totalEarningPoints = totalPoints;
    dashboardData.summary.todayEarningPoints = todayPoints;
    dashboardData.summary.activeAccounts = activeAccounts;

    updateDashboard();
  };

  const initAccount = (walletAddress, index) => {
    if (!dashboardData.accounts[index]) {
      dashboardData.accounts[index] = {
        walletAddress,
        status: "Initializing",
        totalPoints: "0",
        todayPoints: "0",
        lastActivity: new Date(),
        tokenExpiration: null,
      };
      dashboardData.summary.totalAccounts = dashboardData.accounts.length;
      updateDashboard();
    }
  };

  screen.key(["escape", "q", "C-c"], function (ch, key) {
    return process.exit(0);
  });

  updateDashboard();
  setInterval(updateDashboard, config.UPDATE_INTERVAL);

  return {
    screen,
    addLog,
    updateAccount,
    initAccount,
    updateDashboard,
  };
};

module.exports = {
  setupDashboard,
};
