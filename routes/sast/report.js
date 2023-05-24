const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')

// helps display a curl command for this url
const util = require("../../util.js")
const curl = function(req, token) { return `curl -H "accept:*/json" -F "token=${util.nvl(token,"YourToken")}" "${util.host(req)}/sast/report" > YourOutputFile.pdf` }

router.get('/', asyncHandler(async function(req, res, next) {
  const t = req.query.token||""
  res.render('sast/report', { "title": 'Report', tooltips: true, token: t, curl: curl(req, t) });
}));

// curl -F "token=helloworld" http://localhost:4000/sast/report > reportxyz.pdf
router.post('/', asyncHandler(async function(req, res, next) {

  const t = (req.body.token||'').trim()
  let m = []  // holds error messages for client display

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status(500).json({ success: false, token: t, messages: m });
    } else {
      return res.render('sast/report', { title: 'Report', token: t, messages: m, curl: curl(req, t) });
    }
  }
  
  if (t.length==0) {
    return render("No token provided")
  } else {
    const tokens = require("../../tokens.js")
    tokens.get(t).then((x)=>{
      if (x==null) return render(`Token '${t}' not found`)
      if ((x.submit==null)||(x.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
      const j = x.submit.token
      let d = x.report    // work with the report date to throttle # of submissions per hour
      if ((d!=null)&&(!isNaN(Date.parse(d)))) { 
        d = Date.parse(d)
        const diff = ((Date.now()-(d+(1000 * 60 * 5))) / (1000 * 60)).toFixed(0) // check for X mins passing
        if (diff<0) { 
          return render(`Previously submitted on '${new Date(d)}'. Must wait ${diff*-1} minutes before submitting again.`) 
        }
      }
      const f = require("../../fortify-api.js")
      f.projectversionid(x.project, x.version).then((r)=>{
        let v
        try { v = parseInt(r.data[0].id) } catch { return render(`Could not determine project assignment`) }
        tokens.report(t).then((r)=>{  // call the update report date method
          f.sast.report(v).then((r)=>{  // download the report
            res.set('Content-Type', 'application/octet-stream')
            res.set('Content-Disposition', `attachment; filename=${r.name}_${(new Date(Date.now())).toISOString()}.pdf`);
            return res.send(r.body)
          }, (r)=>{ return render(r.body) })
        }, (r)=>{ return render(r.body) })
      }, (r)=>{ return render(r.body) })
    })
  }
}))

module.exports = router;
