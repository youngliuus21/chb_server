var express = require('express')
var bodyParser = require('body-parser')

var router = express.Router()
var jsonParser = bodyParser.json()

router.get('/', function(req, res){
  res.render('dialog', {mytitle:'Appliction Assistant'})
})

router.get('/say', jsonParser, function(req, res){
  res.json({text:'ok'})
})

module.exports = router