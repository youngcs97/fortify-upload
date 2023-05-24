const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler')

// helps display a curl command for this url
const util = require("../util.js")
const curl = function(req, token) { return `curl -H "accept:*/json" -F "file=@YourFile.zip" -F "token=${util.nvl(token,"YourToken")}" "${util.host(req)}/upload"` }

router.get('/', asyncHandler(async function(req, res, next) {
  const t = req.query["token"]||""
  res.render('upload', { "title": 'Upload', token: t, jobtoken: false, submission: false, curl: curl(req, t) });
}));

// curl -F "file=@sourcecode.packaged.zip" -F "token=helloworld" http://localhost:4000/upload
router.post('/', asyncHandler(async function(req, res, next) {
  const tokens = require("../tokens.js")
  const token = (req.body.token||"").trim()   // posted value of token
  let messages = []   // array for displaying user messages
  let jobtoken = false
  let submission = false

  const render = function(push=null) {
    if (push!=null) messages.push(push)
    if (req.accepts('json')&&(!req.accepts('html'))) { 
      if (submission==false) {
        return res.status(500).json({success: false, token: (token.length>0)?token:null, messages: messages });
      } else {
        return res.status(200).json({success: true, token: token, messages: messages, response: submission });
      }
    } else {  //req.accepts('text/html')
      return res.render('upload', { title: "Upload", token: token, messages: messages, jobtoken: jobtoken, submission: submission, curl: curl(req, token) });
    }
  }

  if (token.trim().length == 0) { 
    return render("No token provided")
  } else {
    const t = await tokens.get(token, true)  // find token by key:name
    if (t==null) { 
      return render(`Token '${token}' was not found`) 
    } else {
      if (!req.files || Object.keys(req.files).length === 0) {  // check if file(s) uploaded
        return render("No file uploaded")
      } else {
        const s = t.submit  // check for previous submissions - "s" variable used by submit (don't lower in codeblock)
        // function for submitting uploads
        const submit = function() {   
          if (s!=null) {    // save any previous submissions to an array called "previous"
            if (t.previous==null) t.previous = []
            t.previous.push(s)
          }
          const f = req.files[Object.keys(req.files)[0]] // grab first file
          const fortify = require("../fortify-upload.js")
          fortify.zip(f.data, f.name).then(   //zip the files returning promise
            (z)=>{
              fortify.upload(t.url, z, f.name, t.client, t.token, t.project, t.version, t.user).then(   // upload zip returning promise
                (u)=>{
                  if (u.token==null) return render(u.message)
                  submission = u
                  jobtoken = u.token
                  tokens.submission(t.id, u).then((r)=>{ return render() })
                },
                (u)=>{  // upload failed, push message
                  return render(r.body)  
                }
              )
            },
            (z)=>{  // zip failed, push return message
              return render(z)  
            }
          )
        }

        // check for previous submissions and verify dates
        if (s==null) {
          return submit()    // if no previous submission date, submit
        } else {
          let o = s.time
          if ((o==null)||(isNaN(Date.parse(o)))) {  // previous, but cannot calculate last submission date
            o = new Date(Date.now()).toISOString()  // use now as last submission
            await tokens.submission(t.id, s) // persist the value
          } 
          d = Date.parse(o)
          const diff = ((Date.now()-(d+(1000 * 60 * 60 * 12))) / (1000 * 60 * 60)).toFixed(1) // check for 12 hours passing
          if (diff<0) { 
            messages.push(`Previously submitted on '${new Date(d)}' with jobtoken '${s.token}'.`)
            jobtoken = s.token
            return render(`Must wait ${diff*-1} hours before submitting again.`) 
          } else { 
            return submit() // 12 hours elapsed, let submit again
          }
        }
      }
    } 
  }
}));
module.exports = router;
