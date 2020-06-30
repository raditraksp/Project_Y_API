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

//////////////////////
// P R O D U C T S //
/////////////////////

// PRODUCTS
const productsDirectory = path.join(__dirname, '../assets/products')

const product = multer({
   // storage: storage,
   limits: {
       fileSize: 100000000 // Byte , default 1MB
   },
   fileFilter(req, file, cb) {
       if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){ // will be error if the extension name is not one of these
           return cb(new Error('Please upload image file (jpg, jpeg, or png)')) 
       }

       cb(undefined, true)
   }
})

// POST PRODUCT
router.post('/products', auth, product.single("product_photo"),  (req, res) => {
    try {
        // {name, description, stock, price} = req.body
        // {picture} = req.file
        const sqlInsert = `INSERT INTO table_products SET ?`
        const dataInsert = {...req.body, user_id : req.user.id}

        // insert semua data text
        conn.query(sqlInsert, dataInsert, async (err, result) => {
            if (err) return res.status(500).send(err)
            
            // Generate file name
            const fileName = `${shortid.generate()}.png`
            // Simpan gambar
            await sharp(req.file.buffer).resize(500).png().toFile(`${productsDirectory}/${fileName}`)
            
            const sqlUpdate = `UPDATE table_products SET product_photo = ? WHERE id = ?`
            const dataUpdate = [fileName, result.insertId]
            
            // Simpan nama gambar
            conn.query(sqlUpdate, dataUpdate, (err, result) => {
                if (err) return res.status(500).send(err)

                res.status(200).send({message: "Insert data berhasil"})
            })
         

        })
    } catch (err) {
        res.status(500).send(err)
    }
})

// UPDATE PRODUCT AVATAR
router.post('/product/photo/:product_id', auth, product.single('product_photo'), async (req,res) => {

    try {
        const sql = `UPDATE table_products SET product_photo = ? WHERE id = ?`
        const fileName = `${shortid.generate()}.png`
        const data = [fileName, req.params.product_id]
        
        await sharp(req.file.buffer).resize(200).png().toFile(`${productsDirectory}/${fileName}`)
 
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

// EDIT PRODUCT
router.patch('/product/:product_id', auth, (req, res) => {
    try {
        // {name, description, stock, price} = req.body
        // {picture} = req.file
        const sqlUpdate = `UPDATE table_products SET ? WHERE id = ? AND user_id = ?`
        const dataUpdate = [req.body, req.params.product_id, req.user.id]

        // insert semua data text
        conn.query(sqlUpdate, dataUpdate, async (err, result) => {
            if (err) return res.status(500).send(err)
            
            // Generate file name
            
            conn.query(sqlUpdate, dataUpdate, (err, result) => {
                if (err) return res.status(500).send(err)

                res.status(200).send({message: "Update data berhasil"})
            })
         

        })
    } catch (err) {
        res.status(500).send(err)
    }
})

// READ ALL PRODUCTS
router.get('/products', auth, (req, res) => {
    const sqlSelect = `SELECT * FROM table_products WHERE user_id != ${req.user.id} AND status = 1`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ OWN PRODUCTS
router.get('/products/me', auth, (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, c.category, p.detail_product, p.price_basic, p.price_premium, p.detail_basic, p.detail_premium, p.product_photo, p.status, p.created_at, p.updated_at 
    FROM table_products p 
    JOIN table_categories c ON p.category_id = c.id
    WHERE p.user_id = ${req.user.id}`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
    
})

// READ PRODUCT IMAGE
router.get('/product/picture/:fileName', (req, res) => {
    var options = { 
        root: productsDirectory // Direktori foto disimpan
    };      
    
    var fileName = req.params.fileName;
    
    res.status(200).sendFile(fileName, options, function (err) {
        if (err) {
            return res.status(404).send({message: "Image not found"})
        } 
        
        console.log('Sent:', fileName);
    });
})

// READ DETAIL PRODUCT
router.get('/product/:id', auth, (req, res) => {
    const sqlSelect = `SELECT * FROM table_products WHERE id = ${req.params.id}`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result[0])
    })
})

// DELETE PRODUCT
router.delete('/product/:product_id', auth, (req, res) => {
    const sql = `DELETE FROM table_products WHERE id = ${req.params.product_id}`
    conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send({message:"Delete Success"})
    })
})



module.exports = router
