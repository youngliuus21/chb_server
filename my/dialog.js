var express = require('express')
var bodyParser = require('body-parser')
var AssistantV1 = require('watson-developer-cloud/assistant/v1')

var router = express.Router()
var jsonParser = bodyParser.json()
var mysecret = require('./mysecret').secret

router.get('/', function(req, res){
  res.render('dialog', {mytitle:'Appliction Assistant'})
})

var service = null
var workspace_id = mysecret.workspace_id

function getService() {
  if (service != null) {
    return service
  }
  
  service = new AssistantV1({
    "username": mysecret.username,
    "password": mysecret.password,
    version: '2018-02-16'
  })
  
  return service
}

function roundArray(arr) {
  if (arr) {
    for (var i in arr) {
      arr[i].confidence = Math.round(arr[i].confidence*100)/100
    }
  }
}

function roundResponse(response) {
  roundArray(response.intents)
  roundArray(response.entities)
}

router.post('/say', jsonParser, function(req, res){
  
  var input = req.body.input
    
  getService().message({
    workspace_id: workspace_id,
    input: {text:input},
    context:req.session.dialog_context
    }, function(err, response){
      if (err) {
        console.error(err)
        res.json({ok:false, err:err})
        return
      }
      
      roundResponse(response)
      req.session.dialog_context = response.context
      res.json({ok:true, output:response.output.text,
        input:response.input,
        intents:response.intents,
        entities:response.entities})
    })
})

module.exports = router