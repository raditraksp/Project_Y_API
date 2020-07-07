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
    const sqlSelect = `SELECT  date(order_time) as time , seller_id, product_name, COUNT(product_name) as 'total_jual'
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

router.delete('/user_finish/orders/:orders_id', auth, (req, res) => {
    const sqlDelete = `DELETE FROM table_orders WHERE id = ${req.params.orders_id}`
    conn.query(sqlDelete, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send({message:"Delete Success"})
    })  
})

///////////////////////////////
///////// I N V O I C E  //////
//////////////////////////////

// READ INVOICE USER
router.get('/invoice/:user_id/:order_id', auth, (req, res) => {
    // Mengambil data dari table_order yang dijoin dengan table_users
    const sqlUser = `
    SELECT t.* , u.username FROM table_transaction t JOIN table_users u ON seller_id = u.id WHERE order_id = ${req.params.order_id}
    `
    conn.query(sqlUser, (err, result) => {
        if(err) return res.status(500).send(err)
        
        
        res.status(200).send(result)
    })
    
})


module.exports = router