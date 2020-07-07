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

//////////////////
// VERIFY EMAIL//
////////////////
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
       //karena di database username dan email itu bersifat unik maka respon error seperti di bawah
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

 ////////////
// LOGOUT//
//////////
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

 ////////////////
// LOGIN USER//
//////////////
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

 /////////////////////////////////////////
// GANTI PASSWORD DENGAN PASSWORD BARU//
///////////////////////////////////////
router.patch('/user/forget/:token/:id', (req, res) => {
    const sql = `SELECT * FROM table_tokens WHERE token = "${req.params.token}"`
    //jangan lupa cek pass yang lama dan yang baru d frontend
    // data.password = bcrypt.hashSync(data.password, 8)
    // ambil data dulu baru d patch
    
    // id dari auth, auth dari frontend
    conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
        const id = result[0].user_id
        
        const {password2} = req.body
        // console.log(secondPass)
        let password = bcrypt.hashSync(password2, 8)
        // console.log(password, id)
        const sqlUpdate = `UPDATE table_users SET password = '${password}' WHERE id = ${id}`
        if(id == req.params.id) {
            const sqlDelete = `DELETE from table_tokens WHERE user_id = ${id}`
 
            return conn.query(sqlUpdate, (err, result) => {
                if(err) return res.status(500).send(err)
                
                conn.query(sqlDelete, (err, res) => {
                    if(err) return res.status(500).send(err)
                })
                res.status(200).send('Password berhasil diubah')
            })   
        }
        res.status(200).send('Anda tidak memiliki akses untuk mengganti password pada account ini')
    })
 })

 /////////////////
// DELETE TOKEN//
////////////////
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
 
 module.exports = router