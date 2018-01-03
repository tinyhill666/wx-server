const superagent = require('superagent');
const config = require('./config.json');
const mail = require('./tools/mail');
const sms = require('./tools/sms');
const log4js = require('log4js');
const logger = log4js.getLogger('eos');
logger.level = config.loggerLevel;
const mongoUtils = require('./tools/mongo');

var markets = config.market.EOS;

const interval = config.interval;
const alarmMargin = config.margin;

process.on('uncaughtException', function (err) {
    logger.error('Caught exception: ' + err);
});

function getMargin(src, des) {
    let margin = (des.sellPrice - src.buyPrice) / src.buyPrice;
    return margin.toFixed(4);
}

var flag = true; //发送邮件后关闭发邮件功能，等待一段时间后开启。平台 : @var(p1)  与平台 : @var(p2) 差值 : @var(percent) % .
var sendNotification = function (bestMargin, message) {
    if (flag) {
        let subject = ("token:EOS " + SbestMargin.srcMarket + " => " + bestMargin.desMarket + " Margin : " + (bestMargin.margin * 100).toFixed(2) + '%');
        mail.sendMail(subject, message);
        sms.sendSMS(bestMargin.srcMarket, bestMargin.desMarket, bestMargin.margin);
        flag = false;
        setTimeout(() => {
            flag = true;
        }, config.mail_timeout);
    }
}

setInterval(() => {
    //获取价格对
    let promises = [];
    for (let i = 0; i < markets.length; i++) {
        promises.push(mongoUtils.getPair(markets[i], "EOS"));
    }
    Promise.all(promises)
        .then((pairs) => {
            let hasMargin = false;
            let bestMargin = {
                "margin": 0,
                "srcMarket": "",
                "desMarket": ""
            };
            for (let i = 0; i < pairs.length; i++) {
                let src = pairs[i];
                if (!src.buyPrice || !src.sellPrice) {
                    continue;
                }
                for (let j = 0; j < pairs.length; j++) {
                    let des = pairs[j];
                    if (!des.buyPrice || !des.sellPrice) {
                        continue;
                    }
                    if (i == j) {
                        continue;
                    }
                    let margin = getMargin(src, des);
                    //差价写入mongodb
                    mongoUtils.insertMargin(src.market, des.market, "EOS", margin);
                    //
                    if (margin > 0) {
                    }
                    if (margin > alarmMargin) {
                        hasMargin = true;
                        if (margin > bestMargin.margin) {
                            bestMargin.margin = margin;
                            bestMargin.srcMarket = src.market;
                            bestMargin.desMarket = des.market
                        }
                    }
                }
            }


            //如果有显著差价，提醒
            if (hasMargin) {
                sendNotification(bestMargin, "text");
            }
        });

}, interval);