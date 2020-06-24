const jwt = require('jsonwebtoken')

const sign = data => jwt.sign(data, 'secretcode')

const verify = token => jwt.verify(token, 'secretcode')

module.exports = {sign, verify}