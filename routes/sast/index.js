const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')

const handler = asyncHandler(function(req, res, next) {
  const t = (req.query.token||req.params.token||'').trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display
  let p = null

  const render = function(push) {
    if (push!=null) m.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) {  
      return res.status((m.length==0) ? 200 : 500).json({ token: t, data: d, messages: m });
    } else {
      return res.render('sast/index', { title: 'Project Status', tooltips: true, token: t, data: d, messages: m });
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
        try { p = parseInt(r.data[0].project.id) } catch { return render(`Could not determine project assignment`) }
        f.sast.projectscans(p, true).then(
          (r)=>{
            d = r
            if (d.versions.length==0) return render("Nothing found for your project")
            return render()
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
router.get('/project', handler);
router.get('/project/:token', handler);

module.exports = router;
