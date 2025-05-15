import { Telegraf, Scenes, session } from "telegraf"
import { message } from "telegraf/filters"

// Environment variables would be set up in a real deployment
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_BOT_TOKEN"

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

// Create a scene for collecting trading information
const calculationScene = new Scenes.WizardScene(
  "CALCULATION_WIZARD",
  // Step 1: Ask for instrument type
  (ctx) => {
    ctx.reply("What type of trading instrument are you using?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Forex", callback_data: "Forex" }],
          [{ text: "Crypto", callback_data: "Crypto" }],
          [{ text: "Metals", callback_data: "Metals" }],
          [{ text: "Indices", callback_data: "Indices" }],
          [{ text: "Synthetic", callback_data: "Synthetic" }],
        ],
      },
    })
    return ctx.wizard.next()
  },
  // Step 2: Ask for symbol
  (ctx) => {
    if (ctx.callbackQuery) {
      ctx.wizard.state.instrumentType = ctx.callbackQuery.data
      ctx.reply(`Please enter the currency pair or asset symbol (e.g., EUR/USD, BTC/USD, GOLD, NASDAQ):`)
      return ctx.wizard.next()
    }
    return ctx.reply("Please select an instrument type from the options.")
  },
  // Step 3: Ask for trade type
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      ctx.wizard.state.symbol = ctx.message.text.toUpperCase()
      ctx.reply("What is the trade type?", {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Major", callback_data: "Major" }],
            [{ text: "Minor", callback_data: "Minor" }],
            [{ text: "Exotic", callback_data: "Exotic" }],
          ],
        },
      })
      return ctx.wizard.next()
    }
    return ctx.reply("Please enter a valid symbol.")
  },
  // Step 4: Ask for account currency
  (ctx) => {
    if (ctx.callbackQuery) {
      ctx.wizard.state.tradeType = ctx.callbackQuery.data
      ctx.reply("What is your account currency?", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "USD", callback_data: "USD" },
              { text: "EUR", callback_data: "EUR" },
            ],
            [
              { text: "GBP", callback_data: "GBP" },
              { text: "JPY", callback_data: "JPY" },
            ],
            [{ text: "Other", callback_data: "Other" }],
          ],
        },
      })
      return ctx.wizard.next()
    }
    return ctx.reply("Please select a trade type from the options.")
  },
  // Step 5: Ask for account balance
  (ctx) => {
    if (ctx.callbackQuery) {
      ctx.wizard.state.accountCurrency = ctx.callbackQuery.data
      if (ctx.wizard.state.accountCurrency === "Other") {
        ctx.reply("Please specify your account currency:")
        ctx.wizard.state.waitingForCustomCurrency = true
        return
      } else {
        ctx.reply(`What is your account balance in ${ctx.wizard.state.accountCurrency}?`)
        return ctx.wizard.next()
      }
    } else if (ctx.message && ctx.message.text && ctx.wizard.state.waitingForCustomCurrency) {
      ctx.wizard.state.accountCurrency = ctx.message.text.toUpperCase()
      ctx.wizard.state.waitingForCustomCurrency = false
      ctx.reply(`What is your account balance in ${ctx.wizard.state.accountCurrency}?`)
      return ctx.wizard.next()
    }
    return ctx.reply("Please select or enter your account currency.")
  },
  // Step 6: Ask for risk percentage
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      const balance = Number.parseFloat(ctx.message.text)
      if (!isNaN(balance) && balance > 0) {
        ctx.wizard.state.accountBalance = balance
        ctx.reply("What percentage of your account are you willing to risk per trade? (e.g., 1 for 1%)")
        return ctx.wizard.next()
      }
      return ctx.reply("Please enter a valid account balance (must be a positive number).")
    }
  },
  // Step 7: Ask for stop loss distance
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      const riskPercentage = Number.parseFloat(ctx.message.text)
      if (!isNaN(riskPercentage) && riskPercentage > 0 && riskPercentage <= 100) {
        ctx.wizard.state.riskPercentage = riskPercentage
        ctx.reply("What is your stop loss distance in pips or points?")
        return ctx.wizard.next()
      }
      return ctx.reply("Please enter a valid risk percentage (between 0 and 100).")
    }
  },
  // Step 8: Ask for current price
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      const stopLoss = Number.parseFloat(ctx.message.text)
      if (!isNaN(stopLoss) && stopLoss > 0) {
        ctx.wizard.state.stopLoss = stopLoss
        ctx.reply("What is the current price of the asset?")
        return ctx.wizard.next()
      }
      return ctx.reply("Please enter a valid stop loss distance (must be a positive number).")
    }
  },
  // Step 9: Ask for leverage (optional)
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      const currentPrice = Number.parseFloat(ctx.message.text)
      if (!isNaN(currentPrice) && currentPrice > 0) {
        ctx.wizard.state.currentPrice = currentPrice
        ctx.reply("What is your leverage? (optional, press 1 if not using leverage)")
        return ctx.wizard.next()
      }
      return ctx.reply("Please enter a valid current price (must be a positive number).")
    }
  },
  // Final step: Calculate and display result
  (ctx) => {
    if (ctx.message && ctx.message.text) {
      const leverage = Number.parseFloat(ctx.message.text)
      if (!isNaN(leverage) && leverage > 0) {
        ctx.wizard.state.leverage = leverage

        // Calculate lot size
        const result = calculateLotSize(ctx.wizard.state)

        // Format and send the result
        ctx.reply(
          "📊 *Lot Size Calculation Results* 📊\n\n" +
            `*Instrument:* ${ctx.wizard.state.instrumentType} (${ctx.wizard.state.symbol})\n` +
            `*Trade Type:* ${ctx.wizard.state.tradeType}\n` +
            `*Account:* ${ctx.wizard.state.accountBalance} ${ctx.wizard.state.accountCurrency}\n` +
            `*Risk:* ${ctx.wizard.state.riskPercentage}%\n` +
            `*Stop Loss:* ${ctx.wizard.state.stopLoss} pips\n` +
            `*Current Price:* ${ctx.wizard.state.currentPrice}\n` +
            `*Leverage:* ${ctx.wizard.state.leverage}x\n\n` +
            `*Recommended Lot Size:* ${result.lotSize}\n\n` +
            `*Risk Amount:* ${result.riskAmount} ${ctx.wizard.state.accountCurrency}\n` +
            `*Explanation:* ${result.explanation}`,
          { parse_mode: "Markdown" },
        )

        // Ask if they want to calculate again
        setTimeout(() => {
          ctx.reply("Would you like to calculate another lot size?", {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Yes, calculate again", callback_data: "calculate_again" }],
                [{ text: "No, thank you", callback_data: "end_calculation" }],
              ],
            },
          })
        }, 1000)

        return ctx.scene.leave()
      }
      return ctx.reply("Please enter a valid leverage (must be a positive number).")
    }
  },
)

// Handle the calculation again button
bot.action("calculate_again", (ctx) => {
  ctx.scene.enter("CALCULATION_WIZARD")
})

bot.action("end_calculation", (ctx) => {
  ctx.reply(
    "Thank you for using the Trading Lot Size Calculator! Type /calculate whenever you need to calculate a new lot size.",
  )
})

// Function to calculate the lot size
function calculateLotSize(data) {
  const {
    instrumentType,
    symbol,
    tradeType,
    accountCurrency,
    accountBalance,
    riskPercentage,
    stopLoss,
    currentPrice,
    leverage,
  } = data

  // Calculate the risk amount in account currency
  const riskAmount = (accountBalance * riskPercentage) / 100

  // Default pip value calculations based on instrument type
  let pipValue = 0
  let lotSize = 0
  let explanation = ""

  // Calculate based on instrument type
  switch (instrumentType) {
    case "Forex":
      // For Forex, standard lot is 100,000 units of base currency
      // Pip value = (0.0001 * lot size * 100,000) / current price (for JPY pairs use 0.01 instead of 0.0001)
      const isJPY = symbol.includes("JPY")
      const pipSize = isJPY ? 0.01 : 0.0001

      // Calculate pip value for 1 standard lot
      if (symbol.endsWith(accountCurrency)) {
        // Direct quote (e.g., EUR/USD for USD account)
        pipValue = pipSize * 100000
      } else if (symbol.startsWith(accountCurrency)) {
        // Indirect quote (e.g., USD/JPY for USD account)
        pipValue = (pipSize * 100000) / currentPrice
      } else {
        // Cross rate - simplified calculation
        pipValue = (pipSize * 100000) / currentPrice
      }

      // Calculate lot size
      lotSize = (riskAmount / (stopLoss * pipValue)) * leverage

      explanation =
        `Based on your account balance of ${accountBalance} ${accountCurrency} and risk tolerance of ${riskPercentage}%, ` +
        `you can risk ${riskAmount} ${accountCurrency} on this trade. With a stop loss of ${stopLoss} pips and leverage of ${leverage}x, ` +
        `the optimal lot size is ${lotSize.toFixed(2)} standard lots.`
      break

    case "Crypto":
      // For crypto, calculations are typically based on contract size
      // Simplified calculation for crypto
      const contractSize = 1 // This varies by exchange
      pipValue = stopLoss * 0.01 * currentPrice * contractSize
      lotSize = (riskAmount / pipValue) * leverage

      explanation =
        `For crypto trading, with your risk amount of ${riskAmount} ${accountCurrency} and a stop loss of ${stopLoss} points ` +
        `at the current price of ${currentPrice}, the recommended position size is ${lotSize.toFixed(4)} ${symbol.split("/")[0]}.`
      break

    case "Metals":
      // For metals like gold, standard lot is typically 100 oz
      const ouncesPerLot = 100
      pipValue = stopLoss * 0.1 * ouncesPerLot // For gold, 1 pip is usually $0.1 per oz
      lotSize = (riskAmount / pipValue) * leverage

      explanation =
        `For metals trading, with your risk amount of ${riskAmount} ${accountCurrency} and a stop loss of ${stopLoss} points, ` +
        `the recommended lot size is ${lotSize.toFixed(2)} lots (${lotSize * ouncesPerLot} ounces).`
      break

    case "Indices":
      // For indices, calculation depends on the specific index and point value
      const pointValue = 1 // This varies by index
      pipValue = stopLoss * pointValue
      lotSize = (riskAmount / pipValue) * leverage

      explanation =
        `For indices trading, with your risk amount of ${riskAmount} ${accountCurrency} and a stop loss of ${stopLoss} points, ` +
        `the recommended contract size is ${lotSize.toFixed(2)} contracts.`
      break

    case "Synthetic":
      // Simplified calculation for synthetic instruments
      pipValue = stopLoss * 0.1
      lotSize = (riskAmount / pipValue) * leverage

      explanation =
        `For synthetic instrument trading, with your risk amount of ${riskAmount} ${accountCurrency} and a stop loss of ${stopLoss} points, ` +
        `the recommended position size is ${lotSize.toFixed(2)} units.`
      break

    default:
      lotSize = 0
      explanation = "Could not calculate lot size due to unknown instrument type."
  }

  return {
    lotSize: lotSize.toFixed(2),
    riskAmount: riskAmount.toFixed(2),
    explanation,
  }
}

// Register the scene
const stage = new Scenes.Stage([calculationScene])
bot.use(session())
bot.use(stage.middleware())

// Command to start the calculation wizard
bot.command("calculate", (ctx) => {
  ctx.scene.enter("CALCULATION_WIZARD")
})

// Handle unknown commands
bot.on(message("text"), (ctx) => {
  ctx.reply("I don't understand that command. Use /help to see available commands.")
})

// Start the bot
bot
  .launch()
  .then(() => {
    console.log("Bot is running!")
  })
  .catch((err) => {
    console.error("Failed to start bot:", err)
  })

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
