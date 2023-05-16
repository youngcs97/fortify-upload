const express = require('express');
const router = express.Router();

const asyncHandler = require('express-async-handler')

const handler = asyncHandler(function(req, res, next) {
  let p = (req.query.project||req.params.project||'').trim()
  let d = null  // data container for rendering
  let m = []  // holds error messages for client display

  const render = function(push) {
    if (push!=null) m.push(push)
    return res.render('sast', { title: 'Status', tooltips: true, project: p, data: d, messages: m });
  }

  if (p.length==0) {
    if (!(typeof req.query.project==="undefined")) render("Please provide a Project Id")
    return render()
  } else {
    //if ((((req.params.project||'').trim()).length==0)) render("Please provide a Project Id")
    if (isNaN(parseInt(p))) return render(`Project Id '${p}' must be an integer value`)
    p = parseInt(p)
    const f = require("../fortify-api.js")
    f.sast.projectscans(p, true).then(
      (r)=>{
        //require("fs").writeFileSync("./projectscans.json", JSON.stringify(r,null,4))
        d = r
        if (d.versions.length==0) render("Nothing found for this ProjectId")
        return render()
      },
      (r)=>{
        return render(r.body)
      }
    )
  }
})

router.get('/', handler);
router.get('/project', handler);
router.get('/project/:project', handler);

module.exports = router;
