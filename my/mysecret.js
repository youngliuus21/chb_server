
var secret = null

function load(){
  var fs = require("fs")
  var contents = fs.readFileSync('config/secret.json')
  secret = JSON.parse(contents)
}

load()

module.exports.secret = secret