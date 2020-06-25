const jwt = require('jsonwebtoken')

// bikin token
const sign = data => jwt.sign(data, 'secretcode')
   
// check token
const verify = token => jwt.verify(token, 'secretcode')

module.exports = {sign, verify}