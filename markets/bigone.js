const superagent = require('superagent');
const config = require("../config.json");
const Pair = require("../lib/pair.js").Pair;

const interval = config.interval;
const position = config.position;

/**
 * 计算特定深度均价
 * @param {*} group 报价数组
 * @param {*} depth 报价深度
 * @param {*} position 头寸
 */
function averagePrice(group, depth, position) {

    let amount = 0;
    let average = 0;
    let total = 0;
    for (let i = 0; i < depth && amount < position; i++) {
        //深度数组每一项包含数量和价格，0是价格，1是数量
        amount += 1 * group[i].amount;
        total += 1 * group[i].price * group[i].amount
        average = total / amount;
    }
    return average;
}

function call(market, symbol) {
    //BTS-BNC
    let url = "https://api.big.one/markets/" + market + "/book";
    let bigOnePair = new Pair("BitCNY", symbol, "bigOne");

    superagent.get(url)
        .end(function (err, res) {
            // 抛错拦截
            if (err) {
                //return throw Error(err);
            }
            // res.text 包含未解析前的响应内容
            //console.log(res.text);
            if (res) {
                let depthGroup = JSON.parse(res.text).data;
                let depthSize = depthGroup.asks.length;
                let middlePrice = (1 * depthGroup.asks[0].price + 1 * depthGroup.bids[0].price) / 2;
                let tokenPosition = position / middlePrice;
                let buyPrice = averagePrice(depthGroup.asks, depthSize, tokenPosition);
                let sellPrice = averagePrice(depthGroup.bids, depthSize, tokenPosition);
                bigOnePair.buyPrice = buyPrice;
                bigOnePair.sellPrice = sellPrice;

                const mongoUtils = require('../tools/mongo');
                mongoUtils.insertPair(bigOnePair);
            }
        });
}

//轮询获取最新价格
setInterval(() => {
    call("BTS-BNC","BTS");
    call("EOS-BNC","EOS");
    call("ETH-BNC","ETH");
}, interval);