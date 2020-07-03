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

// ADD CATEGORY
router.post('/products/addcategory', auth, (req, res) => {
        // {name, description, stock, price} = req.body
        // {picture} = req.file
        const sqlInsert = `INSERT INTO table_categories SET ?`
        const dataInsert = req.body

        // insert semua data text
        conn.query(sqlInsert, dataInsert, (err, result) => {
            if (err) return res.status(500).send(err)
            
            res.status(200).send(result)
        })
})

// UPDATE PRODUCT PHOTO
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
        const sqlUpdate = `UPDATE table_products SET ? WHERE id = ?`
        const dataUpdate = [req.body, req.params.product_id]        
            
            conn.query(sqlUpdate, dataUpdate, (err, result) => {
                if (err) return res.status(500).send(err)

                res.status(200).send({message: "Update data berhasil"})
            })    
})

// READ ALL PRODUCTS
router.get('/products', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, p.price_basic, p.product_photo, p.status, u.username 
    FROM table_products p JOIN table_users u ON p.user_id=u.id WHERE p.status = 1`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ OWN PRODUCTS
router.get('/products/me', auth, (req, res) => {
    const sqlSelect = `
    SELECT *
    FROM table_products  
    WHERE user_id = ${req.user.id}`

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
router.get('/product/:id', (req, res) => {
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



/////////////////////////
/////// C A R T  ////////
/////////////////////////

// ADD TO CART
router.post('/products/addtocart', auth,  (req, res) => {
        // {name, description, stock, price} = req.body
        // {picture} = req.file
        const sqlInsert = `INSERT INTO table_carts SET ?`
        const dataInsert = req.body

        // insert semua data text
        conn.query(sqlInsert, dataInsert, async (err, result) => {
            if (err) return res.status(500).send(err)
        
        })
        res.status(200).send({message:'Data added to cart'})
})

// READ CARTS
router.get('/products/cart', auth, (req, res) => {
    const sqlSelect = `
    SELECT c.id, c.user_id, c.seller_id, c.product_id, c.product_name, c.detail_product, c.price, c.picture, c.status, u.username
    FROM table_carts c JOIN table_users u ON c.seller_id = u.id
    WHERE user_id = ${req.user.id}`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
    
})

// DELETE CART
router.delete('/cart/:cart_id', auth, (req, res) => {
    const sql = `DELETE FROM table_carts WHERE id = ${req.params.cart_id}`
    conn.query(sql, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send({message:"Delete Success"})
    })
})


///////////////////////////////
///////// A D M I N  //////////
//////////////////////////////

// READ ALL PRODUCTS ADMIN
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

///////////////////////////////
///////// O R D E R S  ////////
//////////////////////////////

// ADD TO ORDERS
router.post('/orders', auth,  (req, res) => {
    // Memasukkan data Order dari Cart
    const sqlInsertOrder = `
        INSERT INTO
            table_orders(user_id, seller_id, product_id, product_name, total_amount, detail_order, status)
        VALUES ?
    `

    // Mengambil data Order dari Cart
    const dataInsertOrder = req.body.carts.map(cart => (
        [cart.user_id, cart.seller_id, cart.product_id, cart.product_name, cart.price, cart.detail_product, cart.status]
    ))

    conn.query(sqlInsertOrder, [dataInsertOrder], (err, result) => {
        if(err) return res.status(500).send(err)

        // Delete Cart
        const sqlDeleteCarts = `DELETE FROM table_carts WHERE user_id = ${req.user.id}`
        conn.query(sqlDeleteCarts, (err, results) => {
            if(err) return res.status(500).send(err)
            
            res.status(200).send({message:'Checkout success!'})

        })
    })
})



// READ ORDERS
router.get('/orders', auth, (req, res) => {
    const sqlSelect = `SELECT * FROM table_orders WHERE ${req.user.id} = user_id OR seller_id`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

module.exports = router
