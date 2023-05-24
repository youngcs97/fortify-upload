const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')

// helps display a curl command for this url
const util = require("../../util.js")
const curl = function(req, token, group="") { 
  const g = (group.length>0) ? ` -F "group=${group}"` : ""
  return `curl -H "accept:*/json" -F "token=${util.nvl(token,"YourToken")}"${g} "${util.host(req)}/sast/issues"` 
}

router.get('/', asyncHandler(async function(req, res, next) {
  const t = req.query.token||""
  const g = req.query.group||""
  res.render('sast/issues', { "title": 'Issues', tooltips: true, token: t, curl: curl(req, t, g) });
}));

// curl -F "token=helloworld" http://localhost:4000/sast/issues
// curl -F "token=helloworld" -F "group=CWE" http://localhost:4000/sast/issues
router.post('/', asyncHandler(async function(req, res, next) {

  //let html = ((req.params.option||'').toUpperCase().trim()=="HTML")
  const t = (req.body.token||'').trim()
  const g = (req.body.group||'').toUpperCase().trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display
  let p = null

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) { 
      return res.status((m.length==0) ? 200 : 500).json({ success: (m.length==0), token: t, messages: m, data: d });
    } else {
      return res.render('sast/issues', { title: 'Issues', tooltips: true, token: t, group: g, data: d, messages: m, curl: curl(req, t, g) });
    }
  }

  if (t.length==0) {
    return render("No token provided")
  } else {
    require("../../tokens.js").get(t).then((x)=>{
      if (x==null) return render(`Token '${t}' not found`)
      if ((x.submit==null)||(x.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
      
      const f = require("../../fortify-api.js")
      const fn = (['CWE','OWASPASVS40','GDPR'].includes(g)) ? f.issuesBy[g] : f.issuesBy.default
      fn(x.project, x.version).then(
        (r)=>{
          d = r
          return render()
        },
        (r)=>{ return render(r.body) }
      )
    })
  }
}));
module.exports = router;
