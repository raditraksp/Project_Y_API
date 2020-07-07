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
       fileSize: 10000000 // Byte , default 1MB
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
            await sharp(req.file.buffer).resize(800).png().toFile(`${productsDirectory}/${fileName}`)
            
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


// UPDATE PRODUCT PHOTO
router.post('/product/photo/:product_id', auth, product.single('product_photo'), async (req,res) => {

    try {
        const sql = `UPDATE table_products SET product_photo = ? WHERE id = ?`
        const fileName = `${shortid.generate()}.png`
        const data = [fileName, req.params.product_id]
        
        await sharp(req.file.buffer).resize(1000).png().toFile(`${productsDirectory}/${fileName}`)
 
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

//////////////////////
///// R E A D ////////
/////////////////////

// READ ALL PRODUCTS
router.get('/products', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE p.status = 1 GROUP BY p.id ORDER BY RAND()`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ ALL PRODUCTS BY PREMIUM SELLER PAGE
router.get('/products/premiumseller', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE (u.status_subscription = 2 AND p.status=1) GROUP BY p.id ORDER BY RAND()`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ PRODUCTS BY PREMIUM SELLER LIMIT 5 HOME
router.get('/products/premiumseller/home', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE (u.status_subscription = 2 AND p.status=1) GROUP BY p.id ORDER BY RAND() LIMIT 5`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ PRODUCTS BY BEST RATING
router.get('/products/bestrating/home', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE p.status = 1 GROUP BY p.id ORDER BY rating_avg DESC LIMIT 5`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ PRODUCTS BY BEST RATING
router.get('/products/bestrating', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE p.status = 1 GROUP BY p.id ORDER BY rating_avg DESC`

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
router.get('/product/:product_id', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, p.price_basic, p.detail_product, p.price_premium, p.detail_basic, p.detail_premium, p.product_photo, p.status, u.username, u.email, p.created_at, p.updated_at
    FROM table_products p JOIN table_users u ON p.user_id=u.id WHERE p.id = ${req.params.product_id}`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result[0])
    })
})

// READ DETAIL PRODUCT
router.get('/product/search/category', (req, res) => {
    const sqlSelect = `
    select pc.id, pc.product_id, pc.category_id, category, product, p.user_id, detail_basic, detail_product, detail_premium, price_basic, price_premium, product_photo, status
    from table_product_categories pc join table_categories c on pc.category_id = c.id join table_products p on pc.product_id = p.id where status=1`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
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

/////////////////////////
//// C A T E G O R Y ////
/////////////////////////

// ADD CATEGORY
router.post('/products/addcategory', auth, (req, res) => {
    // {name, description, stock, price} = req.body
    // {picture} = req.file
    const sqlInsert = `INSERT INTO table_product_categories SET ?`
    const dataInsert = req.body

    // insert semua data text
    conn.query(sqlInsert, dataInsert, (err, result) => {
        if (err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ CATEGORY
router.get('/product/category/:product_id', (req, res) => {

const sqlInsert = `
SELECT pc.id, pc.product_id, c.category FROM table_product_categories pc join 
table_categories c ON pc.category_id=c.id WHERE pc.product_id = ${req.params.product_id}`

// insert semua data text
conn.query(sqlInsert, (err, result) => {
    if (err) return res.status(500).send(err)
    
    res.status(200).send(result)
})
})

// DELETE CATEGORY
router.delete('/product/category/:product_category_id', auth, (req, res) => {
const sql = `DELETE FROM table_product_categories WHERE id = ${req.params.product_category_id}`
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

router.get('/product/search/category', (req, res) => {
    const sqlSelect = `
    select pc.id, pc.product_id, u.username, pc.category_id, category, product, p.user_id, detail_basic, detail_product, detail_premium, price_basic, price_premium, product_photo, status
    from table_product_categories pc join table_categories c on pc.category_id = c.id join table_products p on pc.product_id = p.id join table_users u on p.user_id=u.id where status=1`
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

router.get('/chart/products',auth,(req,res) => {
    const sqlSelect = `
    select * from table_transaction where seller_id = ${req.user.id}`
    conn.query(sqlSelect,(err,result) => {
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

///////////////////////////////
///////// O R D E R S  ////////
//////////////////////////////

// ADD TO ORDERS
router.post('/orders', auth,  (req, res) => {
    // Memasukkan data Order dari table_carts
    const sqlInsertOrder = `
        INSERT INTO
            table_orders(user_id, seller_id, product_id, product_name, total_amount, detail_order, status)
        VALUES ?
    `
    // Mengambil data Order dari table_carts
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

// READ ORDERS USER
router.get('/orders', auth, (req, res) => {
    // Mengambil data dari table_order yang dijoin dengan table_users
    const sqlUser = `
    SELECT o.id, o.user_id, o.seller_id, o.product_id, o.product_name, o.total_amount, 
    o.detail_order, o.payment_photo, o.order_time, o.status, o.message_admin, u.username FROM table_orders o 
    JOIN table_users u ON o.seller_id = u.id OR o.user_id = u.id
    `
    conn.query(sqlUser, (err, result) => {
        if(err) return res.status(500).send(err)
    
        res.status(200).send(result)
    })
})

router.get('/report/count', auth,(req,res) => {
    const sqlSelect = `SELECT  date(order_time) as time , seller_id, product_name, COUNT(*) as 'total_jual'
    from table_transaction 
    where seller_id = ${req.user.id}
    GROUP BY product_name`
    conn.query(sqlSelect,(err,result) => {
        if(err) return res.status(500).send(err)
        res.status(200).send(result)
    })
})
// DELETE ORDER BY USER
router.post('/orders/:orders_id', auth, (req, res) => {
    const sqlUpdate = `UPDATE table_orders SET status=2 WHERE id = ${req.params.orders_id}`

    conn.query(sqlUpdate, (err, result) => {
        if (err) return res.status(500).send(err)

        const sqlInsertTrx = `
            INSERT INTO table_transaction(order_id, user_id, seller_id, product_id, product_name, total_amount, detail_order, order_time, status)
            SELECT id, user_id, seller_id, product_id, product_name, total_amount, detail_order, order_time, status FROM table_orders
            WHERE id = ${req.params.orders_id}
        `
        conn.query(sqlInsertTrx, (err, result) => {
            if (err) return res.status(500).send(err)

            // Menghapus data Order
            const sqlDelete = `DELETE FROM table_orders WHERE id = ${req.params.orders_id}`
            conn.query(sqlDelete, (err, result) => {
                if(err) return res.status(500).send(err)
                
                res.status(200).send({message:"Delete Success"})
            })  
        })
    })
})

// UPDATE STATUS ORDER (ACCEPTED BY SELLER)
router.get('/accepted/orders/:orders_id', auth, (req, res) => {
    const sqlUpdate = `UPDATE table_orders SET status=1 WHERE id = ${req.params.orders_id}`

    conn.query(sqlUpdate, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

router.get('/report/line',auth,(req,res) => {
    const sqlSelect = `SELECT date(finish_time) as time , seller_id, product_name, COUNT(product_name) as 'total_jual'
    from table_transaction 
    where seller_id = ${req.user.id}
    GROUP BY time, product_name 
    ORDER BY 1;`
    conn.query(sqlSelect,(err,result) => {
        if(err) return res.status(500).send(err)
        res.status(200).send(result)
    })
})

// UPDATE STATUS ORDER (REJECTED BY SELLER)
router.get('/rejected/orders/:orders_id', auth, (req, res) => {
    const sqlUpdate = `UPDATE table_orders SET status=2 WHERE id = ${req.params.orders_id}`

    conn.query(sqlUpdate, (err, result) => {
        if(err) return res.status(500).send(err)

        res.status(200).send(result)
    })
})

// UPLOAD BUKTI TRANSFER
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

const buktiTrxDirectory = path.join(__dirname, '../assets/payment_photos')

router.post('/orders/:orders_id/payment_photo', auth, upload.single('payment_photo'), async (req, res) => {

    try {
        const fileName = `${req.params.orders_id}-payment.png`
        const sqlUpdate = `UPDATE table_orders SET payment_photo = ? WHERE id = ${req.params.orders_id}`
        const data = [fileName, req.params.orders_id]

        await sharp(req.file.buffer).resize(300).png().toFile(`${buktiTrxDirectory}/${fileName}`)

        conn.query(sqlUpdate, data, (err, result) =>{
            if(err) return res.status(500).send(err)

            res.status(201).send({message: 'Bukti transfer berhasil di upload'})
        })
    } catch (err) {
        res.status(500).send(err.message)
    }
}, (err, req, res, next) => {
    res.send(err)
})

// UPLOAD ULANG BUKTI
router.post('/orders/repeat/:orders_id/payment_photo', auth, upload.single('payment_photo'), async (req, res) => {

    try {
        const fileName = `${req.params.orders_id}-payment.png`
        const sqlUpdate = `UPDATE table_orders SET payment_photo = ? , status=1 WHERE id = ${req.params.orders_id}`
        const data = [fileName, req.params.orders_id]

        await sharp(req.file.buffer).resize(300).png().toFile(`${buktiTrxDirectory}/${fileName}`)

        conn.query(sqlUpdate, data, (err, result) =>{
            if(err) return res.status(500).send(err)

            res.status(201).send({message: 'Bukti transfer berhasil di upload'})
        })
    } catch (err) {
        res.status(500).send(err.message)
    }
}, (err, req, res, next) => {
    res.send(err)
})

// UPDATE STATUS ORDER (FINISH BY SELLER)
router.get('/seller_finish/orders/:orders_id', auth, (req, res) => {
    const sqlUpdate = `UPDATE table_orders SET status=5 WHERE id = ${req.params.orders_id}`

    conn.query(sqlUpdate, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// UPDATE STATUS ORDER (FINISH BY USER)
router.get('/user_finish/orders/:orders_id', auth, (req, res) => {
    const sqlUpdate = `UPDATE table_orders SET status=6 WHERE id = ${req.params.orders_id}`

    conn.query(sqlUpdate, (err, result) => {
        if(err) return res.status(500).send(err)

            const sqlInsertTrx =`
                INSERT INTO table_transaction(order_id, user_id, seller_id, product_id, product_name, total_amount, detail_order, order_time, status)
                SELECT id, user_id, seller_id, product_id, product_name, total_amount, detail_order, order_time, status FROM table_orders
                WHERE id = ${req.params.orders_id}
            `
            conn.query(sqlInsertTrx, (err, result) => {
                if(err) return res.status(500).send(err)
    
                res.status(200).send({message: 'Transaksi selesai!'})
            })
    })
})

///////////////////////////////
///////// I N V O I C E  //////
//////////////////////////////

// READ INVOICE USER
router.get('/invoice/:user_id/:order_id', auth, (req, res) => {
    // Mengambil data dari table_order yang dijoin dengan table_users
    const sqlUser = `
    SELECT * FROM table_transaction WHERE order_id = ${req.params.order_id}
    `
    conn.query(sqlUser, (err, result) => {
        if(err) return res.status(500).send(err)
    
        res.status(200).send(result)
    })
})

module.exports = router
