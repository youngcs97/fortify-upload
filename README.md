# fortify-upload
An example Node/Express site that demonstrates how to package and upload files to a Fortify Static Code Analyzer (SAST) controller.

![Upload Screen](upload.png)

The main functions are in a CommonJS module called [fortify-upload.js](fortify-upload.js)

Originally I kept the data persistence very simple using a JSON file.  I am currently branching out to use a CosmosDB and will likely develop other connectors.  Read below for how to configure.

----------
## Configuration
First, start with an npm update -- [package.json](package.json) contains the required dependencies and they may be fetched using:
```console
npm update
```


Next decide which database/persisence method you'd like to use for token storage.  If using cosmos, edit [.config.json](.config.json) and be sure to use `tokens.type` = `"cosmos"`:

```javascript
{
    "tokens": {
        "type": "cosmos",
        "connectionstring": "AccountEndpoint=https://yourHost.azure.com:443/;AccountKey=***YourKey***;",
        "database": "fortify",
        "container": "yourNamedCollection",
```

If choosing json, change the `tokens.type` to `"json"`.  Then edit [.tokens.json](.tokens.json) to contain your items:

```javascript
{
    "tokens": [
        {
            "id": "helloworld",
            "token": "********-****-****-****-************",
            "project": "MyProject",
            "version": "1.0",
            "user": "hello.world@domain.com"
        },
```

In addition to configuring the token storage, you'll need to set the details for your SSC and SAST scan controllers.

```javascript
    "ssc": {
        "url": "https://ssc.fortifyhosted.com",
        "token": "************************************************",
        "decoded": "********-****-****-****-************",
        "basic": "username:password"
    },
    "sast": {
        "url": "https://scsastctrl.fortifyhosted.com/scancentral-ctrl",
        "client": "YourClientAuthKey"
    }
}
```


Notes:
1. "sast.client" is your Fortify client_auth_token provided in your welcome packet (aka. the client_auth_token in your client.properties file if using any of the Fortify command-line utilities.)
2. "*.url" is your controller and ssc url endpoints
3. "ssc.token" is a valid CIToken within SSC with sufficient privleges to execute the API.  Sent as an `Authorization: FortifyToken <token>` http header to API endpoints.
4. "ssc.decoded" is the base64decoded value of "ssc.token".  This is the value is typically used with the scancentral client tools and is the value sent to the controller when submitting a scan job.
5. "ssc.basic" is the HTTP basic authentication format username-colon-password (username:password) that is required by some endpoints that do not accept a token (i.e. Making users or creating CITokens).  This will be sent as an `Authorization: Basic <Base64EncodedCredentials>` http header to API endpoints.


Tokens have the following characteristics regardless of their persistence implementation:

1. `"id": "helloworld"`, The token that will be shared publicly to end users who wish to submit code.  Make this long and complex.  They will use this token within CURL commands.
2. `"token": "********-****-****-****-************"`, This is a valid SSC CIToken (decoded format) that is not shared.  Instead, this handler (invoked through either HTML or CURL) will use the ID value to lookup and extract this token along with the project, version, and user information.  This real CIToken will be used to submit code on behalf of the user and they will be shielded from ever knowing its' value.
3. `"project": "MyProject"`, the SSC project tied to this user token
4. `"version": "1.0"`, the SSC project version
5. `"user": "hello.world@domain.com"`, an identifier used to identify the user to the controller.  This is merely a hashtag and does not have to be a valid SSC user.  Email addresses do make good values for association.


----------
## Starting Up

To run the app, use these respective commands for *Nix/Mac, Powershell, and Windows command line:

```console
DEBUG=fortify-upload:* npm start
ENV:DEBUG = "fortify-upload:*"; npm start
SET DEBUG=fortify-upload:* & npm start
```

You can also start this up with nodemon so that node restarts the script with any file edits:

```console
DEBUG=fortify-upload:* npm run devstart
ENV:DEBUG = "fortify-upload:*"; npm run devstart
SET DEBUG=fortify-upload:* & npm run devstart
```

Now startup a browser to [http://localhost:4000](http://localhost:4000) and voila, "Bob's your uncle":

![Start Page](index.png)



----------
## Command Line Testing
You can test the API integrations by creating async javascript functions in [fortify-upload.js](fortify-upload.js) and run via node command line: `node fortify-upload.js`

Example:
```javascript
//* Testing:
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
```

----------
## Sample Apps for Testing
For your ease, I've included an example app to scan called [vulnerable-node-master.zip](vulnerable-node-master.zip).  It is also available in directory form [vulnerable-node-master/](vulnerable-node-master/).





