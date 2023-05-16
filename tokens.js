const fs = require("fs")
const path = "./tokens.json"
/**
 * Module for managing tokens.json
 */
const tokens = {
    /**
     * Reads the tokens.json file
     * @returns {string} JSON content
     */
    read: function() {
        return JSON.parse(fs.readFileSync(path,"utf-8"))
    },
    /**
     * Writes object to tokens.json
     * @param {any} value Object to write
     */
    save: function(value) {
        fs.writeFileSync(path,JSON.stringify(value, null, 4),"utf-8")   // save to file in pretty format
    }
}
module.exports = tokens
