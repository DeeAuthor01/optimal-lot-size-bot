export function calculateLotSize(data) {
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
