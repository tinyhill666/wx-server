var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('watch', { title: '数字货币行情监控' });
});

module.exports = router;