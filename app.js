var ccxt = require('ccxt');
var _ = require('lodash');
var config2 = require('./config');
var async = require('async');
var exchanges = _.keys(config2.exchanges);
var util = require('./util');
var Coinbase = require('coinbase').Client;
var coinbaseClient = null;

function main() {
    async.map(exchanges, function (exchange, next) {
        fetchBalanceForExchange(exchange, next);
    }, function (err, results) {
        //console.log(JSON.stringify(results));

        var totals = _.map(results, function (r) {
            return r && r.total;
        });
        var total = sumEachCoin(totals)
        var nonZeroTotal = getNonZeroProperties(total);
        var coinBreakdown = _.map( _.keys(nonZeroTotal), function(currency) {
            var coin = {
                currency: currency,
                total: nonZeroTotal[currency],
            }
            _.each(results, function(exchange) {
                coin[exchange.exchange] = exchange.total[currency] || 0;
            });

            return coin;
        });

        console.log("### Current Balances");
        console.log(util.makeTable(coinBreakdown));
    });
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
        coinbaseClient.getAccounts({}, function(err, accounts) {
            accounts.forEach(function(acct) {
                console.log('my bal: ' + acct.balance.amount + ' for ' + acct.name);
                totals[acct.balance.currency] = Number(acct.balance.amount) + (totals[acct.balance.currency]||0);
            });

            return callback(null, {total: totals, exchange: exchangeName });
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
            total[k] += r[k] || 0;
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