var express = require('express')
var bodyParser = require('body-parser')
var dialog = require('./my/dialog')

var jsonParser = bodyParser.json()

function startWebSocket(server, session) {
  var io = require('socket.io')(server)
  io.use(function(socket, next) {
      session(socket.request, socket.request.res, next)
  })
  
  server.io = io
  
  var nsp = io.of('/dialog')
  nsp.on('connection', dialog.ws_handler)
}

function startServer(){
    var app = express()
    
    app.set('views', './view');
    app.set('view engine', 'pug');
    app.locals.pretty = true
    
    var options = {
      dotfiles: 'ignore',
      etag: false,
      extensions: ['css', 'jpg'],
      index: false,
      maxAge: '5m',
      redirect: false,
      setHeaders: function (res, path, stat) {
        res.set('x-timestamp', Date.now())
      }
    }
    
    app.use('/', express.static('res', options))
    
    var session = require('express-session')
    var mySession = session({
        name:'chb_session',
      secret: 'chatbot server',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    })
    
    app.use(mySession)
    
    app.use('/dialog', dialog)
    
    app.all('/', function(req, res){
        res.redirect('/dialog')
    })
    
    var server = require('http').createServer(app)

    startWebSocket(server, mySession)
    
    server.listen(18888, function(){
        console.log('server started@18888...')
    })
}

startServer()