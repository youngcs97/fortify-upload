const config = require("./.config.json")
switch ((config.tokens.type||"").trim().toLowerCase()) {
    case "cosmos":
        module.exports = require("./tokens.cosmos.js")
        break;
    default:
        module.exports = require("./tokens.json.js")
}
