window.addEventListener('DOMContentLoaded', event => {
    Array.from(document.querySelectorAll('.curl-http')).forEach(elem => {
        const attr = elem.parentElement.attributes
        elem.addEventListener('click', e => { 
            const text = "curl --header \"Content-Type: application/json\" --request "+elem.attributes["data-method"].value+" --data '"+attr["data-json"].value+"' \""+attr["data-url"].value+"\""
            navigator.clipboard.writeText(text)
            document.getElementById("curl-http").innerText=text
        }, false)
    })
    
    Array.from(document.querySelectorAll('#token')).forEach(elem => {
        elem.addEventListener('input', e => { 
            const r = /"token=[^"]*/i
            const c = document.getElementById("curl-http")
            c.innerText = c.innerText.replace(r,"\"token="+elem.value)
        }, false)
    })
    Array.from(document.querySelectorAll('#file')).forEach(elem => {
        elem.addEventListener('input', e => { 
            const r = /"file=@[^"]*/i
            const c = document.getElementById("curl-http")
            const v = elem.value.split("\\")
            c.innerText = c.innerText.replace(r,"\"file=@"+v[v.length-1])
        }, false)
    })
    Array.from(document.querySelectorAll('#authorization')).forEach(elem => {
        elem.addEventListener('input', e => { 
            const r = /"authorization=[^"]*/i
            const c = document.getElementById("curl-http")
            c.innerText = c.innerText.replace(r,"\"authorization="+elem.value)
        }, false)
    })
})