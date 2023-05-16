const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')


// curl http://localhost:4000/sast/report/10169 > reportxyz.pdf
// curl http://localhost:4000/sast/report/XYZ 
const handler = asyncHandler(function(req, res, next) {
  let v = (req.query.version||req.params.version||'').trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status(500).json({ version: v, messages: m });
    } else {  //req.accepts('text/html')
      return res.render('report', { title: 'Report', version: v, messages: m });
    }
  }
  
  if (v.length==0) {
    console.log(req.query.version)
    if (!(typeof req.query.version==="undefined")) render("Please provide a Project Version Id")
    return render()
  } else {
    if (isNaN(parseInt(v))) return render(`Project Version Id '${v}' must be an integer value`)
    v = parseInt(v)
    const f = require("../fortify-api.js")
    f.sast.report(v).then(
      (r)=>{
        res.set('Content-Type', 'application/octet-stream')
        res.set('Content-Disposition', `attachment; filename=${r.name}_${(new Date(Date.now())).toISOString()}.pdf`);
        return res.send(r.body)
      },
      (r)=>{
        return render(r.body)
      }
    )
  }
})

router.get('/', handler);
router.get('/:version', handler);

module.exports = router;
