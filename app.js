'use strict';
const http = require('http');
const express = require('express');
const app = express();
const _ = require('lodash');
const crypto = require('crypto');
const config = require('./config.json');
const mongoUtils = require('./tools/mongo');
const fs = require('fs');
const path = require('path');
const common = require('./tools/common');
const logger = common.getLogger('notify main');
const front = require('./front/javascripts/index');
const authConfig = require('./configs/auth.json');

/* app.options('*', cors());
app.use(cors());
//support parsing of application/json type post data
app.use(bodyParser.json());
//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
  extended: false
})); */

/* app.use(function (req, res, next) {
  //console.log(req);
  next();
});
 */

//静态资源
app.use(express.static(path.join(__dirname, 'front')));
app.use('/', front);
// view engine setup
app.set('views', path.join(__dirname, 'front/views'));
app.set('view engine', 'jade');


var server = http.createServer(app).listen(config.server.port, function () { });
console.log('start on:' + config.server.port);
server.timeout = 240000;
var io = require('socket.io')(server);

io.on('connection', function (socket) {
  //socket.emit('news', { hello: 'world' });
  setInterval(() => {
    let tokenList = ['QC', 'BTS', "ETH", "EOS", "NEO", "GXS", "YOYO"];
    for (let i = 0; i < tokenList.length; i++) {
      let token = tokenList[i];
      let promises = [];
      let list = config.market[token];
      for (let i = 0; i < list.length; i++) {
        promises.push(mongoUtils.getPair(list[i], token, "BitCNY"));
      }
      Promise.all(promises)
        .then((docs) => {
          //给出相对bts价格，方便计算搬砖数量
          if (token != "BTS") {
            mongoUtils.getPair("inner", "BTS", "BitCNY")
              .then((pair) => {
                let btsPrice = (pair.buyPrice + pair.sellPrice) / 2
                for (let i in docs) {
                  docs[i].buyPriceByBTS = docs[i].buyPrice / btsPrice;
                  docs[i].sellPriceByBTS = docs[i].sellPrice / btsPrice;
                }
                socket.emit(token, docs);
              });
          } else {
            socket.emit(token, docs);
          }
        })
    }
    for (let i = 0; i < tokenList.length; i++) {
      let token = tokenList[i];
      let promises = [];
      let list = config.market[token];
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (i == j) {
            continue;
          }
          promises.push(mongoUtils.getMargin(list[i], list[j], token));
        }
      }
      Promise.all(promises)
        .then((docs) => {
          socket.emit('margin-' + token, docs);

        })
    }
  }, config.interval);


});


app.get('/test', (req, res) => {
  res.end('hello');
});

app.get('/watch/:token', (req, res) => {
  let token = req.params.token;
  var promises = [];
  var list = config.market[token];
  for (let i = 0; i < list.length; i++) {
    promises.push(mongoUtils.getPair(list[i], token, "BitCNY"));
  }
  Promise.all(promises)
    .then((docs) => {
      //给出相对bts价格，方便计算搬砖数量
      if (token != "BTS") {
        mongoUtils.getPair("inner", "BTS", "BitCNY")
          .then((pair) => {
            let btsPrice = (pair.buyPrice + pair.sellPrice) / 2
            for (let i in docs) {
              docs[i].buyPriceByBTS = docs[i].buyPrice / btsPrice;
              docs[i].sellPriceByBTS = docs[i].sellPrice / btsPrice;
            }
            //为前端访问
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json(docs);
          });
      } else {
        //为前端访问
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.json(docs);
      }
    })
});

app.get('/margin/:token', (req, res) => {
  let token = req.params.token;
  logger.debug(token);
  var promises = [];
  var list = config.market[token];
  for (let i = 0; i < list.length; i++) {
    for (let j = 0; j < list.length; j++) {
      if (i == j) {
        continue;
      }
      promises.push(mongoUtils.getMargin(list[i], list[j], token));
    }
  }
  Promise.all(promises)
    .then((docs) => {
      //为前端访问
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(docs);
    })
});

/* //微信验证端口
app.get('/', (req, res) => {
  console.log('torched.');
  let signature = req.query.signature;
  let echostr = req.query.echostr;
  let timestamp = req.query.timestamp;
  let nonce = req.query.nonce;
  let token = authConfig.wechat.token;
  var list = [token, timestamp, nonce];
  console.log(list);
  //对数组进行ascii排序
  list = _.sortBy(list, [function (o) { return o; }]);
  console.log(list);
  let raw = list[0] + list[1] + list[2];
  console.log(raw);
  var sha1 = crypto.createHash('sha1');
  sha1.update(raw);
  let local_signature = sha1.digest('hex');
  console.log(signature);
  console.log(local_signature);
  if (local_signature == signature) {
    res.end(echostr);
  }
  res.end('');
});

//微信用户回复接口
app.post('/', (req, res) => {
  //console.log('POST');
  let ToUserName = req.query.openid;//  是      接收方帐号（收到的OpenID）
  let FromUserName = authConfig.wechat.account;//是     开发者微信号
  let CreateTime = 1513926999;//Date.now()/1000; //     是      消息创建时间 （整型）
  let MsgType = 'text';//是     text

  let pairs = price.pairs;
  let Content = price.getText();

  let tmpStr = '<xml><ToUserName><![CDATA[' + ToUserName + ']]></ToUserName><FromUserName><![CDATA[' + FromUserName + ']]></FromUserName><CreateTime>' + CreateTime + '</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + Content + ']]></Content></xml>';
  console.log(tmpStr);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(tmpStr);
});
 */