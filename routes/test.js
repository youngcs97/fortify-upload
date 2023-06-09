const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')

// helps display a curl command for this url
require("../util.js")
const curl = function(req) { return `curl -H "accept:*/json" -F "file=@YourFile.zip" "${util.host(req)}/test" > YourOutputFile.zip` }

router.get('/', asyncHandler(async function(req, res, next) {
  return res.render('test', { title: 'Test', message: "&nbsp;", curl: curl(req) });
}));

// curl -F "file=@sourcecode.packaged.zip" http://localhost:4000/test > test.packaged.zip
// curl -F "file=@sourcecode.unpackaged.zip" http://localhost:4000/test > test.unpackaged.zip
// curl -F "file=blah" http://localhost:4000/test
router.post('/', asyncHandler(async function(req, res, next) {
  if (!req.files || Object.keys(req.files).length === 0) {
    //return res.render('test', { title: 'Test', message: "No file uploaded" });
    if (req.accepts('json')&&(!req.accepts('html'))) {
      return res.status(500).json({ message: "No file uploaded", x: [req.accepts('json'),!req.accepts('html')] });
    } else {  //req.accepts('text/html')
      return res.render('test', { title: 'Test', message: "No file uploaded", curl: curl(req) });
    }
  }
  const f = req.files[Object.keys(req.files)[0]]
  const u = require("../fortify-upload.js")
  const x = await u.zip(f.data, f.name)
  res.set('Content-Type', 'application/zip')
  res.set('Content-Disposition', `attachment; filename=test_generated_${(new Date(Date.now())).toISOString()}.zip`);
  res.set('Content-Length', x.length);
  return res.send(x)
}));

module.exports = router;
