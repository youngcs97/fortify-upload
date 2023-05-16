'use strict';
const debug = !module.parent
const $ = function (message) { if (debug) console.log(message) }
const rq = require("request");
const config = require("./fortify-api.config.json")
const _ = {
    url: config.url,
    token: config.token,
    basic: config.basic,
    proxy: config.proxy||"",  //"http://127.0.0.1:8888"
    ult: null,
    headers: function(type=null) {
        let a = null
        switch (((type||"").trim()).toLowerCase()) {
            case "admin": a = `Basic ${Buffer.from(this.basic).toString('base64')}`; break;
            case "ult": a = `FortifyToken ${this.ult||this.token}`; break;
            default: a = `FortifyToken ${this.token}`
        }
        return {
            "accept": "application/json",
            "content-type": "application/json",
            "Authorization": a
        }
    },
    request: function (options, data = null, parse = false) {
        const proxy=(this.proxy||"").trim()
        if (proxy.length > 0) {
            const agent = new require('https-proxy-agent')(proxy);
            options.agent = agent
            options.rejectUnauthorized = false;
        }
        //options.requestCert = true
        return new Promise((resolve, reject) => {
            var r = rq(options, (error, response, body) => {
                if (error) {
                    $(`Request error: ${error}`)
                    reject(error);
                }
                var s = response.statusCode;
                if ((s >= 200) && (s <= 299)) {
                    resolve(parse ? JSON.parse(response.body) : response);
                } else {
                    $(`HTTP error: ${JSON.stringify(response)}`)
                    reject(response);
                }
            });
            if (data!=null) {       //used to push form-data if necessary
                data.pipe(r);
            }
        });
    }
}


/**
 * Module for Projects
 */
const projects = {
    /**
     * Create a new Project-Version
     * @param {string} project Project name
     * @param {string} version Version - null value will default to "1.0"
     * @param {number} id Project id (if project already exists)
     * @returns {Promise<any>} Promise with the results of the http request
     */
    create: async function (project, version, id) {
        $(`project.create.request()`);
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/projectVersions`,
            headers: _.headers(),
            body: JSON.stringify(
                {
                    "name": version || "1.0",
                    "description": "",
                    "active": true,
                    "committed": true,
                    "project": {
                        "name": project,
                        "description": null,
                        "issueTemplateId": "5ee1db7a-e7e2-46e4-bb2e-70997a8da9d0",
                        "id": id
                    },
                    "issueTemplateId": "5ee1db7a-e7e2-46e4-bb2e-70997a8da9d0"
                }
            )
        }
        return _.request(o, null, true);
    },
    /**
     * Activates the Project-Version (otherwise hyperlink will be disabled in UI indicating partial setup)
     * @param {number} id ProjectVersion id (returned from create method)
     * @returns {Promise<any>} Promise with the results of the http request
     */
    activate: async function (id) {
        $(`project.activate.request()`);
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/bulk`,
            headers: _.headers(),
            body: JSON.stringify(
                {
                    "requests": [
                        {
                            "uri": `${_.url}/api/v1/projectVersions/${id}/attributes`,
                            "httpVerb": "PUT",
                            "postData": [{ "values": [{ "guid": "New" }], "attributeDefinitionId": 5 }, { "values": [{ "guid": "OS" }], "attributeDefinitionId": 6 }, { "values": [{ "guid": "externalpublicnetwork" }], "attributeDefinitionId": 7 }]
                        },
                        {
                            "uri": `${_.url}/api/v1/projectVersions/${id}?hideProgress=true`,
                            "httpVerb": "PUT",
                            "postData": { "committed": true }
                        }
                    ]
                }
            )
        }
        return _.request(o, null, true);
    },
    /**
     * Searches for the existence of Project-Version by names
     * @param {string} project Project name
     * @param {string} version Version - null value will default to "1.0"
     * @returns {Promise<any>} Promise with the results of the http request
     */
    search: async function (project, version) {
        $(`project.search.request(${project}, ${version})`);
        var q = [`name:"${project}"`, `project.name:"${project}",name:"${version || "1.0"}"`]
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/bulk`,
            headers: _.headers(),
            body: JSON.stringify(
                {
                    "requests": [
                        {
                            "uri": `${_.url}/api/v1/projects?q=${encodeURI(q[0])}&fulltextsearch=false`,
                            "httpVerb": "GET"
                        },
                        {
                            "uri": `${_.url}/api/v1/projectVersions?q=${encodeURI(q[1])}&fulltextsearch=false&includeInactive=false&myAssignedIssues=false&onlyIfHasIssues=false`,
                            "httpVerb": "GET"
                        }
                    ]
                }
            )
        }
        return _.request(o, n, true);
    },
    /**
     * Returns a list of versions under a Project name
     * @param {string} project Project name
     * @returns {Promise<any>} Promise with the results of the http request
     */
    versions: async function (project) {
        $(`project.versions.request(${project})`);
        var q = encodeURI(`project.name:"${project}"`)
        var o = {
            method: 'GET',
            url: `${_.url}/api/v1/projectVersions?fields=id&q=${q}&fulltextsearch=false&includeInactive=false&myAssignedIssues=false&onlyIfHasIssues=false`,
            headers: _.headers()
        }
        return _.request(o, nullull, true);
    }
}


/**
 * Module for Users
 * 
 * Token Types:     https://www.microfocus.com/documentation/fortify-software-security-center/2220/SSC_Help_22.2.0/index.htm#SSC_UG/Gen_Auth_Tokens.htm?Highlight=tokens 
 */
const users = {
    /**
     * Create a new User
     * @param {string} email Email (registers as username)
     * @param {string} password Password
     * @param {string} first First name
     * @param {string} last Last name
     * @returns {Promise<any>} Promise with the results of the http request
     */
    create: async function (email, password, first, last) {
        $(`users.create.request()`);
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/localUsers`,
            headers: _.headers("ult"),
            body: JSON.stringify(
                { 
                    "userName": `${email}`, 
                    "firstName": `${first}`, 
                    "lastName": `${last}`, 
                    "emailCreate": `${email}`, 
                    "email": `${email}`, 
                    "clearPassword": `${password}`, 
                    "requirePasswordChange": false, 
                    "passwordNeverExpire": false, 
                    "suspended": false, 
                    "roles": [{"id":"appsectester"},{"id":"developer"}]
                }
            )
        }
        return _.request(o, null, true);
    },
    /**
     * Creates a CIToken for a particular user
     * @param {string} username Username
     * @param {string} password Password
     * @param {number} index Keep track of number of issuances 1,2,3...
     * @returns 
     */
    token: async function (username, password, index=1) {
        $(`users.token.request()`);
        var f = 1000 * 60 * 60 * 24 * 30    // milliseconds in next 30 days
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/tokens`,
            headers: {
                "accept": "application/json",
                "content-type": "application/json",
                "Authorization": `Basic ${Buffer.from(username+":"+password).toString('base64')}` // logging in with user's password to create
            },
            body: JSON.stringify(
                {
                    "type": "CIToken",
                    "description": `CIToken(${index}) for ${username}`,
                    "terminalDate": (new Date(Date.now()+f)).toISOString(),
                    "remainingUsages": 1
                }
            )
        }
        return _.request(o, null, true)
    },
    /**
     * Initializes the user with specific roles, attached versions, and requiring password change
     * @param {Object} data Return of previous user data (create method return value)
     * @param {number[]} versions Array of ProjectVersion ID's to attach
     * @returns 
     */
    initialize: async function (data, versions) {
        $(`users.initiatize.request(${data.id})`);
        data.roles = [{"id":"appsectester"},{"id":"developer"}];
        data.requirePasswordChange = true
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/bulk`,
            headers: _.headers("ult"),
            body: JSON.stringify(
                {
                    "requests": [
                        {
                            "uri": `${_.url}/api/v1/localUsers/${data.id}`,
                            "httpVerb": "PUT",
                            "postData": data
                        },
                        {
                            "uri": `${_.url}/api/v1/authEntities/${data.id}/projectVersions/action`,
                            "httpVerb": "POST",
                            "postData": {"type":"assign","ids":versions}
                        }
                    ]
                }
            )
        }
        return _.request(o, null, true)
    },
    /**
     * Random Password Generator 
     * @param {number} length Desired length of password (default=10)
     * @returns {string} password
     */
    password: function (length=10) {
        const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!.,_~{}[]-"
        let r = ""
        for (var i = 0, n = c.length; i < length; ++i) {
            r += c.charAt(Math.floor(Math.random() * n));
        }
        return r;
    },
    /**
     * Creates a soon-expiring UnifiedLoginToken (or destroys existing ult)
     * @returns {Promise<any>} Promise with the results of the http request
     */
    ult: async function () {
        var h = _.headers("admin")
        if (_.ult==null) {
            $(`users.ult.create.request()`);
            var o = {
                method: 'POST',
                url: `${_.url}/api/v1/tokens`,
                headers: h,
                body: JSON.stringify(
                    {
                        "type": "UnifiedLoginToken",
                        "description": "Temporary ULT",
                        "terminalDate": (new Date(Date.now()+30000)).toISOString()      // ISO Date - expire in 30 seconds
                    }
                )
            }
            var r = await _.request(o, null, true)
            _.ult = r.data
        } else {
            $(`users.ult.destroy.request()`);
            var o = {
                method: 'DELETE',
                url: `${_.url}/api/v1/tokens/${_.ult.id}`,
                headers: h
            }
            var r = await _.request(o, null, true)
            _.ult = null
        }
        return r
    }
}

/**
 * Module for retrieving SAST details
 */
const sast = {
    /**
     * Gets the artifacts for a list of versions
     * @param {*} versions Either a single or array of versions (coercions to non-integer will be ignored)
     * @returns Promise that will resolve to a bulk API response
     */
    artifacts: async function(versions) {
        let v = versions
        if (!Array.isArray(v)) { v = [v]}  // convert to array
        v.filter((v)=>{ return parseInt(v)}).map((v)=>{ return !isNaN(v) })  // force to integer and remove NaN
        var r = []  // make a list of requests for bulk api
        v.forEach((v)=>{ r.push({"httpVerb":"GET", "uri": `${_.url}/api/v1/projectVersions/${v}/artifacts?embed=scans`}) })
        var o = {
            method: 'POST',
            url: `${_.url}/api/v1/bulk`,
            headers: _.headers(),
            body: JSON.stringify({"requests": r})
        }
        return _.request(o, null, true)
    },
    /**
     * Retrives a list of scan-related information for a project including the projectVersions and optionally their artifacts
     * @param {integer} id Project id
     * @param {boolean} artifacts Boolean whether to retrieve artifacts (default=false)
     * @returns Promise that will resolve to an object with { id:ProjectId, versions:[Array of versions], scans:[Array of matching cloudjobs], (optional) artifacts:[Array of artifacts] }
     */
    projectscans: async function(id, artifacts=false) {
        return new Promise((resolve, reject) => {
            var o = {
                method: 'POST',
                url: `${_.url}/api/v1/bulk`,
                headers: _.headers(),
                body: JSON.stringify(
                    { "requests": [
                            {   "uri": `${_.url}/api/v1/cloudjobs?limit=0&q=${id}&fields=projectId,projectName,pvId,pvName,state,jobState,jobToken,submitterUserName,jobFinishedTime`,
                                "httpVerb": "GET" },
                            {   "uri":  `${_.url}/api/v1/projects/${id}/versions?limit=0&fields=project,id,name,description,active,currentState`,
                                "httpVerb": "GET" }
                        ]
                    }
                )
            }
            _.request(o, null, true).then(
                (x)=>{
                    const cj = x.data[0].responses[0].body.data  // cloudjobs
                    const r = {id: id, versions: x.data[1].responses[0].body.data}   // make return value with id and append versions
                    const i = []    // array to save version ids (useful for fetching artifacts)
                    r.versions.forEach((v)=>{   //loop through and filter cloudjobs that match
                        v.scans = cj.filter(((cj)=>{ return (cj.pvId==v.id)}))
                        if (artifacts) i.push(v.id); v.artifacts = []
                    })
                    if (artifacts) {    // if asking for artifacts, fetch using array of projectVersionIds
                        sast.artifacts(i).then(
                            (x)=>{
                                x.data.forEach((d)=>{   // loop through returned bulk records (one object per version)
                                    const a = d.responses[0].body.data
                                    if (a.length > 0) {     // ensure we have records, otherwise leave artifacts property as empty array
                                        const v = r.versions.find((v)=> { return (a[0].projectVersionId==v.id) })    // match using find
                                        if (!(typeof v==="undefined")) v.artifacts = a  // set property if found
                                    }
                                })
                                resolve(r)
                            },
                            (x)=>{ reject(x) }
                        )
                    } else { resolve(r) }
                },
                (x)=>{ reject(x) }
            )
        });
    },
    /**
     * Asynchronously requests and download a PDF report
     * @param {number} projectversionid 
     * @returns Promise that resolves to PDF file data
     */
    report: async function(projectversionid) {
        return new Promise((resolve, reject) => {
            const u = Math.random().toString(36).slice(2)       // not collision safe, but random enough
            const name = "Report-"+u
            const b = {
                "name": name,
                "note": "Notes go here.",
                "format": "PDF",
                "inputReportParameters": [
                {
                    "name": "Application Version",
                    "identifier": "projectversionid",
                    "paramValue": projectversionid,
                    "type": "SINGLE_PROJECT"
                }
                ],
                "reportDefinitionId": 3
            }
            const c = [
                { "name": "Include OWASP Top Ten 2021", "identifier": "includeOWASP2021" },
                { "name": "Include PCI DSS 3.2.1", "identifier": "includePCI321" },
                { "name": "Include PCI SSF 1.0", "identifier": "includePCISSF10" },
                { "name": "Include CWE", "identifier": "includeCWE" },
                { "name": "Include WASC 2.00", "identifier": "includeWASC2" },
                { "name": "Include DISA STIG 5.1", "identifier": "includeSTIG51" },
                { "name": "Include Appendix A", "identifier": "includeAppendixA" },
                { "name": "Include Appendix B", "identifier": "includeAppendixB" },
                { "name": "Include Appendix C", "identifier": "includeAppendixC" },
                { "name": "Include Appendix D", "identifier": "includeAppendixD" },
                { "name": "Include Appendix E", "identifier": "includeAppendixE" },
                { "name": "Include Appendix F", "identifier": "includeAppendixF" }
            ]
            c.forEach((c)=>{
                c.paramValue=true
                c.type="BOOLEAN"
                b.inputReportParameters.push(c)
            })
            const o = {
                method: 'POST',
                url: `${_.url}/api/v1/bulk`,
                headers: _.headers(),
                body: JSON.stringify({ "requests": [
                    {
                        "uri": `${_.url}/api/v1/reports`,
                        "httpVerb": "POST",
                        "postData": b
                    },
                    {
                        "uri": `${_.url}/api/v1/fileTokens`,
                        "httpVerb": "POST",
                        "postData": { "fileTokenType": 3 }
                    }
                ]})
            }
            _.request(o, null, true).then(  // send away the report creation and token generation
                async (r)=>{
                    const id = r.data[0].responses[0].body.data.id  // grab results
                    const token = r.data[1].responses[0].body.data.token
                    $(id + " - " + token)
                    const o = { method: 'GET', headers: _.headers(), url: `${_.url}/api/v1/reports/${id}?fields=status`}    // report status query
                    const timer = ms => new Promise( res => setTimeout(res, ms));   // make a timer
                    let complete = false
                    for (let i=0; i<10; i++) {  // loop 10x up to 20s
                        if (complete) break;
                        await timer(2000).then((t)=> {
                            if (complete==false) _.request(o, null, true).then((x)=>{    // check status, but only if circuit break is still off.
                                $(`status(${i}): ${x.data.status}`)
                                if (x.data.status=="PROCESS_COMPLETE") {    // if complete, send off the download request
                                    if (complete==false) {
                                        complete = true     // set circuit breaker in case timer iterates while we're still fetching
                                        const o = { method: 'GET', encoding: null, headers: _.headers(), url: `${_.url}/transfer/reportDownload.html?mat=${token}&id=${id}`}
                                        $("downloading...")
                                        _.request(o, null, false).then((x)=>{
                                            resolve({body: x.body, id: id, name: name})
                                        },(x)=>{
                                            reject(x.body)
                                        })
                                    }
                                }
                            })
                        });
                    }
                    reject("Timeout")
                },
                (r)=>{ reject(r.body) }
            )
        });
    }
}


/**
 * Module for querying Fortify SSC APIs
 */
const fortify = {
    /**
     * Module for querying SAST APIs
     */
    sast: {
        /**
         * Retrives a list of SAST scan-related information for a project including the projectVersions and optionally their artifacts
         * @param {integer} id Project id
         * @param {boolean} artifacts Boolean whether to retrieve artifacts (default=false)
         * @returns Promise that will resolve to an object with { id:ProjectId, versions:[Array of versions], scans:[Array of matching cloudjobs], (optional) artifacts:[Array of artifacts] }
         */
        projectscans: sast.projectscans,
        /**
         * Asynchronously requests and download a PDF report
         * @param {number} projectversionid 
         * @returns Promise that resolves to PDF file data
         */
        report: sast.report
    } 
}
module.exports = fortify


async function OnboardUser(email, first, last, project) {
    let t = await users.ult()   // Get a ULT token
        var r = {
            username: email,
            password: users.password(10)   
        }
        var u = await users.create(r.username, r.password, first, last)     // create user
        r.token = (await users.token(r.username, r.password, 1)).data.token // token request, strip out token string property
        r.decoded = Buffer.from(r.token, "base64").toString("utf-8")        // base64decode into GUID format
        var v = (await projects.versions(project)).data.map(function(x){ return x.id })     // get ProjectVersions and map into array of IDs
        u = await users.initialize(u.data, v)   // set passwordChange and bind versions to user
        $(`****** Onboarding Info: ******\n\n${JSON.stringify(r)}\n\n******          ******`)    // print details
    t = await users.ult()
}

async function OnboardProject(project, version=null) {
    var id = null   // Project Id
    let s = await projects.search(project, version)  // search for the particular project & version -- two data items returned
    let p = s.data[0].responses[0].body
    if (p.count > 0) {   // project found
        id = p.data[0].id   // lift the id for subsequent calls
    }
    let v = s.data[1].responses[0].body
    if (v.count == 0) {   // version not found
        let c = await projects.create(project, version, id) // create the version with the id (null id means new project)
        let a = await projects.activate(c.data.id)  // activate so it can be clicked and edited
    }
}
//OnboardProject("XYZ-4", "3.0")
//OnboardUser("chris.young@microfocus.com", "Chris", "Young", "XYZ")
//OnboardUser("tom.ryan@microfocus.com", "Tom", "Ryan", "XYZ-3")



