const fs = require("fs");
const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const nacl = require("tweetnacl");

const getTokenExpiration = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = Buffer.from(parts[1], "base64").toString();
    const parsed = JSON.parse(payload);

    if (parsed.exp) {
      return parsed.exp * 1000;
    }

    throw new Error("No expiration found in token");
  } catch (error) {
    console.error("Error decoding JWT:", error.message);
    return Date.now() + 3600000;
  }
};

const readPrivateKeys = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data.split("\n").filter((key) => key.trim() !== "");
  } catch (error) {
    console.error("Error reading private key file:", error);
    return [];
  }
};

const signMessage = (message, privateKey) => {
  try {
    const decodedPrivateKey = bs58.decode(privateKey);
    const keypair = Keypair.fromSecretKey(decodedPrivateKey);
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    return bs58.encode(signature);
  } catch (error) {
    console.error("Error signing message:", error);
    throw error;
  }
};

module.exports = {
  getTokenExpiration,
  readPrivateKeys,
  signMessage,
};
