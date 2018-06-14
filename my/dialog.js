var express = require('express')
var bodyParser = require('body-parser')
var AssistantV1 = require('watson-developer-cloud/assistant/v1')
var io = require('socket.io-client')
var Request = require('request')

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
//  roundArray(response.entities)
}

function ActionCaller(callback) {
  this.act_socket = null
  this.actResFun = callback
  this.openActSocket = function() {
    this.act_socket = io('http://localhost:19999/action')
  
    this.act_socket.on('act.status', (data) => {
      console.log('act.status, get data:'+JSON.stringify(data))
    
      if (this.actResFun)
        this.actResFun(data)
      if (data && data.done == true)//server tells me to close
        this.close()
    })
  }

  this.performAction = function(data) {
    if (!this.act_socket)
      this.openActSocket()
    
    this.act_socket.emit('dialog.act', data)
  }
  
  this.close = function() {
    if (this.act_socket)
      this.act_socket.close()
  }
}

router.get('/img', (req, res) => {
  var remote = 'http://localhost:19999/static/' + req.query.fname
  
  var x = Request(remote)
  req.pipe(x)
  x.pipe(res)
})

router.get('/test', (req, res)=>{
  var caller = new ActionCaller(function(data){
    console.log('test, get data:'+JSON.stringify(data))
    res.end(JSON.stringify(data))
    caller.close()
  })
  
  caller.performAction({name:'test action1'+(new Date()).getTime()})
})

function ws_handler(socket) {
  console.log((new Date()).toString()+' socket connected...')
  
  socket.on('dialog.reset', (data) => {
    socket.request.session.dialog_context = null
    socket.emit('action.status', {text:'reset success.'})
  })
  
  socket.on('dialog.input', (data) => {
    var input = data.input
    
    console.log('dialog.input received:'+JSON.stringify(data))
    
    var serviceMsgCallack = function(err, response){
      if (err) {
        console.error(err)
        res.json({ok:false, err:err})
        return
      }
    
      console.log('server response:'+JSON.stringify(response))
    
      socket.request.session.dialog_context = response.context
      
      if (response.context.skip_user_input == true) {
        if (response.actions) {
          
          var act = response.actions[0]
          var dialog_context = response.context
          
          console.log('before perform action:'+act.name)
          
          dialog_context[act.result_variable] = 'ok'
          socket.request.session.dialog_context = dialog_context
          
          getService().message({
            workspace_id: workspace_id,
            input: response.input,
            intents:response.intents,
            entities:response.entities,
            context:dialog_context
            }, serviceMsgCallack)

          var caller = new ActionCaller((res_data)=>{
            socket.emit('action.status', res_data)
            
            if (res_data.done) {
              
            }
          })
          caller.performAction(response.actions[0])
        }
        
      } else {
        socket.emit('dialog.output', {ok:true, output:response.output.text,
          input:response.input,
          client_seq:data.client_seq,
          intents:response.intents,
          entities:response.entities})
      }
    }
      
    getService().message({
      workspace_id: workspace_id,
      input: {text:input},
      context:socket.request.session.dialog_context
      }, serviceMsgCallack)
  })
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
        
      test_ws_send('action success.')
    })
})

router.ws_handler = ws_handler
module.exports = router
