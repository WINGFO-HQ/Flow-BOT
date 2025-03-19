const axios = require("axios");
const { getTokenExpiration, signMessage } = require("./utils");
const config = require("./config");
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");

const loginToFlow3 = async (privateKey, maxRetries = 3) => {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const decodedPrivateKey = bs58.decode(privateKey);
      const keypair = Keypair.fromSecretKey(decodedPrivateKey);
      const walletAddress = keypair.publicKey.toString();

      const message =
        "Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.";
      const signature = signMessage(message, privateKey);

      const payload = {
        message,
        signature,
        walletAddress,
        referralCode: "nbeSzzCZo",
      };

      const response = await axios.post(
        `${config.FLOW3_API_URL}/user/login`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (response.data.statusCode === 200) {
        const accessToken = response.data.data.accessToken;
        const expTime = getTokenExpiration(accessToken);

        return {
          accessToken: accessToken,
          refreshToken: response.data.data.refreshToken,
          walletAddress,
          tokenExpiration: expTime,
        };
      } else {
        throw new Error(`Login failed: ${response.data.message}`);
      }
    } catch (error) {
      retries++;

      if (retries >= maxRetries) {
        throw error;
      }

      const delay = 2000 * retries;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const shareBandwidth = async (accessToken) => {
  try {
    const response = await axios.post(
      `${config.MTCADMIN_API_URL}/bandwidth`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.statusCode === 200) {
      const data = response.data.data;
      return {
        success: true,
        data: data,
      };
    } else {
      throw new Error(`Share bandwidth failed: ${response.data.message}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const getPointInfo = async (accessToken) => {
  try {
    const response = await axios.get(`${config.MTCADMIN_API_URL}/point/info`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data.statusCode === 200) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(`Get point info failed: ${response.data.message}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const getUserProfile = async (accessToken) => {
  try {
    const response = await axios.get(`${config.FLOW3_API_URL}/user/profile`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.data.statusCode === 200) {
      return {
        success: true,
        data: response.data.data,
      };
    } else {
      throw new Error(`Get user profile failed: ${response.data.message}`);
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  loginToFlow3,
  shareBandwidth,
  getPointInfo,
  getUserProfile,
};
