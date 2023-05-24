const fs = require("fs")
const path = "./.tokens.json"
const config = require("./.config.json")

const tokens = {
    get: async function(id) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                r = JSON.parse(data).tokens.find(x => x.id==id)  // find token by key:name
                if (r==null) resolve(null)
                r.url = config.sast.url
                r.client = config.sast.client
                resolve(r)
            })
        })
    },
    submission: async function(id, result) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                const r = JSON.parse(data)
                result.time = new Date(Date.now()).toISOString()
                const t = r.tokens.find(x => x.id==id)
                t.submit = result
                if (t.previous==null) { t.previous = [result] } else { t.previous.push(result) }
                fs.writeFile(path,JSON.stringify(r, null, 4),"utf-8",()=> {
                    resolve(t)
                })
            })
        })
    },
}
module.exports = tokens

