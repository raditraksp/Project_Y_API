const jwt = require('jsonwebtoken')
const conn = require('../database')

// Function Authentication
const auth = (req, res, next) => {
   
   try{
      // Mengambil token saat proses menerima request
      let token = req.header('Authorization')
      // Mencoba mengambil data asli yang tersimpan di dalam token
      let decoded = jwt.verify(token, 'secretcode')
      // Didalam token ada id user, selanjutnya di gunakan untuk mengambil data user di database
      let sql = `SELECT id, username, name, address, date_of_birth, gender, phone_number, email, avatar ,ktp_number, ktp_photo FROM table_detail_users WHERE id = ${decoded.id}`


      conn.query(sql, (err, result) => {
         if(err) return res.send(err)
         // informasi user disimpan ke object 'req' di property 'user'
         req.user = result[0]
         // Untuk melanjutkan ke proses berikutnya (proses utama)
         next()
      })
   } catch(err) {
      res.status(500).send(err)
   }

}

module.exports = auth