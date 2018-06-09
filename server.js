var express = require('express')
var bodyParser = require('body-parser')
var dialog = require('./my/dialog')

var jsonParser = bodyParser.json()

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
    app.use(session({
        name:'chb_session',
      secret: 'chatbot server',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }
    }))
    
    app.use('/dialog', dialog)
    
    app.get('/fld1', jsonParser, function (req, res) {
      if (!req.session.value)
          req.session.value = 1
      else
          req.session.value += 1
          
    
      console.log('get fld1, session:'+JSON.stringify(req.session))
      
      res.end('hello world')
    })
    
    var server = require('http').createServer(app)
    
    server.listen(18888, function(){
        console.log('server started@18888...')
    })
}

startServer()