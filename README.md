# Flow3 Bandwidth Sharing Automation

## Overview

This project automates bandwidth sharing on Flow3 using Solana wallets. It provides a dashboard interface to monitor account statuses, token expirations, and earning points. The system is designed to run continuously, handling token refreshes and bandwidth sharing cycles automatically.

## Features

- **Automated Login**: Logs into Flow3 using a Solana wallet.
- **Token Management**: Automatically refreshes tokens before expiration.
- **Bandwidth Sharing**: Shares bandwidth periodically.
- **Point Tracking**: Retrieves and displays total and daily earning points.
- **Dashboard UI**: Provides real-time account monitoring with a terminal-based dashboard.

## Installation

### Prerequisites

- Node.js (>=14)
- npm
- Solana CLI (optional for key management)

### Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/WINGFO-HQ/Flow-BOT.git
   cd Flow-BOT
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure environment settings:
   - Store your Solana private keys in `private.key` (one per line).

## Usage

### Start the Automation

Run the following command:

```sh
node main.js
```

The dashboard will display account statuses and logs.

### Stop the Automation

Press `CTRL + C` to stop the script safely.

## File Structure

```
├── lib/
│   ├── api.js         # Handles API requests
│   ├── automation.js  # Manages account automation logic
│   ├── config.js      # Configuration settings
│   ├── dashboard.js   # Terminal-based UI for monitoring
│   ├── utils.js       # Utility functions (key handling, signing, etc.)
├── main.js            # Entry point to start the automation
└── private.key        # (User-provided) Private keys file
```

## License

This project is for personal use. Redistribution or commercial use is not permitted without permission.

## Disclaimer

Use this tool at your own risk. The developer is not responsible for any loss of funds or account bans resulting from its usage.
