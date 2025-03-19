const config = require("./config");
const utils = require("./utils");
const api = require("./api");

const manageAccount = async (
  privateKey,
  accountIndex,
  totalAccounts,
  dashboard
) => {
  let accessToken = null;
  let walletAddress = null;
  let tokenExpiration = null;
  const accountPrefix = `[Account ${accountIndex + 1}/${totalAccounts}]`;

  while (!accessToken) {
    try {
      dashboard.addLog(`${accountPrefix} Attempting to login...`);
      dashboard.updateAccount(accountIndex, { status: "Logging in" });

      const loginData = await api.loginToFlow3(privateKey);
      accessToken = loginData.accessToken;
      walletAddress = loginData.walletAddress;
      tokenExpiration = loginData.tokenExpiration;

      dashboard.addLog(
        `${accountPrefix} Login successful for wallet: ${walletAddress}`
      );
      dashboard.updateAccount(accountIndex, {
        status: "Active",
        walletAddress,
        tokenExpiration: tokenExpiration,
        tokenExpirationFormatted: new Date(tokenExpiration).toLocaleString(),
      });
    } catch (error) {
      dashboard.addLog(`${accountPrefix} Login failed: ${error.message}`);
      dashboard.updateAccount(accountIndex, { status: "Login Failed" });

      const retryDelay = 10000;
      dashboard.addLog(
        `${accountPrefix} Retrying login in ${retryDelay / 1000} seconds...`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  try {
    const profileResult = await api.getUserProfile(accessToken);
    if (profileResult.success) {
      dashboard.addLog(`${accountPrefix} Get profile successfully!`);
    }

    const initialPointResult = await api.getPointInfo(accessToken);
    if (initialPointResult.success) {
      dashboard.addLog(`${accountPrefix} Get initial point data successfully!`);
      dashboard.updateAccount(accountIndex, {
        totalPoints: initialPointResult.data.totalEarningPoint || "0",
        todayPoints: initialPointResult.data.todayEarningPoint || "0",
      });
    }

    while (true) {
      try {
        const now = Date.now();
        if (
          tokenExpiration &&
          now + config.TOKEN_REFRESH_BUFFER > tokenExpiration
        ) {
          dashboard.addLog(
            `${accountPrefix} Token will expire in ${Math.floor(
              (tokenExpiration - now) / 1000
            )} seconds. Refreshing token...`
          );
          dashboard.updateAccount(accountIndex, { status: "Refreshing Token" });

          let refreshSuccess = false;
          while (!refreshSuccess) {
            try {
              const loginData = await api.loginToFlow3(privateKey);
              accessToken = loginData.accessToken;
              tokenExpiration = loginData.tokenExpiration;
              refreshSuccess = true;

              dashboard.updateAccount(accountIndex, {
                status: "Active",
                tokenExpiration: tokenExpiration,
              });
            } catch (refreshError) {
              dashboard.addLog(
                `${accountPrefix} Token refresh failed: ${refreshError.message}`
              );
              dashboard.updateAccount(accountIndex, {
                status: "Refresh Failed",
              });

              await new Promise((resolve) => setTimeout(resolve, 10000));
              dashboard.addLog(`${accountPrefix} Retrying token refresh...`);
            }
          }
        }

        dashboard.updateAccount(accountIndex, { status: "Sharing" });
        const shareResult = await api.shareBandwidth(
          accessToken,
          walletAddress
        );

        if (shareResult.success) {
          const data = shareResult.data;
          dashboard.addLog(
            `${accountPrefix} Share bandwidth successful. ID: ${data.id}, Total Time: ${data.totalTime}`
          );
          dashboard.updateAccount(accountIndex, {
            status: "Active",
            lastActivity: new Date().toLocaleString(),
          });

          const pointResult = await api.getPointInfo(accessToken);
          if (pointResult.success) {
            dashboard.addLog(`${accountPrefix} Get point successfully!`);
            dashboard.updateAccount(accountIndex, {
              totalPoints: pointResult.data.totalEarningPoint || "0",
              todayPoints: pointResult.data.todayEarningPoint || "0",
            });
          }
        } else {
          dashboard.addLog(
            `${accountPrefix} Error sharing bandwidth: ${shareResult.error}`
          );
          dashboard.updateAccount(accountIndex, { status: "Error" });
        }

        const waitTime = Math.floor(Math.random() * 30000) + 30000;
        dashboard.addLog(
          `${accountPrefix} Waiting ${
            waitTime / 1000
          } seconds before next bandwidth share...`
        );
        dashboard.updateAccount(accountIndex, { status: "Waiting" });

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        dashboard.updateAccount(accountIndex, { status: "Active" });
      } catch (error) {
        dashboard.addLog(`${accountPrefix} Error in loop: ${error.message}`);
        dashboard.updateAccount(accountIndex, { status: "Error" });

        if (
          error.message.includes("401") ||
          error.message.includes("unauthorized") ||
          error.message.includes("expired") ||
          error.message.includes("invalid token")
        ) {
          dashboard.addLog(
            `${accountPrefix} Token invalid or expired. Attempting to login again...`
          );
          dashboard.updateAccount(accountIndex, { status: "Logging in" });

          let loginSuccess = false;
          while (!loginSuccess) {
            try {
              const loginData = await api.loginToFlow3(privateKey);
              accessToken = loginData.accessToken;
              walletAddress = loginData.walletAddress;
              tokenExpiration = loginData.tokenExpiration;
              loginSuccess = true;

              dashboard.updateAccount(accountIndex, {
                status: "Active",
                tokenExpiration: tokenExpiration,
              });
            } catch (loginError) {
              dashboard.addLog(
                `${accountPrefix} Login retry failed: ${loginError.message}`
              );
              dashboard.updateAccount(accountIndex, { status: "Login Failed" });

              await new Promise((resolve) => setTimeout(resolve, 10000));
              dashboard.addLog(`${accountPrefix} Retrying login...`);
            }
          }
        } else {
          dashboard.addLog(
            `${accountPrefix} Waiting 30 seconds before trying again...`
          );
          await new Promise((resolve) => setTimeout(resolve, 30000));
        }
      }
    }
  } catch (error) {
    dashboard.addLog(`${accountPrefix} Fatal error: ${error.message}`);
    dashboard.updateAccount(accountIndex, { status: "Fatal Error" });
    dashboard.addLog(`${accountPrefix} Restarting account in 60 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    return manageAccount(privateKey, accountIndex, totalAccounts, dashboard);
  }
};

const runAutomation = async (dashboard) => {
  const privateKeys = utils.readPrivateKeys(config.PRIVATE_KEY_FILE);
  const totalAccounts = privateKeys.length;

  dashboard.addLog(
    `Found ${totalAccounts} private key(s), starting process...`
  );
  dashboard.addLog(
    `Program will run continuously until manually stopped (CTRL+C / q)`
  );

  if (totalAccounts > 0) {
    privateKeys.forEach((_, index) => {
      dashboard.initAccount("Loading...", index);
    });

    const accountPromises = privateKeys
      .map((privateKey, index) => {
        if (privateKey.trim()) {
          return manageAccount(
            privateKey.trim(),
            index,
            totalAccounts,
            dashboard
          );
        }
      })
      .filter(Boolean);

    await Promise.all(accountPromises);
  } else {
    dashboard.addLog("No private keys found!");
  }
};

module.exports = {
  runAutomation,
};
