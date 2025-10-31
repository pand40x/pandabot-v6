const YahooFinance = require('yahoo-finance2').default;
const yf = new YahooFinance();

console.log('quote method:', typeof yf.quote);

(async () => {
  try {
    const quote = await yf.quote('AAPL');
    console.log('Success\!', {
      symbol: quote.symbol,
      price: quote.regularMarketPrice,
      currency: quote.currency
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
