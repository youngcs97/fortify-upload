const fs = require("fs")
const path = "./.tokens.json"
const config = require("./.config.json")
const utils = require("./util.js")

const tokens = {
    init: async function(loops=10) {
        const c = config.tokens
        let t = []
        for (let i=0; i<loops; i++) {
            for (let j=1; j<4; j++) {
                t.push({ id: utils.token(), token: config.tokens.default, project: "Testing", version: j+".0", user: `testing-${j}.0@${c.container}.com`})
            }
        }
        require("fs").writeFileSync("./.tokens.json", JSON.stringify({ tokens: t },null,4))
    },
    get: async function(id, sast=false) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                r = JSON.parse(data).tokens.find(x => x.id==id)  // find token by id:name
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
    reenable: async function(id) {
        return this.submission(id, { message: "re-enabled" })
    },
    report: async function(id) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                const r = JSON.parse(data)
                const t = r.tokens.find(x => x.id==id)
                t.report = new Date(Date.now()).toISOString()
                fs.writeFile(path,JSON.stringify(r, null, 4),"utf-8",()=> {
                    resolve(t)
                })
            })
        })
    },
    delete: async function(id) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                const r = JSON.parse(data)
                r.tokens = r.tokens.filter(x => { return x.id!=id })
                fs.writeFile(path,JSON.stringify(r, null, 4),"utf-8",()=> {
                    resolve({"id": id})
                })
            })
        })
    },
    authorized: function(authorization) {
        return (config.tokens.authorization==authorization)
    },
    getAll: async function(query, page=0) {
        return new Promise(async function(resolve, reject) {
            const x = { url: config.sast.url, client: config.sast.client }
            fs.readFile(path,"utf-8", (err, data)=> {
                let s = JSON.parse(data).tokens
                const v = ["token","project","version","user"]
                for (let r in query) {
                    let t = r.trim().toLowerCase()
                    if (v.includes(t)) {
                        s = s.filter(x => { return x[t]==query[r] })
                    }
                }
                resolve(s)
            })
        })
    },
    update: async function(id, update) {
        return new Promise(async function(resolve, reject) {
            fs.readFile(path,"utf-8", (err, data)=> {
                const r = JSON.parse(data)
                const t = r.tokens.find(x => x.id==id)
                const v = ["token","project","version","user"]
                for (let u in update) {
                    let p = u.trim().toLowerCase()
                    if (v.includes(p)) {
                        t[p]=update[u]
                    }
                }
                fs.writeFile(path,JSON.stringify(r, null, 4),"utf-8",()=> {
                    resolve(t)
                })
            })
        })
    }

}
module.exports = tokens

