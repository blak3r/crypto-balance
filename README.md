# Crypto Balance

Get your balances of all your cryptocurrencies across multiple exchanges.
Tested with coinbase, bittrex, binance, and gdax but will work with other exchanges supported by [cctx](https://github.com/ccxt/ccxt)


## Requirements
1. Node v7.7+ (author tested with 7.7.4)

## Usage

1. `git clone https://github.com/blak3r/crypto-balance`
2. `cd crypto-balance`
3. `npm install`
4. `cp config.example.js config.js`
5. For each exchange you use, add a new object to the exchange list with an `apiKey` and `secret`.  Refer to <https://github.com/ccxt/ccxt> for properties needed for constructor.
   All the exchanges the author used just required `apiKey` and `secret` as shown in the example config. Note: when creating api keys on each exchange the only permissions needed are read.  Don't allow withdrawal or trade for security.
6. run `node app.js`
7. Optionally, copy and paste into a spreadsheet.  Use Tools->Split Data Into Columns to split it into cells.

## Output

```
currency total              bittrex    binance    gdax             coinbase   
BTC      0.7756500499999999 0.45875911 0.00994235 0                0.30694859 
ETH      4.73886336         2.05       0          0                2.68886336 
LTC      6.77446505         5.05       0          0                1.72446505
NEO      16                 16         0          0                0          
WTC      114.885            0          114.885    0                0          
LEND     499.5              0          499.5      0                0          
USD      1295.000107147025  0          0          295.000107147025 1000       
```

## Plans
I plan to eventually import the trade history from each of the exchanges to show things like net worth over time.  

## License
Public domain