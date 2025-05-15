import { Telegraf, Scenes, session } from "telegraf"
import { createCalculationScene } from "../scenes/calculationScene"
import { calculateLotSize } from "../utils/calculator"

// Initialize bot with webhook
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const VERCEL_URL = process.env.VERCEL_URL || "https://optimal-lot-size-bot.vercel.app"

const bot = new Telegraf(BOT_TOKEN)

// Welcome message and instructions
bot.start((ctx) => {
  ctx.reply(
    "Welcome to the Trading Lot Size Calculator Bot! 📊\n\n" +
      "I can help you calculate the optimal lot size for your trades based on proper risk management.\n\n" +
      "Use /calculate to start a new calculation.",
  )
})

bot.help((ctx) => {
  ctx.reply(
    "This bot calculates the optimal lot size for your trades based on risk management principles.\n\n" +
      "Commands:\n" +
      "/start - Start the bot\n" +
      "/help - Show this help message\n" +
      "/calculate - Start a new lot size calculation",
  )
})

// Register the calculation scene
const stage = new Scenes.Stage([createCalculationScene(calculateLotSize)])
bot.use(session())
bot.use(stage.middleware())

// Command to start the calculation wizard
bot.command("calculate", (ctx) => {
  ctx.scene.enter("CALCULATION_WIZARD")
})

// Set webhook path
bot.telegram.setWebhook(`${VERCEL_URL}/api/webhook`)

// Handle webhook requests
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      await bot.handleUpdate(req.body)
      res.status(200).send("OK")
    } else {
      // For GET requests, return a simple message
      res.status(200).send("Telegram Bot Webhook is active!")
    }
  } catch (error) {
    console.error("Error in webhook handler:", error)
    res.status(500).send("Error processing webhook")
  }
}
