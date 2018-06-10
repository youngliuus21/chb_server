(function(){
    if (process.argv.length < 3) {
      console.log('usage: node decrypt.js PASSWORD')
      return
    }
    
    var pwd = process.argv[2]
    var input_file = 'secret.enc'
    var output_file = 'secret.json'
    
    const crypto = require('crypto')
    const fs = require('fs')
    const decipher = crypto.createDecipher('aes256', pwd)

    const input = fs.createReadStream(input_file)
    const output = fs.createWriteStream(output_file)

    input.pipe(decipher).pipe(output)
})()