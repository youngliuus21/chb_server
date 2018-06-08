var express = require('express')

function startServer(){
    var app = express()
    
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
    
    app.get('/fld1', function (req, res) {
      res.send('hello world')
    })
    
    var server = require('http').createServer(app)
    
    server.listen(18888, function(){
        console.log('server started@18888...')
    })
}

startServer()