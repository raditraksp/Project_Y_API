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
const shortid = require('shortid')

const product = multer({
    // storage: storage,
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

///////////////////////////////
///////// A D M I N  //////////
//////////////////////////////

// VERIFY PRODUCTS ADMIN
router.get('/products/admin', auth, (req, res) => {
    const sqlSelect = `SELECT  p.id, p.product, u.username, p.product_photo, 
    p.status, u.role_id, p.detail_basic, p.detail_premium, p.price_basic, p.price_premium 
    FROM table_products p JOIN table_users u ON p.user_id = u.id
    WHERE status = 0`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// APPROVED PRODUCTS BY ADMIN
router.get('/approved/admin/:product_id', auth, (req, res) => {
    const sqlSelect = `UPDATE table_products SET status=1 WHERE id= ${req.params.product_id}`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// REJECTED PRODUCTS BY ADMIN
router.get('/rejected/admin/:product_id', auth, (req, res) => {
    const sqlSelect = `UPDATE table_products SET status=2 WHERE id= ${req.params.product_id}`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ ALL ORDERS ADMIN
router.get('/orders/admin', auth, (req, res) => {
    const sqlSelect = `SELECT id, payment_photo, status 
    FROM table_orders
    WHERE status = 1`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

const ordersDirectory = path.join(__dirname, '../assets/payment_photos')

// READ PAYMENT PHOTO ORDERS
router.get('/orders/:orders_id/payment/:fileName', (req, res) => {
    var options = { 
        root: ordersDirectory // Direktori foto disimpan
    };      
    
    var fileName = req.params.fileName;
    
    res.status(200).sendFile(fileName, options, function (err) {
        if (err) {
            return res.status(404).send({message: "Image not found"})
        } 
        console.log('Sent:', fileName);
    });
})

// APPROVED PAYMENT BY ADMIN
router.get('/orders/:orders_id/approved/admin', auth, (req, res) => {
    const sqlSelect = `UPDATE table_orders SET status=3 WHERE id= ${req.params.orders_id}`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// REJECTED PAYMENT BY ADMIN
router.post('/orders/:orders_id/rejected/admin', auth, (req, res) => {
    
    const sqlInsert = `
    UPDATE table_orders 
    SET message_admin = ? , status=4 , payment_photo = null 
    WHERE id = ${req.params.orders_id}
    `
    const msgInsert = req.body.message

    conn.query(sqlInsert, msgInsert, (err, result) => {
        if (err) return res.status(500).send(err)

        res.status(200).send({message: "Pembayaran berhasil ditolak!"})
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

 module.exports = router