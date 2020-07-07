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
const shortid = require('shortid')



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

//buat variabel untuk mennyimap directory file yang di upload
const avatarDirectory = path.join(__dirname, '../assets/users')
//////////////////
// UPLOAD AVATAR//
/////////////////
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
////////////////
// GET SELLER//
//////////////
router.get('/user/seller', (req, res) => {

   const sql = `SELECT * FROM table_detail_users`

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
      res.status(200).send(result)
   })
})
////////////////
// GET AVATAR//
//////////////
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

/////////////////////
// GET TABLE USERS//
///////////////////
router.get('/user', auth, (req, res) => {

   const sql = `SELECT * FROM table_users WHERE user_id = ${req.user.id}`

   conn.query(sql, (err, result) => {
      if(err) return res.status(500).send(err)
      
  })
})




// EDIT users
router.patch('/user/profile', auth, (req, res) => {
   try {
       const sqlUpdate = `UPDATE table_detail_users SET ? WHERE user_id = ? `
       const dataUpdate = [req.body , req.user.id]
       
       // insert semua data text
       conn.query(sqlUpdate, dataUpdate, (err, result) => {
           if (err) return res.status(500).send(err)
               res.status(200).send(result)
           })
                } catch (err) {
                res.status(500).send(err)
               }
})


///////////////////
// UPDATE AVATAR//
/////////////////
router.post('/user/avatar', auth, upload.single('avatar'), async (req,res) => {

   try {
       const sql = `UPDATE table_detail_users SET avatar = ? WHERE user_id = ?`
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
//////////////////////////////
//FORGET PASSWORD CEK EMAIL//
////////////////////////////
router.post('/user/forget',(req,res) => {
    
    const sql = `select * FROM table_users WHERE email = ?`
    const sql2 = `INSERT INTO table_tokens SET ?`

      const data = req.body.email
      conn.query(sql, data, (err, result) => {
         // Cek error respon
         if(err) return res.status(500).send(err)
   
         // result = [ {} ]
         let user = result[0]
         //jika user not true
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



// FORGET PASSWORD CHANGE PASSWORD
// router.patch('/user/forget/:token/:user_id', (req,res) => { 
//    const sqlUpdate = `UPDATE table_users SET ? WHERE id = ${req.params.user_id}`
//    const data = req.body
//    data.password = bcrypt.hashSync(data.password, 8)
//    conn.query(sqlUpdate,data, (err, result) => {
//       if(err) return res.status(500).send(err)
//       res.status(200).send({
         
//          message: 'Password has change'})
// })
// })


// router.patch('/user/forget/:token/:user_id', (req,res) => { 
//     const sqltoken = `SELECT * FROM table_tokens WHERE token = ${req.params.token}`
//     conn.query(sqltoken,(err,res) => {
//         if(res.length == 0 ) return res.status(501).send(err)
//      const sqlUpdate = `UPDATE table_users SET ? WHERE id = ${req.params.user_id}`
//      const data = req.body
//      data.password = bcrypt.hashSync(data.password, 8)
//      conn.query(sqlUpdate,data, (err, result) => {
//         if(err) return res.status(500).send(err)
//         res.status(200).send({
           
//            message: 'Password has change'})
//              })
//           })
//      })


///////////////////////////////////////
//CHANGE PASSWORD BUKAN LUPA PASSWORD//
///////////////////////////////////////
router.patch('/changepassword',auth, (req, res) => {
   

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

//////////////////////////
// READ OWN transaction//
////////////////////////
router.get('/historytransaction/me', auth, (req, res) => {
   const sqlSelect = `
   SELECT t.id, t.product_id, u.username, t.product_name, t.total_amount, t.detail_order, t.order_time, t.finish_time, t.status
   FROM table_transaction t
   JOIN table_users u ON t.seller_id = u.id
   WHERE user_id = ${req.user.id} AND (t.status = 6 OR  t.status = 2)`

   conn.query(sqlSelect, (err,result) => {
      if(err) return res.status(500).send(err)
      res.status(200).send(result)
   })

})
/////////////////////
// BECOME a SELLER//
///////////////////
router.get('/becomeseller', auth, (req, res) => {
   const sqlSelect = `UPDATE table_users SET role_id = 3 WHERE id= ${req.user.id}`

   conn.query(sqlSelect, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
   
})
///////////////////
//REPORT PRODUCT//
/////////////////
router.get('/report/product',auth,(req,res) => {
   const sql = `SELECT * FROM table_products WHERE user_id = ${req.user.id}`

   conn.query(sql, (err,result) => {
      if(err) return res.status(500).send(err)
      res.status(200).send(result)
   })
})

   
const transferDirectory = path.join(__dirname, '../assets/transfer_sub')

router.post('/transfer_photo', auth, upload.single('transfer_photo'), async (req,res) => {

   try {
       const sql = `INSERT INTO table_upgrade_users SET transfer_photo = ? , user_id = ? , status=0`
       const fileName = `${shortid.generate()}.png`
       const data = [fileName, req.user.id]
       
       await sharp(req.file.buffer).resize(500).png().toFile(`${transferDirectory}/${fileName}`)

       conn.query(sql, data, (err, result) => {
           if (err) return res.status(500).send(err)

           res.status(200).send({message: "Kirim data berhasil"})

       })
   } catch (error) {
       res.status(500).send(error.message)
   }
   
}, (err, req, res, next) => { // it should declare 4 parameters, so express know this is function for handling any uncaught error
   res.status(400).send(err.message)
})

router.post('/transfer_photo/again', auth, upload.single('transfer_photo'), async (req,res) => {

   try {
      const sql = `UPDATE table_upgrade_users SET transfer_photo = ? , status = 0 WHERE user_id= ?`
      const fileName = `${shortid.generate()}.png`
      const data = [fileName, req.user.id]
      
      await sharp(req.file.buffer).resize(500).png().toFile(`${transferDirectory}/${fileName}`)

      conn.query(sql, data, (err, result) => {
          if (err) return res.status(500).send(err)

          res.status(200).send({message: "Kirim data berhasil"})

      })
   } catch (error) {
         res.status(500).send(error.message)
   }
}, (err, req, res, next) => { // it should declare 4 parameters, so express know this is function for handling any uncaught error
   res.status(400).send(err.message)
})
   

// READ TRANSFER PHOTO UPGRADE
router.get('/transferphoto/:fileName', (req, res) => {
   var options = { 
       root: transferDirectory // Direktori foto disimpan
   };      
   
   var fileName = req.params.fileName;
   
   res.status(200).sendFile(fileName, options, function (err) {
       if (err) {
           return res.status(404).send({message: "Image not found"})
       }        
   });
})

router.get('/user/transfer/upgrade', auth, (req, res) => {
   const sqlSelect = `SELECT * FROM table_upgrade_users WHERE user_id= ${req.user.id}`

   conn.query(sqlSelect, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
})

router.get('/report/limit',auth,(req,res) => {
   const sqlSelect = `
   SELECT  date(finish_time) as time , seller_id, product_name, COUNT(product_name) as 'total_jual'
   from table_transaction
   where (seller_id = ${req.user.id}) AND (finish_time BETWEEN ? AND ?)
   GROUP BY time, product_name 
   ORDER BY 1;`
   const data = [req.body.dateMin,req.body.dateMax]
   conn.query(sqlSelect,data,(err,result) => {
      if(err) return res.status(500).send(err)
       
      res.status(200).send(result)      
   })
})
///////// A D  M  I  N //////////////

router.get('/admin/checkupgrade', auth, (req, res) => {
   const sqlSelect = `SELECT * FROM table_upgrade_users WHERE status= 0`

   conn.query(sqlSelect, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
})

// APPROVED UPGRADE BY ADMIN
router.get('/approved/upgrade/:user_id', auth, (req, res) => {
   const sqlSelect = `UPDATE table_users SET status_subscription=2 WHERE id= ${req.params.user_id}`

   conn.query(sqlSelect, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
})

// REJECTED UPGRADE BY ADMIN
router.get('/rejected/upgrade/:user_id', auth, (req, res) => {
   const sqlSelect = `UPDATE table_upgrade_users SET status=2 WHERE user_id= ${req.params.user_id}`

   conn.query(sqlSelect, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
})

// DELETE TABLE TRANSFER UPGRADE
router.delete('/upgrade/:user_id', auth, (req, res) => {
   const sql = `DELETE FROM table_upgrade_users WHERE user_id= ${req.params.user_id}`

   conn.query(sql, (err, result) => {
       if(err) return res.status(500).send(err)
       
       res.status(200).send(result)
   })
})

router.get('/chart/list', auth,(req, res) => {


   const sql = `SELECT  date(finish_time) as time , seller_id, product_name, COUNT(product_name) as 'total_jual'
   from table_transaction 
   where seller_id = ${req.user.id}
   GROUP BY time, product_name 
   ORDER BY 1;
   `
   conn.query(sql,(err,results) => {
      if(err) return res.status(500).send(err)
       
      res.status(200).send(results)

   })
})


     
module.exports = router