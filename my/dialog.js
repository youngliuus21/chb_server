var express = require('express')
var bodyParser = require('body-parser')
var AssistantV1 = require('watson-developer-cloud/assistant/v1')

var router = express.Router()
var jsonParser = bodyParser.json()

router.get('/', function(req, res){
  res.render('dialog', {mytitle:'Appliction Assistant'})
})

var service = null
var workspace_id = '97c587f1-b343-4b25-aa7c-b184a8a1fd11'

function getService() {
  if (service != null) {
    return service
  }
  
  service = new AssistantV1({
    "username": "8675174c-c81c-461b-ac1d-fcd0b8c2a9c6",
    "password": "jcstwpSVvTyK",
    version: '2018-02-16'
  })
  
  return service
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
      
      req.session.dialog_context = response.context
      res.json({ok:true, output:response.output.text,intents:response.intents,
        entities:response.entities})
    })
})

module.exports = router