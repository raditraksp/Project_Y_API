const conn = require('../config/database')
const router = require('express').Router()
const verifSendEmail = require('../config/verifSendEmail')
const changePassNotif = require('../config/changePassNotif')
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
      const sql = `UPDATE table_detail_users SET avatar = ? WHERE user_id = ?`
      const data = [fileName, req.user.id]

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

   const sql = `SELECT * FROM table_detail_users WHERE user_id = ${req.user.id}`

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
      res.status(200).send(
         {result,
          avatar : `http://localhost:2022/user/avatar/${req.user.username}?unq=${new Date()}` 
         }
      )
  })
})

// GET AVATAR
router.get('/user/avatar/:id', (req, res) => {
   // Menyimpan username pada variable
   const id = req.params.id

   // Cari nama file di database
   const sql = `SELECT avatar FROM table_detail_users WHERE user_id = '${id}'`

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
   const sql = `INSERT INTO table_users SET ? `
   
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
      if(err) return res.status(500).send({message : 'Username Atau Email sudah terpakai'})


      // Kirim email verifikasi
      verifSendEmail(data.username, data.email, resu.insertId)
      const sql2= `INSERT INTO table_detail_users SET user_id= ${resu.insertId}`
      conn.query(sql2,(err, result) => {
         if(err) return res.status(500).send(err)
      
      // Jika berhasil, kirim object
      
   })
   res.status(201).send({message : 'Silakan cek Email untuk verifikasi'})
   })
})


// EDIT users
router.patch('/user/profile', auth, (req, res) => {
   try {
       // {name, description, stock, price} = req.body
       // {picture} = req.file
       const sqlUpdate = `UPDATE table_detail_users SET ? WHERE user_id = ? `
       const dataUpdate = [req.body , req.user.id]
       
       // insert semua data text
       conn.query(sqlUpdate, dataUpdate, (err, result) => {
           if (err) return res.status(500).send(err)
               res.status(200).send({message: "Update data berhasil"})
           })
                } catch (err) {
                res.status(500).send(err)
               }
            })

// LOGOUT
router.delete('/logout', auth, (req,res) => {
   const sql = `DELETE FROM table_tokens WHERE user_id = ${req.user.id}`
   
   conn.query(sql, (err, result) => {
       if(err) return res.status(500).send(err)
       
      res.status(200).send({
         message : "delete berhasil",
         result
      })
    })
})


// UPDATE AVATAR
router.post('/user/avatar', auth, upload.single('avatar'), async (req,res) => {

   try {
       const sql = `UPDATE table_detail_users SET avatar = ? WHERE id = ?`
       const fileName = `${shortid.generate()}.png`
       const data = [fileName, req.user.id]
       
       await sharp(req.file.buffer).resize(200).png().toFile(`${avatarDirectory}/${fileName}`)

       conn.query(sql, data, (err, result) => {
           if (err) return res.status(500).send(err)

           res.status(200).send({message: "Update data berhasil"})

       })
   } catch (error) {
       res.status(500).send(error.message)
   }
   
}, (err, req, res, next) => { // it should declare 4 parameters, so express know this is function for handling any uncaught error
   res.status(400).send(err.message)
})

//FORGET PASSWORD
router.post('/user/forget',(req,res) => {
    
    const sql = `select * FROM table_users WHERE email = ?`
    const sql2 = `INSERT INTO table_tokens SET ?`

      const data = req.body.email
      conn.query(sql, data, (err, result) => {
         // Cek error
         if(err) return res.status(500).send(err)
   
         // result = [ {} ]
         let user = result[0]
         
         if(!user) return res.status(404).send({message: 'email tidak ditemukan'})
         
         // Membuat token
         let token = jwt.sign({ id: user.id}, 'secretcode')
         // Property user_id dan token merupakan nama kolom yang ada di tabel 'tokens'
         const dataInsert = {user_id : user.id, token : token}
         changePassNotif(result[0].name, req.body.email, user.id, token)
         conn.query(sql2, dataInsert, (err, result) => {
            if(err) return res.status(500).send(err)
            
         })
         res.status(200).send({message: 'Silahkan cek email anda untuk mengganti password', result, token})
             
     })
 })



   // LOGIN USER
   router.post('/user/login', (req, res) => {
      const {username, password} = req.body
   
      const sql = `SELECT * FROM table_users WHERE username = '${username}'`
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
            const sql3 = `UPDATE table_users SET token_id = ${result.insertId} WHERE id = ${user.id} `
            conn.query(sql3)
            res.status(200).send({
               message: 'Login berhasil',
               user,
               token
            })
         })
   
      })
   })

      //FORGET PASSWORD CHANGE PASSWORD
   router.patch('/user/forget/:user_id', (req,res) => { 
      const sqlUpdate = `UPDATE table_users SET ? WHERE id = ${req.params.user_id}`
      const data = req.body
      data.password = bcrypt.hashSync(data.password, 8)
      conn.query(sqlUpdate,data, (err, result) => {
         if(err) return res.status(500).send(err)
         res.status(200).send({
            
            message: 'Password has change'})

      })

   })

   // DELETE TOKEN
router.delete('/deletetoken/:user_id', (req,res) => {
   const sql = `DELETE FROM table_tokens WHERE user_id = ${req.params.user_id}`
   
   conn.query(sql, (err, result) => {
       if(err) return res.status(500).send(err)
       
      res.status(200).send({
         message : "delete berhasil",
         result
      })
    })
})

router.post('/change_password',auth, (req, res) => {
   

   const sql = `SELECT * FROM table_users WHERE id = ${req.user.id}`
   
   const data = req.body
   conn.query(sql, (err, result) => {
      // Cek error
      if(err) return res.status(500).send(err)

      // result = [ {} ]
      let user = result[0]
      // Verifikasi password
      let validPassword = bcrypt.compareSync(data.oldPassword, user.password)
      // Jika user memasukkan password yang salah
      if(!validPassword) return res.status(400).send({message: 'password tidak valid'})
      let matchPassword = data.newPassword1 == data.newPassword2
      if(!matchPassword) return res.status(400).send({message: 'password baru salah'})
      data.newPassword2 = bcrypt.hashSync(data.newPassword2, 8)

      const sql2 = `UPDATE table_users SET password = '${data.newPassword2}' WHERE id = ${req.user.id}`
      conn.query(sql2, (err, result) => {
         if(err) return res.status(500).send(err)
         
         res.status(200).send({
            message: "berhasil"
         })
      })
      
   })
})

   
   
     
   module.exports = router