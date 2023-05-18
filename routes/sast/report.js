const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')


// curl http://localhost:4000/sast/report/helloworld > reportxyz.pdf
// curl http://localhost:4000/sast/report/XYZ 
const handler = asyncHandler(function(req, res, next) {
  const t = (req.query.token||req.params.token||'').trim()
  let m = []  // holds error messages for client display

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status(500).json({ version: v, messages: m });
    } else {
      return res.render('sast/report', { title: 'Report', version: v, messages: m });
    }
  }
  
  if (t.length==0) {
    if (!(typeof req.query.token==="undefined")) render("No token provided")
    return render()
  } else {

    const x = require("../../tokens.js").find(t)
    if ((x==null)||(x.token==null)) return render(`Token '${t}' not found`)
    if ((x.token.submit==null)||(x.token.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
    const j = x.token.submit.token
    const f = require("../../fortify-api.js")
    f.projectversionid(x.token.project, x.token.version).then(
      (r)=>{
        console.log(r)
        let v
        try { v = parseInt(r.data[0].id) } catch { return render(`Could not determine project assignment`) }
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
      },
      (r)=>{
        return render(r.body)
      }
    )
  }
})

router.get('/', handler);
router.get('/:token', handler);

module.exports = router;
