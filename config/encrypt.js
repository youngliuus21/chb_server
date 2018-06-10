

(function(){
    if (process.argv.length < 3) {
      console.log('usage: node encrypt.js PASSWORD')
      return
    }
    
    var pwd = process.argv[2]
    var input_file = 'secret.json'
    var output_file = 'secret.enc'
    
    const crypto = require('crypto')
    const fs = require('fs')
    const cipher = crypto.createCipher('aes256', pwd)

    const input = fs.createReadStream(input_file)
    const output = fs.createWriteStream(output_file)

    input.pipe(cipher).pipe(output)
})()