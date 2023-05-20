const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')

const handler = asyncHandler(function(req, res, next) {
  

  const t = (req.query.token||req.params.token||'').trim()
  const g = (req.query.group||req.params.group||'').toUpperCase().trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display
  let p = null


  const render = function(push) {
    if (push!=null) m.push(push)
    return res.status((m.length==0) ? 200 : 500).json({ token: t, group: g, data: d, messages: m });
    // return res.render('sast/issues', { title: 'Issues', tooltips: true, token: t, data: d, messages: m });
  }

  if (t.length==0) {
    if (!(typeof req.query.token==="undefined")) render("No token provided")
    return render()
  } else {

    const x = require("../../tokens.js").find(t)
    if ((x==null)||(x.token==null)) return render(`Token '${t}' not found`)

    const f = require("../../fortify-api.js")
    //return render()

    const fn = (['CWE','OWASPASVS40','GDPR'].includes(g)) ? f.issuesBy[g] : f.issuesBy.default
    fn(x.token.project, x.token.version).then(
      (r)=>{
        d = r
        console.log(r)
        return render()
      },
      (r)=>{
        return render(r.body)
      }
    )
  }
})

router.get('/', handler);
router.get('/:token', handler);
router.get('/:token/by:group', handler);

module.exports = router;
