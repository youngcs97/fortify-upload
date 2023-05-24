window.addEventListener('DOMContentLoaded', event => {
    Array.from(document.querySelectorAll('.curl-http')).forEach(elem => {
        const attr = elem.parentElement.attributes
        elem.addEventListener('click', e => { 
            const text = "curl --header \"Content-Type: application/json\" --request "+elem.attributes["data-method"].value+" --data '"+attr["data-json"].value+"' \""+attr["data-url"].value+"\""
            navigator.clipboard.writeText(text)
            document.getElementById("curl-http").innerText=text
        }, false)
    })
})