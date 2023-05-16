var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(rq, rs, next) {
  rs.render('index', { title: 'Fortify Upload Submit' });
});

module.exports = router;
