const conn = require('../db/')
const jwt = require('../token')

let auth = (req, res, next) => {
   try {
      let token = req.header('Authorization')
      let decoded = jwt.verify(token)
   
      let sqlToken = `SELECT token FROM tokens WHERE token = '${token}'`
      let sql = `SELECT id, username, name, email, avatar FROM users WHERE id = ${decoded.id} `
    
      conn.query(sqlToken, (err, result) => {
         if(err) return res.status(500).send(err)

         if(!result.length) return res.status(401).send({message: "Your session is expired"})

         conn.query(sql, (err, result ) => {
            if (err) return res.status(500).send(err)
    
            req.user = result[0]
            next()
        })
      })

   } catch (error) {
       res.status(500).send({err:error.message, token: req.header})
   }
}

module.exports = auth