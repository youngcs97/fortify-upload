const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')

// helps display a curl command for this url
const util = require("../util.js")
const curl = function(req, token) { return `curl -H "accept:*/json" -F "token=${util.nvl(token,"YourToken")}" "${util.host(req)}/status"` }

router.get('/', asyncHandler(async function(req, res, next) {
  const t = req.query["token"]||""
  res.render('status', { "title": 'Status', token: t, curl: curl(req, t) });
}));

// curl -F "token=helloworld" http://localhost:4000/status
router.post('/', asyncHandler(async function(req, res, next) {
  const t = (req.body.token||'').trim()
  const d = (req.body.detail||'').trim().toUpperCase()  // convert to Upper
  let m = []  // holds error messages for client display
  let s = null // holds jobstatus from SAST controller
  let fe = null // holds front-end details for ejs rendering

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status((m.length==0) ? 200 : 500).json({ success: (m.length==0), token: t, messages: m, status: s });
    } else {
      return res.render('status', { title: 'Status', token: t, messages: m, status: s, frontend: fe, curl: curl(req, t) });
    }
  }

  if (t.length==0) {
    return render("No token provided")
  } else {
    require("../tokens.js").get(t, true).then((x)=>{
      if (x==null) return render(`Token '${t}' not found`)
      if ((x.submit==null)||(x.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
      const j = x.submit.token

      const u = require("../fortify-upload.js")
      // check if user wants a download file
      if (d.length > 0) {
        if (['FPR','LOG'].includes(d)) {          // only accept LOG and FPR extensions
          u.details(x.url, x.client, j, "2", d).then(
            (r)=>{
              res.set('Content-Type', (d=="LOG")?"text/plain":"application/octet-stream")
              res.set('Content-Disposition', `attachment; filename=${t}_${(new Date(Date.now())).toISOString()}.${d}`);
              return res.send(r.body)
            },
            (r)=>{ return render(r.body) }
          )
        } else {
          return render("Unknown file extension requested")
        }
      } else {
        

        // fetch jobstatus
        u.details(x.url, x.client, j, "3", "status").then(
          (r)=>{

            s = JSON.parse(r.body)  // be sure to parse body to JSON
            fe = {
              icon : ((s.state=="COMPLETED")?"check-circle":"exclamation-circle"),
              files : (s.state=="COMPLETED"),
              state : util.camel(s.state),
              sscUploadState : util.camel(s.sscUploadState),
              time : new Date(Date.now())
            }
            return render()
          },
          (r)=>{ return render(r.body) }
        )
      }
    })
  }
}));
module.exports = router;
