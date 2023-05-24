var express = require('express');
var router = express.Router();

// helps display a curl command for this url
const util = require("../util.js")
const curl = function(req, token) { return `try: curl -H 'accept:*/json' -F 'file=@YourFile.zip' -F 'token=${util.nvl(token,"YourToken")}' '${util.host(req)}/upload'` }


router.all('/', function(req, res, next) {
  const t = req.query["token"]||""
  if (req.accepts('json')&&(!req.accepts('html'))) {  
    res.status(200).json({ success: true, status: 200, path: req.path, messages: [curl(req, t)] });
  } else {
    res.render('index', { title: 'Fortify Upload Submit' });
  }
});

module.exports = router;
