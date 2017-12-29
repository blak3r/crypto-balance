var ccxt = require('ccxt');
var _ = require('lodash');
var config2 = require('./config');
var async = require('async');
var exchanges = _.keys(config2.exchanges);
var util = require('./util');
var Coinbase = require('coinbase').Client;
var coinbaseClient = null;
const log4js = require('log4js');
log4js.configure({
                     appenders: { logFile: { type: 'file', filename: 'log.txt' } },
                     categories: { default: { appenders: ['logFile'], level: 'info' } }
                 });
const logger = log4js.getLogger('logFile');

function main() {
    console.log("Fetching market prices");
    fetchTickersFromSeveralExchanges(null, function(err, tickers) {
        fetchBalances(tickers, function(err, coinBreakdown) {
            makeReport( coinBreakdown, tickers, function(err,results) {
                if(err) { console.error(err); }
                process.exit(0);
            });
        });
    });
}

function fetchTickersFromSeveralExchanges(opts, callback) {
    var exchanges = opts && opts.exchanges || ['binance', 'kucoin'];

    async.mapSeries(exchanges, function(exchangeName, next) {
        var exchange = new ccxt[exchangeName]();
        exchange.fetchTickers().then( (ticker) => {
            return next(null,ticker);
        }).catch( err => {
            return next(err);
        });
    },function(err, results) {
        if(err) { return callback(err); }

        // Merge Tickers
        var merged = {};
        _.each(results, function(result) {
            merged = _.extend(merged, result);
        });
        return callback(err, merged);
    });
}

function fetchBalances(tickers, callback) {
    console.log("Retreiving balances from: " + exchanges.join(", "));

    async.map(exchanges, function (exchange, next) {
        fetchBalanceForExchange(exchange, function(err, balance) {
            if(err) { console.error("Failed to retrieve balance from: " + exchange + " error: " + err); }
            return next(null, balance); // Continue anyway
        });
    }, function (err, balances) {
        // Add Statically Configured Exchanges
        _.map(config2.unsupported_exchanges, function (val, key) {
            balances.push({exchange: key, total: val});
        });


        return callback(err, balances);
    });
}

function makeReport(balances, tickers, callback ) {
    var report = "";

    var totals = _.map(balances, function (r) {
        return r && r.total;
    });

    var totals = sumEachCoin(totals)
    var nonZeroTotal = getNonZeroProperties(totals);
    // nonZeroTotal = _.filter(nonZeroTotal, function(t) { return t.currency != "USD"; }); // Remove USD in wallets
    var coinBreakdown = _.map(_.keys(nonZeroTotal), function (currency) {
        var coin = {
            currency: currency,
            total: nonZeroTotal[currency],
        }
        _.each(balances, function (exchange) {
            coin[exchange.exchange] = exchange.total[currency] || 0;
        });

        coin.marketPrice = getUSDMarketPriceFromTickers(tickers, currency);
        coin.usdValue = coin.marketPrice * coin.total;

        return coin;
    });

    report += "\n### Current Balances" + "\n";
    report += util.makeTable(coinBreakdown) + "\n";

    // Currently only coinbase is supported for calculating the total ROI
    _.each(balances, function (result) {
        if (result.transactions) {
            report += "\n### Purchase History on " + result.exchange + "\n";
            var buys = _.filter(result.transactions, function (t) {
                return t.type === "buy" && t.currency !== "USD"
            });
            _.each(buys, function (b) {
                b.amount = Number(b.amount);
                b.native_amount = Number(b.native_amount);
                b.coinPrice = Number(b.native_amount) / Number(b.amount);
            })
            buys = _.sortBy(buys, "createdAt");
            report += util.makeTable(buys, {
                columns: ["createdAt", "currency", "amount", "native_amount", "native_currency", "coinPrice",
                          "description"]
            }) + "\n";

            var summed = groupByAndSum(buys);
            report += "\n### Purchase Summary on " + result.exchange + "\n";
            report += util.makeTable(summed, {columns: ["coin", "amount", "totalInvested", "avgCoinPrice"]}) + "\n";

            // var transfersToWallet = _.filter(result.transactions, function (t) {
            //     return t.type === "transfer";
            // });
            //
            // report += util.makeTable(transfersToWallet)  + "\n";;

            var totalInvested = _.sumBy(summed, "totalInvested");
            var presentValue = _.sumBy(coinBreakdown, "usdValue");
            var roi = (100*(presentValue - totalInvested) / (totalInvested)).toFixed(2);
            report += "\nTotal Invested (USD): $" + totalInvested.toFixed(2) + "\n";;
            report +=   "Present Value       : $" + presentValue.toFixed(2)  + "\n";;
            report += "ROI: " + roi + "%\n";;


            report += "\n* Note: ROI may be inaccurate if you have uninvested funds in a coinbase wallet.  Total Invested doesn't include USD that was transfered into a coinbase wallet... but present value does." + "\n";
            report += "** Present Value prices come from binance" + "\n";;
        }
    });

    console.log( report );
    logger.info( "\n##########################################################################\n" + report );
}

function getUSDMarketPriceFromTickers(tickers, currency) {
    if( currency === "USD" ) { return 1; }
    var ticker = tickers[ currency + "/USDT" ];
    if( ticker ) {
        return ticker.ask;
    }
    // Some altcoins don't have a market ticker directly to usd... so convert to BTC then USD
    if( !ticker ) {
        ticker = tickers[ currency + "/BTC"];
        var tickerBTC = tickers[ "BTC/USDT"];
        if( ticker ) {
            return ticker.ask * tickerBTC.ask;
        }
    };
}



function groupByAndSum(data, groupProperty, sumProperty ) {
   return  _(data)
        .groupBy('currency')
        .map((transaction, currency) => ({
            coin: currency,
            amount: _.sumBy(transaction, 'amount'),
            totalInvested: _.sumBy(transaction, 'native_amount'),
            native_currency: _.first(transaction).native_currency,
            avgCoinPrice: _.sumBy(transaction, 'native_amount') / _.sumBy(transaction, 'amount')
        }))
        .value();
}

// fetchMyTrades (binance) doesn't have market symbol BTC
// Revisit once cctx supports more functions
function fetchTradeHistoryForExchange(exchangeName, callback ) {
    var exchange = new ccxt[exchangeName]( config2.exchanges[exchangeName] );

    (async () => {
        exchange.fetchOrders("BTC").then( (orders) => {
            return callback(null, _.extend({exchange: exchangeName}, orders));
        }).catch( (err) => {
           console.error(exchangeName + " failed to fetchOrders: ", err);
           return callback(err);
        });
    }) ()
}


function fetchBalanceForExchange( exchangeName, callback) {
    if(exchangeName === "coinbase") {
        coinbaseClient = new Coinbase({apiKey: config2.exchanges[exchangeName].apiKey, apiSecret: config2.exchanges[exchangeName].secret});
        var totals = {};
        var coinbaseTransactions = [];
        coinbaseClient.getAccounts({}, function(err, accounts) {
            if(err) { return callback(err); }
            async.eachSeries( accounts, function(acct, next) {
                totals[acct.balance.currency] = Number(acct.balance.amount) + (totals[acct.balance.currency] || 0);
                acct.getTransactions(null, function (err, txns, pagination) {
                    acct.getTransactions(pagination, function (err, txns) {
                        if(err) { return next(err); }

                        var summaries = _.map(txns, function (tx) {
                            return {
                                id: tx.id,
                                type: tx.type,
                                status: tx.status,
                                amount: _.get(tx, "amount.amount"),
                                currency: _.get(tx, "amount.currency"),
                                native_amount: _.get(tx, "native_amount.amount"),
                                native_currency: _.get(tx, "native_amount.currency"),
                                description: _.get(tx, "details.title") + " " + _.get(tx, "details.subtitle"),
                                createdAt: tx.created_at,
                            }
                        });
                        coinbaseTransactions = coinbaseTransactions.concat(summaries);
                        next(err);
                    });
                });
            }, function(err) {
                return callback(err, {total: totals, exchange: exchangeName, transactions: coinbaseTransactions });
            })

        });
    }
    else {
        var exchange = new ccxt[exchangeName](config2.exchanges[exchangeName]);
        exchange.fetchBalance().then((balances) => {
            return callback(null, _.extend({exchange: exchangeName}, balances));
        }).catch((err) => {
            console.error(exchangeName + " failed fetchBalance", err);
            return callback(err);
        });
    }
}

function sumEachCoin(totals) {
    var keys = [];
    _.each(totals, function (r) {
        keys = keys.concat(_.keys(r));
    })
    keys = _.uniq(keys);

    var total = {};
    _.each(keys, function (k) {
        total[k] = 0;
        _.each(totals, function (r) {
            total[k] += r && r[k] || 0;
        });
    });
    return total
}

function getNonZeroProperties( total ) {
    var retVal = {};
    _.map(total, function(value, key) {
        if( value > 0 ) {
            retVal[key] = value;
        }
    })
    return retVal;
}


if (module === require.main) {
    main();
}

module.exports =  exports;