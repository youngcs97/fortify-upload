const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')


const handler = asyncHandler(function(req, res, next) {
  let html = ((req.params.option||'').toUpperCase().trim()=="HTML")   // whether to render to HTML
  let enable = (req.params.option||'').toUpperCase().trim()
  enable = ["ENABLE","REENABLE"].includes(enable)   // whether to renable user for resubmission
  // whether to render to HTML
  const a = (req.body.authorization||'').trim()
  const f = (req.body.filter||'').trim()
  let m = []  // holds error messages for client display
  let d = null  // data container for rendering

  const util = require("../util.js")
  const url = `${util.host(req)}/tokens`
  const filter = (f.length==0)?"":`-F 'filter=${f}'`
  const curl = function() { return `curl -H "accept:*/json" -F "authorization=${util.nvl(a,"YourAuthortizationCode")}" ${filter} "${url}"` }

  

  const render = function(push) {
    if (push!=null) m.push(push)
    if (html) {
      return res.render('tokens', { title: 'tokens', tooltips: true, url: url, filter: f, authorization: a, messages: m, data: d, curl: curl() });
    } else {
      return res.status((m.length==0) ? 200 : 500).json({ success: (m.length==0), messages: m, data: d });
    }
  }
  const evaluate = function(value, id) {
    d=value
    if (value==null) return render(`Could not find token '${id}'`)
    return render()
  }

  if (req.method.toUpperCase()=="GET") { 
    if (!html) {
      html=true
      if (req.accepts('json')&&(!req.accepts('html'))) html=false
    }
    return render() 
  }

  const tokens = require("../tokens.js")
  if (tokens.authorized(a)==false) return render("Not authorized")

  const id = (req.body.id||"").trim()
  const fulfilled = async function(r) { return evaluate(r, id) }
  const rejected = async function(r) { return evaluate(null, id) }
  switch (req.method.toUpperCase()) {
    case "PUT":
      if (id.length==0) return render("No token ID provided")
      if (enable) {
        tokens.reenable(id).then(fulfilled, rejected)
      } else {
        tokens.update(id,req.body).then(fulfilled, rejected)
      }
      break;
    case "DELETE":
      if (id.length==0) return render("No token ID provided")
      tokens.delete(id).then(fulfilled, rejected)
      break;
    default:
      if (id.length > 0) {
        if (enable) {
          tokens.reenable(id).then(fulfilled, rejected)
        } else {
          tokens.get(id).then(fulfilled, rejected)
        }
      } else {
        let p = {}
        if (f.length>0) {
          try { p=JSON.parse(f) } 
          catch { m.push("Could not parse filter query as JSON; skipping") }
        }
        tokens.getAll(p).then(
          (r)=>{
            d = r
            return render()
          },
          (r)=>{ return render("Could not fetch tokens") }
        )
      }
      break;
  }
})
router.all('/', handler);
router.all('/:option', handler);

module.exports = router;
