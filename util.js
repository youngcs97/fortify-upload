util = {
    password: function (length=10) {
        const c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        let r = ""
        for (var i = 0, n = c.length; i < length; ++i) {
            r += c.charAt(Math.floor(Math.random() * n));
        }
        return r;
    },
    token: function() {
        return this.password(48)
    },
    host: function(req) {
        return 'https://' + req.get('host')
    },
    nvl: function(value, substitute) {
        const s = (value||"").trim()
        if (s.length==0) return substitute
        return s
    },
    camel : function(value) {
        return value.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
            return index === 0 ? word.toUpperCase() : word.toLowerCase();
        }).replace(/\s+/g, '');
    }
}
module.exports = util