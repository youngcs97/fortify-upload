const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')

function camel(value) {
  return value.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toUpperCase() : word.toLowerCase();
  }).replace(/\s+/g, '');
}

const handler = asyncHandler(function(req, res, next) {
  const t = (req.query.token||req.params.token||'').trim()
  const d = (req.params.detail||'').trim().toUpperCase()  // convert to Upper
  let m = []  // holds error messages for client display
  let s = false // holds jobstatus from SAST controller

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status((m.length==0) ? 200 : 500).json({ token: t, status: s, messages: m });
    } else {
      return res.render('status', { title: 'Status', token: t, status: s, messages: m });
    }
  }

  if (t.length==0) {
    if (!(typeof req.query.token==="undefined")) render("No token provided")
    return render()
  } else {

    const x = require("../tokens.js").find(t)
    if ((x==null)||(x.token==null)) return render(`Token '${t}' not found`)
    if ((x.token.submit==null)||(x.token.submit.token==null)) return render(`No previously submited jobs for token '${t}' found`)
    const j = x.token.submit.token

    const u = require("../fortify-upload.js")
    // check if user wants a download file
    if (d.length > 0) {
      if (['FPR','LOG'].includes(d)) {          // only accept LOG and FPR extensions
        u.details(x.url, x.client, j, "2", d).then(
          (r)=>{
            res.set('Content-Type', (d=="LOG")?"text/plain":"application/zip")
            res.set('Content-Disposition', `attachment; filename=${t}_${(new Date(Date.now())).toISOString()}.${d}`);
            res.set('Content-Length', r.body.length);
            return res.send(r.body)
          },
          (r)=>{
            return render(r.body)
          }
        )
      } else {
        return render("Unknown file extension requested")
      }
    } else {
      // fetch jobstatus
      u.details(x.url, x.client, j, "3", "status").then(
        (r)=>{
          s = JSON.parse(r.body)  // be sure to parse body to JSON
          console.log(s)
          s.icon = (s.state=="COMPLETED")?"check-circle":"exclamation-circle"
          s.files = (s.state=="COMPLETED")
          s.state = camel(s.state)
          s.sscUploadState = camel(s.sscUploadState)
          s.time = new Date(Date.now())
          return render()
        },
        (r)=>{
          return render(r.body)
        }
      )

    }
    
  }
})

router.get('/', handler);
router.get('/:token', handler);
router.get('/:token/:detail', handler);

module.exports = router;
