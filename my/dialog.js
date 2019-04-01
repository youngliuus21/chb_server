var express = require('express')
var bodyParser = require('body-parser')
var AssistantV1 = require('watson-developer-cloud/assistant/v1')
var io = require('socket.io-client')
var Request = require('request')
var config = require('config')
var router = express.Router()
var jsonParser = bodyParser.json()
var mysecret = require('./mysecret').secret

router.get('/', function(req, res){
  res.render('dialog', {mytitle:'Appliction Assistant'})
})

var service = null
var workspace_id = config.get('workspace_id')

function getService() {
  if (service != null) {
    return service
  }
  
  service = new AssistantV1({
    "username": mysecret.username,
    "password": mysecret.password,
    url: "https://gateway.watsonplatform.net/assistant/api",
    version: '2018-09-20'
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
    this.act_socket = io(process.env.ACTION_SERVER+'/action')
    console.log('after connect' + process.env.ACTION_SERVER+'/action')

    this.act_socket.on('act.status', (data) => {
      console.log('act.status, get data:'+JSON.stringify(data))
    
      if (this.actResFun)
        this.actResFun(data)
      if (data && data.close == true)//server tells me to close
        this.close()
    })

    this.act_socket.on('connect_error', (err) => {
      console.log('connect_error: ' + JSON.stringify(err))
    })

    this.act_socket.on('connect_timeout', (err) => {
      console.log('connect_timeout: ' + JSON.stringify(err))
    })

    this.act_socket.on('error', (err) => {
      console.log('error: ' + JSON.stringify(err))
    })
  }

  this.performAction = function(data) {
    if (!this.act_socket)
      this.openActSocket()
    console.log('before emit: '+JSON.stringify(data)) 
    this.act_socket.emit('dialog.act', data)
    console.log('after emit')
  }
  
  this.close = function() {
    if (this.act_socket)
      this.act_socket.close()
  }
}

router.get('/img', (req, res) => {
  var remote = process.env.ACTION_SERVER + '/static/' + req.query.fname
  
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
  
  socket.sendCustomMsgAndCallback = function(event, data, callback) {
    this.emit(event, data)
    var res_event = event+'.response'
    this[res_event] = callback
    
    this.on(res_event, (res_data)=>{
      
      var r_callback = this[res_event]
      if (r_callback) {
        r_callback(res_data)
        this[res_event] = null
      }
    })
  }
  
  socket.on('dialog.reset', (data) => {
    socket.request.session.dialog_context = null
    socket.request.session.sso = null
    socket.emit('action.status', {text:'reset success.'})
  })
  
  socket.on('dialog.input', (data) => {
    var input = data.input
    
    console.log('dialog.input received:'+JSON.stringify(data))
    
    var serviceMsgCallack = function(err, response){
      if (err) {
        console.error(err)
        socket.emit('dialog.output', {ok:false, output:err})
        return
      }
    
      console.log((new Date()).toString()+' server response:'+JSON.stringify(response))
    
      socket.request.session.dialog_context = response.context
      
      if (response.output.text != '') {
        socket.emit('dialog.output', {ok:true, output:response.output.text,
          input:response.input,
          client_seq:data.client_seq,
          intents:response.intents,
          entities:response.entities})
      }
      
      if (response.context.skip_user_input == true) {
        
        if (response.actions) {
          
          var act = response.actions[0]
          var dialog_context = response.context
          
          console.log('before perform action:'+act.name)
          
          dialog_context[act.result_variable] = 'ok'
          socket.request.session.dialog_context = dialog_context
          
          var func_dialog_resp = function() {
            getService().message({//tell dialog to continue
              workspace_id: workspace_id,
              input: response.input,
              intents:response.intents,
              entities:response.entities,
              context:dialog_context
              }, serviceMsgCallack)
          }
          var sync_call = act.parameters || act.parameters.sync == 'true'
          if (!sync_call)
            func_dialog_resp()

          var result_var_name = act.result_variable
          if (socket.request.session.sso) {
            var caller = new ActionCaller((res_data)=>{
              socket.emit('action.status', res_data)//send status to browser
              if (sync_call && res_data.res != undefined) {
                dialog_context[result_var_name] = res_data
                if (sync_call)
                  func_dialog_resp()
              }
            })
            act.sso = socket.request.session.sso
            console.log('login info:'+JSON.stringify(act.sso.username))
            caller.performAction(act)//send reqeust to action server
          } else {
            socket.sendCustomMsgAndCallback('dialog.login', {}, function(login_res){
              console.log('get dialog.login.response:'+JSON.stringify(login_res.username))
              socket.request.session.sso = login_res
              var caller = new ActionCaller((res_data)=>{
                socket.emit('action.status', res_data)
                if (sync_call && res_data.done == true) {
                  dialog_context[result_var_name] = res_data
                  if (sync_call)
                    func_dialog_resp()
                }
              })
              act.sso = login_res
              caller.performAction(act)
            })
          }
        }
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
