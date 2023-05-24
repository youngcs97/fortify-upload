const debug = !module.parent
const $ = function (message) { if (debug) console.log(message) }
const _ = require('path');
const name = (path) => {return _.resolve(path).split(_.sep).pop()}
const nvl = (value) => { const v = value||"unknown"; return (v.trim().length>0)?v:"unknown"}
const fs = require("fs");
const rq = require("request");
const JsZip = require("jszip")

/*

Documentation:  https://www.microfocus.com/documentation/fortify-software-security-center/2220/SC_SAST_Guide_22.2.0.pdf


Command Line for packaging & submitting source code (run in Docker image or install software for your platform & configure):

    Unzip this https://github.com/cr0hn/vulnerable-node to a directory called vulnerable-node-master - cd into directory:
    
    1.  scancentral package -o ..\package.zip -bt none                   -oss -snm
    2.  cd ..
    3.  scancentral -url https://scsastctrl.fortifyhosted.com/scancentral-ctrl start -upload --application XYZ --application-version 6.0 --package package.zip -uptoken <token> -sp package.zip
    
    Then check back for the results:

    4. scancentral -url https://scsastctrl.fortifyhosted.com/scancentral-ctrl retrieve -f myfile.fpr -token <jobtoken>


Zip file format desired by SSC SAST (scancentral package/upload command):

    <UploadFileName>.zip
    L   translation.zip
        L   Src/            Push directory, files, or zip contents here (provide subfolder name(s) as <root> to metadata)
        L   metadata        Describe scan (filename=metadata) - see zip.metadata() below.
*/

/**
 * Module for creating zip objects to be consumed by Fortify's upload process
 */
const zip = {
    /**
     * Translates a JsZip object to the wrapper format required by Fortify's upload process
     * @param {JsZip} zip A JsZip containing the source code (use other zip methods to create)
     * @returns Promise that resolves to a Buffer
     */
    translation: async function(zip) {
        const z = new JsZip();
        z.file("translation.zip", await zip.generateAsync({ type: "nodebuffer" }))
        return z.generateAsync({ type: "nodebuffer" })
    },
    /**
     * Returns the metadata description string required by Fortify's upload process - attach as (filename=metadata) w/no extension
     * @param {*} root The root directory containing the source code to be scanned
     * @returns 
     */
    metadata: function(root) {
        return JSON.stringify({
            "version": 2.0,
            "projects": [
                {
                "root": root,
                "filesToScan": ["Src"],
                "source-dirs": [],
                "excluded-files": [],
                "sca-translation-args": ["-Dcom.fortify.sca.EnableDOMModeling\u003dtrue"],
                "properties": {}
                }
            ]
        });
    },
    /**
     * Packages a filesystem directory into a zip file for uploading
     * @param {string} path Directory path
     * @returns Promise that will resolve to a JsZip
     */
    directory: async function(path) {
        return new Promise(async function(resolve, reject) {
            const p=[];
            const file = function(source,destination) {
                return new Promise(function(resolve, reject) {
                    fs.readFile(source, function(err, data){
                        if (err) reject(err); 
                        else resolve({source: source,destination: destination,data: data});
                    });
                });
            }
            const dir = async function(path,base="") {
                $(path +" - "+base)
                const y = await fs.promises.opendir(path)
                for await (const x of y) {
                    if (x.isDirectory()) { 
                        await dir(path+_.sep+x.name, base+x.name+"/")
                    } else {
                        const s = _.resolve(path)+_.sep+x.name
                        const d = base+x.name
                        p.push(file(s,d).then((r)=> {
                            z.file(r.destination, r.data, {createFolders: true})
                            $(r.source)
                        }))
                    }
                }
            }
            const z = zip.base(name(path))
            await dir(_.resolve(path), z.base+"/").catch(e => $(e))
            await Promise.all(p)
            resolve(z)
        });
    },
    /**
     * Packages a filesystem file into a zip file for uploading
     * @param {string} path File path
     * @returns Promise that will resolve to a JsZip
     */
    file: async function(path){
        return new Promise(function(resolve, reject) {
            fs.readFile(path, function(err, data){
                if (err) reject(err); 
                else resolve(zip.buffer(data, name(path), _.resolve(path)))
            });
        });
    },
    /**
     * Packages data (Buffer) file into a zip file for uploading
     * @param {string} data Data representing the source code (either a filepath or a JsZip object)
     * @param {string} name Name of the source code data (used when the name cannot be lifted from the data itself)
     * @param {string} path Optional path of the source data (prints name of original file provided, usually when data=filesystempath)
     * @returns Promise that will resolve to a JsZip
     */
    buffer: async function(data, name, path=null) {
        return new Promise(function(resolve, reject) {
            JsZip.loadAsync(data).then(async function (r) { // zip file, iterate it
                const looksLikeScanCentralPackage = async function(d) {
                    return new Promise(async function(resolve, reject) {    // but first, let's see if it has /Src and /metadata indicating it might be previously packaged
                        let x = []
                        d.forEach((r,f)=>{ x.push(f.name.split("/")[0]) })
                        x = [...new Set(x)]
                        if (x.includes("Src") && x.includes("metadata")) {
                            const l = r.file("metadata")
                            if (l!=null) {
                                l.async("text").then((c)=>{
                                    try {
                                        const j = JSON.parse(c)
                                        $(j)
                                        if ((j.version!=null)&&(j.projects!=null)) resolve(true)
                                    } catch { resolve(false) }
                                },(c)=>{ resolve(false) })
                            } else { resolve(false) }
                        } else { resolve(false) }
                    })
                }
                if (await looksLikeScanCentralPackage(r)) {     // check to see if it looks prepackaged
                    resolve(r)  // likely packaged by ScanCentral tool: don't mess with it
                } else {
                    // not packaged, package it.
                    if ((name||"").length>0) {
                        let b = name.replace(/\.[^/.]+$/, "")  // strip extension
                        e = name.slice(b.length).toLocaleLowerCase()
                        if (([".zip",".gz"]).indexOf(e) > -1) name=b    // remove extension if .zip or .gz, etc.
                    }
                    const z = zip.base(name) 
                    r.forEach((r,f)=>{      // loop thru zip
                        const n = z.base+"/"+f.name
                        if (f.dir) z.folder(n)  // if dir, make folder
                        else z.file(n, f.nodeStream(), {    // otherwise append file
                            createFolders: true,
                            unixPermissions: f.unixPermissions,
                            comment: f.comment,
                            date: f.date,
                        });
                        $(n)
                    })
                    resolve(z)
                }  
            }, function (r)  {   //regular file, place it at the Src root
                const z = zip.base()
                const n = z.base+"/"+name
                z.file(n, data)
                $(path||n)
                resolve(z)
            });
        });
    },
    /**
     * Provides the zipfile template (as expected by Fortify) to be used as a base
     * @param {string} name The name of the root directory (blank will default to /Src)
     * @returns JsZip object with the basic template.
     * 
     * Note: JsZip object will also contain an additional property called .base to be used at the root file for loading source code.
     */
    base: function(name=null) {
        const z = new JsZip();
        let r = "Src"
        const n = name||""
        if (n.length>0) r+="/"+name
        z.folder(r)
        z.file("metadata",zip.metadata(r))
        z.base = r  // this property defines the source code base path
        return z
    },
    /**
     * Deduces the string input provided to package source code for Fortify upload
     * @param {string} input Directory path, File path, or Buffer (JsZip) to package
     * @param {string} name Name of the root directory if providing a Buffer (directories and files will inherit from their name)
     * @returns Promise that will resolve to a JsZip
     * 
     * Examples:
     *  await zip.fromInput(fs.readFileSync("vulnerable-node-master.zip"), "helloworld")    // Buffer (be sure to name it)
     *  await zip.fromInput("./vulnerable-node-master")         // Directory
     *  await zip.fromInput("./zip.js")                         // Regular file
     *  await zip.fromInput("./vulnerable-node-master.zip")     // Zip File
     */
    fromInput: async function(input, name=null) {
        return new Promise(function(resolve, reject) {
            if (input.toString().slice(0,4)=="PK") {  // First 4 bytes of a zip file:     Buffer.from("PK").toString('hex') = '504B0304'
                resolve(zip.buffer(input, name))
            } else {
                let s
                try { s = fs.lstatSync(input) }
                catch { resolve(zip.buffer(input, nvl(name))); return }  // if lstat fails, data is likely just a plain old file
                if (s.isDirectory()) resolve(zip.directory(input))
                if (s.isFile()) resolve(zip.file(input))
                reject(`Input was not a file, directory, or binary zip file`)
            }
        });
    },
    /**
     * Deduces the string input provided to package source code and translates a JsZip wrapper format required by Fortify's upload process
     * @param {*} input Directory path, File path, or Buffer (JsZip) to package
     * @param {*} name Name of the root directory if providing a Buffer (directories and files will inherit from their name)
     * @returns Promise that will resolve to a Buffer
     */
    translationFromInput: async function(input, name=null) {
        return (await zip.translation(await zip.fromInput(input, name)))
    }
}


/**
 * Module for uploading source code packages to Fortify SSC SAST
 */
const upload = {

    /**
     * Wraps request module into a Promise
     * @param {any} options request.options
     * @param {Buffer} data body data
     * @param {boolean} parse call JSON.parse(.body) upon resolve
     * @returns {Promise<any>} Promise with the results of the http request
     */
    request: function (options, data = null, parse = false) {
        const proxy=""   //"http://127.0.0.1:8888"
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
    },
    /**
     * POSTs source code data to Fortify SSC SAST
     * @param {string} url Controller URL
     * @param {Buffer} data File upload content
     * @param {string} filename Filename of upload zip
     * @param {string} client Fortify client
     * @param {string} token Fortify token
     * @param {string} project Fortify project name
     * @param {string} version Fortify version
     * @param {string} user Username
     * @returns {Promise<any>} Promise that resolves to the http response
     */
    post: async function (url, data, filename, client, token, project, version, user) {
        var o = {
            method: 'POST',
            url: url+"/rest/v2/job",
            headers: { 
                "accept" : "application/json",
                "accept-encoding" : "gzip,deflate",
                "fortify-client" : client
            }
        }
        var f = new require('form-data')();
        f.append("zipFile", data, { "filename": filename, "contentType": "application/zip" });
        f.append("username", user)
        f.append("scaVersion", "22.2.1.0003")
        f.append("scaRuntimeArgs", "")
        f.append("uploadToken", token)
        f.append("jobType", "TRANSLATION_AND_SCAN_JOB")
        f.append("clientVersion", "22.2.1.0003")
        f.append("projectName" , project)
        f.append("projectVersion", version)
        o.headers["Content-Type"] = `multipart/form-data;boundary=${f._boundary}`;
        $(`${o.method} ${o.url}`)
        return upload.request(o, f, true);
    },
    /**
     * Gets SAST job details
     * @param {string} url Controller URL
     * @param {string} client Fortify client
     * @param {string} jobtoken JobToken (returned by previous submission)
     * @param {number} version RESTAPI version number (default=2)
     * @param {string} endpoint endpoint name (default=status)
     * @returns 
     */
    details: async function (url, client, jobtoken, version="2", endpoint="status") {
        var o = {
            method: 'GET',
            url: `${url}/rest/v${version}/job/${jobtoken}/${endpoint}`,
            headers: { 
                "accept" : "application/json",
                "accept-encoding" : "gzip,deflate",
                "fortify-client" : client
            }, 
            encoding: null
        }
        $(`${o.method} ${o.url}`)
        return upload.request(o, null, false);
    }
}

/**
 * Module for uploading source code to Fortify SSC
 */
const fortify = {
    /**
     * Zips up data to be scanned by Fortify SSC via an HTTP upload
     * @param {string} input A string that represents a file-system Directory path, File path, or a Buffer (JsZip) to package
     * @param {string} name Optional root directory name (only applies to a Buffer; directories and files will inherit the root directory from their path name)
     * @returns {Promise<any>} Promise that will resolve to a Buffer
     */
    zip: zip.translationFromInput,
    /**
     * POSTs source code data to Fortify SSC
     * @param {string} url Controller URL 
     * @param {Buffer} data File upload content (zip file)
     * @param {string} filename Filename of upload zip
     * @param {string} client Fortify client
     * @param {string} token Fortify token
     * @param {string} project Fortify project name
     * @param {string} version Fortify version
     * @param {string} user Username
     * @returns {Promise<any>} Promise that resolves to the http response
     */
    upload: upload.post,
    /**
     * Gets SAST job details
     * @param {string} url Controller URL
     * @param {string} client Fortify client
     * @param {string}} jobtoken JobToken (returned by previous submission)
     * @param {string} version REST API version number (default=2)
     * @param {string} endpoint endpoint name (default=status)
     * @returns 
     */
    details: upload.details
}
module.exports = fortify

/* Testing:
async function main() {
    // const x = await zip.translationFromInput(fs.readFileSync("vulnerable-node-master.zip"),"helloworld")   // Zip Buffer (optionally name it)
    // const x = await zip.translationFromInput(fs.readFileSync("./fortify-upload.js"))    // Regular File Buffer
    // const x = await zip.translationFromInput("./vulnerable-node-master")             // Directory
    // const x = await zip.translationFromInput("./fortify-upload.js")                  // Regular file
    // const x = await zip.translationFromInput("./vulnerable-node-master.zip")         // Zip File
    // fs.writeFileSync("zip-output.zip", x)
    const x = await zip.translationFromInput("./")             // Directory
    // $(JSON.stringify(x))
}
main()
//*/
