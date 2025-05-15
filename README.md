# Trading Lot Size Calculator Telegram Bot

This Telegram bot helps traders calculate the optimal lot size for their trades based on risk management principles. It ensures that traders don't risk more than their specified percentage of account balance on any single trade.

## Features

- Supports multiple instrument types: Forex, Crypto, Metals, Indices, and Synthetic
- Calculates lot size based on account balance, risk percentage, and stop loss distance
- Provides detailed explanation of the calculation
- User-friendly conversation flow with buttons and prompts

## Deployment on Vercel

This bot is designed to be deployed as a serverless function on Vercel.

### Prerequisites

1. Create a new Telegram bot by talking to [@BotFather](https://t.me/BotFather) on Telegram
2. Get your bot token from BotFather
3. Create a Vercel account if you don't have one

### Deployment Steps

1. Clone this repository
2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
3. Set up your environment variables in Vercel:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token

4. Deploy to Vercel:
   \`\`\`
   npm run deploy
   \`\`\`

5. After deployment, get your Vercel deployment URL (e.g., https://your-app.vercel.app)

6. Set up the webhook for your Telegram bot:
   \`\`\`
   curl -F "url=https://your-app.vercel.app/api/webhook" https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook
   \`\`\`

## Usage

1. Start a chat with your bot on Telegram
2. Use the `/start` command to get an introduction
3. Use the `/calculate` command to begin a new lot size calculation
4. Follow the prompts to enter your trading parameters
5. Receive the calculated lot size with explanation

## Commands

- `/start` - Start the bot and get an introduction
- `/help` - Show help information
- `/calculate` - Start a new lot size calculation

## Calculation Logic

The bot calculates lot size using the formula:
\`\`\`
Risk Amount = Account Balance × Risk Percentage
Lot Size = (Risk Amount / (Stop Loss × Pip Value)) × Leverage
\`\`\`

Different instrument types have different pip value calculations, which the bot handles automatically.
