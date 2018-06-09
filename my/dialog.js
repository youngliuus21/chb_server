var express = require('express')
var bodyParser = require('body-parser')

var router = express.Router()
var jsonParser = bodyParser.json()

router.get('/say', jsonParser, function(req, res){
  res.end('say ok')
})

module.exports = router