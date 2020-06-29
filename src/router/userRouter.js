const conn = require('../config/database')
const router = require('express').Router()
const verifSendEmail = require('../config/verifSendEmail')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const jwt = require('../config/token')
const auth = require('../config/auth')


const upload = multer({
   limits: {
       fileSize: 10000000 // Byte , default 1MB
   },
   fileFilter(req, file, cb) {
       if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){ // will be error if the extension name is not one of these
           return cb(new Error('Please upload image file (jpg, jpeg, or png)')) 
       }

       cb(undefined, true)
   }
})

const avatarDirectory = path.join(__dirname, '../assets/users')

// UPLOAD AVATAR
router.post('/user/avatar', auth, upload.single('avatar'), async (req, res) => {

   try {
      // const fileName = `${req.body.username}-avatar.png`
      // const sql = `UPDATE users SET avatar = '${avatar}' WHERE username = '${req.body.username}'`

      const fileName = `${req.user.username}-avatar.png`
      const sql = `UPDATE table_detail_users SET avatar = ? WHERE username = ?`
      const data = [fileName, req.user.username]

      // Menyimpan foto di folder
      await sharp(req.file.buffer).resize(300).png().toFile(`${avatarDirectory}/${fileName}`)

      // Simpan nama avata di kolom 'avatar'
      conn.query(sql, data, (err, result) => {
         // Jika ada error saat running sql
         if(err) return res.status(500).send(err)

         // Simpan nama fotonya di database
         res.status(201).send({ message: 'Berhasil di upload' })
      })

      
   } catch (err) {
      res.status(500).send(err.message)
   }

}, (err, req, res, next) => {
   // Jika terdapat masalah terhadap multer, kita akan kirimkan error
   res.send(err)
})

////////////
// G E T //
///////////

// GET PROFILE
router.get('/user/profile', auth, (req, res) => {
   res.status(200).send({
      ...req.user,
      avatar : `http://localhost:2022/user/avatar/${req.user.username}` 
   })
})

// GET AVATAR
router.get('/user/avatar/:username', (req, res) => {
   // Menyimpan username pada variable
   const username = req.params.username

   // Cari nama file di database
   const sql = `SELECT avatar FROM table_detail_users WHERE username = '${username}'`

   // Kirim file ke client
   conn.query(sql, (err, result) => {

      // Jika ada error saat running sql
      if(err) return res.status(500).send(err)

      
      try {
         // Nama file avatar
         const fileName = result[0].avatar
         // Object options yang menentukan dimana letak avatar disimpan
         const options = {
            root: avatarDirectory
         }

         // Mengirim file sebagai respon
         // alamatFolder/namaFile, cbfunction
         res.sendFile(`${avatarDirectory}/${fileName}`, (err) => {
            // Mengirim object error jika terjadi masalah
            if(err) return res.status(200).send(err)


         })
      } catch (err) {
         res.status(500).send(err)
      }

   })
})

// VERIFY EMAIL
router.get('/verify/:userid', (req, res) => {
   const sql = `UPDATE table_users SET verified_email = true WHERE id = ${req.params.userid}`

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err.sqlMessage)

      res.status(200).send('<h1>Verikasi Berhasil</h1>')
   })
})

/////////////
// P O S T //
////////////

// REGISTER USER
router.post('/register', (req, res) => {
   // req.body = {username, name, email, password}

   // Query insert data
   const sql = `INSERT INTO table_detail_users SET ?`
   
   const data = req.body


   // Chek format email
   // valid = true or false
   let valid = validator.isEmail(data.email)
   if(!valid) return res.status(400).send({message : 'Email tidak valid'})

   // Hash password
   data.password = bcrypt.hashSync(data.password, 8)
   
   // Running query
   conn.query(sql, data, (err, resu) => {
      // Jika ada error kita akan kirim object errornya
      if(err) return res.status(500).send(err)

      // Kirim email verifikasi
      verifSendEmail(data.username, data.email, resu.insertId)
      const sql2= `INSERT INTO table_users SET role_id = 2,detail_user_id= ${resu.insertId}`
      conn.query(sql2,(err, result) => {
         if(err) return res.status(500).send(err)
      
      // Jika berhasil, kirim object
      
   })
   res.status(201).send(
      resu
   )
   })
})

// LOGIN USER
router.post('/user/login', (req, res) => {
   const {username, password} = req.body

   const sql = `SELECT * FROM table_detail_users WHERE username = '${username}'`
   const sql2 = `INSERT INTO table_tokens SET ?`
   
   

   conn.query(sql, (err, result) => {
      // Cek error
      if(err) return res.status(500).send(err)

      // result = [ {} ]
      let user = result[0]
      // Jika username tidak ditemukan
      if(!user) return res.status(404).send({message: 'username tidak ditemukan'})
      // Verifikasi password
      let validPassword = bcrypt.compareSync(password, user.password)
      // Jika user memasukkan password yang salah
      if(!validPassword) return res.status(400).send({message: 'password tidak valid'})
      // Verikasi status verified
      // if(!user.verified_email) return res.status(401).send({message: 'Anda belum terverifikasi'})
      if(user.verified_email === 0) return res.status(401).send({message: 'Anda belum terverifikasi'})
      // Membuat token
      let token = jwt.sign({ id: user.id}, 'secretcode')
      // Property user_id dan token merupakan nama kolom yang ada di tabel 'tokens'
      const data = {user_id : user.id, token : token}

      conn.query(sql2, data, (err, result) => {
         if(err) return res.status(500).send(err)
         
         // Menghapus beberapa property
         delete user.password
         delete user.avatar
         delete user.verified
         const sql3 = `UPDATE table_users SET token_id = ${result.insertId} WHERE detail_user_id = ${user.id} `
         conn.query(sql3)
         res.status(200).send({
            message: 'Login berhasil',
            user,
            token
         })
      })

   })
})

///////////////
// P A T C H //
///////////////

// UPDATE USER
router.patch('/user/profile', auth, upload.single('avatar'), (req, res) => {
   const sql = `UPDATE users SET ? WHERE id = ? `

   // jika password string kosong -> hapus
   // jika tidak -> bcrypt

   req.body.password ? req.body.password = bcrypt.hashSync(req.body.password, 8) : delete req.body.password


   // req.body = { name, email, password }
   const data = [req.body, req.user.id]
   // hash => Asynchronous , then catch, async await
   // hashSync =>  Synchronous
                      
   conn.query(sql, data, (err, result) => {
      if(err) return res.status(500).send(err)

      res.status(200).send({
         message : "Update berhasil",
         result
      })
   })
})

router.delete('/logout',auth,(req,res) => {
   const sql = `DELETE FROM table_tokens WHERE user_id = ${req.user.id}`

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)

      res.status(200).send({
         message : "delete berhasil",
         result
      })
   })
})

// router.patch('/edit/user',auth,(req.res) => {
//    const sql = ""
// })



module.exports = router
