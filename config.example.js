module.exports = {
    // Exchanges below must be supported by ccxt or be coinbase, balances are fetched dyanmically
    exchanges: {
        bittrex: {
            apiKey: "key",
            secret: "secret"
        },
        binance: {
            apiKey: "key",
            secret: "secret"
        },
        gdax: {
            apiKey: "key",
            secret: "secret",
            password: "passphrase"
        },
        coinbase: {
            apiKey: "key",
            secret: "secret"
        }
        // Add and remove exchanges here to have them dynamically appear in the balance output
    },
    // Use this section to add in balances you have stored in wallets, or on an unsupported exchange.  It'll still be included
    // in your balance sheet you'll just need to update your config file when the amounts change.
    // KeyName can be anything... it's just used as column header.
    unsupported_exchanges: {
        kucoin: {
            BTC: 0.5046,
            WTC: 0.0
        },
        "nano_ledger": {
            BTC: 0.0,
            ETH: 0.0,
            LTC: 0.0
        }
    },
};