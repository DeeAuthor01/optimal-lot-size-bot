import { Scenes } from "telegraf"

export function createCalculationScene(calculateLotSize) {
  return new Scenes.WizardScene(
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
}
