const WebSocket = require('ws');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;

const interval = config.interval;
const depthSize = config.depth;
const position = config.position;

const url = 'wss://bit.btsabc.org/ws';

const CNY = "1.3.113";
const BTS = "1.3.0";
const OPEN_EOS = "1.3.1999";
const WWW_EOS = "1.3.2402";
const EOS_PRECISION = 1000000;
const CNY_PRECISION = 10000;
const BTS_PRECISION = 100000;


//call(CNY,WWW_EOS,EOS_PRECISION,"EOS","WWW.EOS")
const call = function (base, target, precision, symbol, market) {

    let ws = new WebSocket(url);

    let sendMessage = { "id": 1, "method": "call", "params": [0, "get_limit_orders", [target, base, depthSize]] }
    let innerPair = new Pair('bitCNY', symbol, market);

    ws.on('open', function open() {
        setInterval(() => {
            ws.send(JSON.stringify(sendMessage))
        }, interval);

    });

    ws.on('message', function incoming(data) {
        let result = JSON.parse(data).result;
        //计算范围内均价
        let token_amount_total = 0;
        let cny_amount_total = 0;
        //深度可能不到depthSize
        let sellDepth = 0;
        for (let i = 0; i < depthSize && cny_amount_total < position && result[i].sell_price.quote.asset_id == CNY; i++) {
            let token_unit = result[i].sell_price.base.amount;
            let cny_unit = result[i].sell_price.quote.amount;
            let price = (cny_unit / CNY_PRECISION) / (token_unit / precision);

            let token_amount = result[i].for_sale / precision;
            let cny_amount = token_amount * price;
            cny_amount_total += cny_amount;
            token_amount_total += token_amount;

            sellDepth++;

        }

        let buyPrice = cny_amount_total / token_amount_total;

        //上面循环因为头寸退出，则计数器sellDepth还需要加
        while (result[sellDepth].sell_price.quote.asset_id == CNY) {
            sellDepth++;
        }

        token_amount_total = 0;
        cny_amount_total = 0;
        for (let i = 0; i < depthSize && cny_amount_total < position; i++) {
            let token_unit = result[sellDepth + i].sell_price.quote.amount;
            let cny_unit = result[sellDepth + i].sell_price.base.amount;
            let price = (cny_unit / CNY_PRECISION) / (token_unit / precision);

            let cny_amount = result[sellDepth + i].for_sale / CNY_PRECISION;
            let token_amount = cny_amount / price;
            cny_amount_total += cny_amount;
            token_amount_total += token_amount;

        }
        let sellPrice = cny_amount_total / token_amount_total;

        innerPair.buyPrice = buyPrice;
        innerPair.sellPrice = sellPrice;
        const mongoUtils = require('../tools/mongo');
        mongoUtils.insertPair(innerPair);

    });
}

call(CNY, WWW_EOS, EOS_PRECISION, "EOS", "WWW.EOS");
call(CNY, OPEN_EOS, EOS_PRECISION, "EOS", "OPEN.EOS");
call(CNY, BTS, BTS_PRECISION, "BTS", "inner");