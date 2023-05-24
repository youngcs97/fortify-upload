const { CosmosClient } = require("@azure/cosmos")

const config = require("./.config.json")
const utils = require("./util.js")

const container = function() {
    const c = config.tokens
    return (new CosmosClient(c.connectionstring)).database(c.database).container(c.container)
}

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
        const cl = new CosmosClient(c.connectionstring);
        const db = (await cl.databases.createIfNotExists({id: c.database})).database
        const cn = (await db.containers.createIfNotExists({id: c.container })).container
        t.forEach(async (t)=>{
            let r = (await cn.item(t.id).read()).resource
            if (r==null) r = (await cn.items.create(t)).resource
        })
    },
    get: async function(id, sast=false) {
        return new Promise(async function(resolve, reject) {
            const x = { url: config.sast.url, client: config.sast.client }
            container().item(id).read().then((r)=> { 
                const x = r.resource
                if (x==null) {
                    resolve(null)
                } else {
                    for (let p in x) {
                        if (p.substring(0,1)=="_") delete x[p]
                    }
                    if (sast) {
                        x.url = config.sast.url
                        x.client = config.sast.client
                    }
                    resolve(x)
                }
            }, (r)=> { resolve(null) })
        })
    },
    submission: async function(id, result) {
        return new Promise(async function(resolve, reject) {
            result.time = new Date(Date.now()).toISOString()
            const s = {"op":"add","path":"/submit","value":result}
            container().item(id).patch([s, {"op":"add","path":"/previous/-", "value": result}]).then(      // try patch
                (r)=> { resolve(r.resource) }, 
                (r)=> { container().item(id).patch([s, {"op":"add","path":"/previous", "value": [result]}]).then( // replace previous if first patch errored
                    (r)=> { resolve(r.resource) }, 
                    (r)=> { resolve(null) 
                })
            })
        })
    },
    reenable: async function(id) {
        return this.submission(id, { message: "re-enabled" })
    },
    report: async function(id) {
        return new Promise(async function(resolve, reject) {
            const s = { "op":"add","path":"/report","value":new Date(Date.now()).toISOString() }
            container().item(id).patch([s]).then(      // try patch
                (r)=> { resolve(r.resource) }, 
                (r)=> { resolve(null) }
            )
        })
    },
    getAll: async function(query, page=0) {
        return new Promise(async function(resolve, reject) {
            const x = { url: config.sast.url, client: config.sast.client }
            const v = ["token","project","version","user"]
            const p = []
            const w = []
            for (let r in query) {
                let t = r.trim().toLowerCase()
                if (v.includes(t)) {
                    p.push({name: "@"+t, value: query[r]})
                    w.push(`p.${t}=@${t}`)
                }
            }
            const where = ((w.length==0)?"":" WHERE "+w.join(" AND "))
            let q = `SELECT p.id,p.token,p.project,p.version,p.user,p.submit,p.previous FROM pwc p ${where} ORDER BY p.id OFFSET ${page*200} LIMIT 200`
            q = {
                query: q,
                parameters: p
            }
            container().items.query(q).fetchAll().then((r)=> { 
                resolve(r.resources)
            }, (r)=> { resolve(null) })
        })
    },
    update: async function(id, update) {
        return new Promise(async function(resolve, reject) {
            const x = { url: config.sast.url, client: config.sast.client }
            const v = ["token","project","version","user"]
            const p = []
            for (let r in update) {
                let t = r.trim().toLowerCase()
                if (v.includes(t)) {
                    p.push({"op":"add","path":`/${t}`,"value":update[r]})
                }
            }
            container().item(id).patch(p).then(
                (r)=> { 
                    const { resource } = r
                    for (let p in resource) {
                        if (p.substring(0,1)=="_") delete resource[p]
                    }
                    resolve(resource)
                }, 
                (r)=> { resolve(null) }
            )
        })
    },
    delete: async function(id) {
        return new Promise(async function(resolve, reject) {
            container().item(id).delete().then(
                (r)=> { 
                    resolve({"id": r.item.id})
                }, 
                (r)=> { resolve(null) }
            )
        })
    },
    authorized: function(authorization) {
        return (config.tokens.authorization==authorization)
    }
}
module.exports = tokens
