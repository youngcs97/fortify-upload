const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')


// helps display a curl command for this url
const util = require("../../util.js")
const curl = function(req, token) { return `curl -H "accept:*/json" -F "token=${util.nvl(token,"YourToken")}" "${util.host(req)}/sast"` }

router.get('/', asyncHandler(async function(req, res, next) {
  const t = req.query["token"]||""
  res.render('sast/index', { "title": 'Project Status', tooltips: true, token: t, curl: curl(req, t) });
}));

// curl -F "token=helloworld" http://localhost:4000/status
router.post('/', asyncHandler(async function(req, res, next) {
  const t = (req.body.token||'').trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display
  let p = null

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status((m.length==0) ? 200 : 500).json({success: (m.length==0), token: t, messages: m, data: d });
    } else {
      return res.render('sast/index', { title: 'Project Status', tooltips: true, token: t, data: d, messages: m, curl: curl(req, t) });
    }
  }

  if (t.length==0) {
    if (!(typeof req.query.token==="undefined")) return render("No token provided")
    return render()
  } else {

    require("../../tokens.js").get(t).then((x)=>{
      if (x==null) return render(`Token '${t}' not found`)
      if ((x.submit==null)||(x.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
      const j = x.submit.token
      const f = require("../../fortify-api.js")
      f.projectversionid(x.project, x.version).then(
        (r)=>{
          try { p = parseInt(r.data[0].project.id) } catch { return render(`Could not determine project assignment`) }
          f.sast.projectscans(p, true).then(
            (r)=>{
              d = r
              if (d.versions.length==0) return render("Nothing found for your project")
              return render()
            },
            (r)=>{ return render(r.body) }
          )
        },
        (r)=>{ return render(r.body) }
      )
    })
  }
}));
module.exports = router;
