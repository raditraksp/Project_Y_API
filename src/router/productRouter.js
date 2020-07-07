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
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription, p.created_at 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id 
    WHERE p.status = 1 GROUP BY p.id ORDER BY created_at DESC`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ ALL PRODUCTS BY PREMIUM SELLER PAGE
router.get('/products/premiumseller', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription , pc.category_id 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id LEFT JOIN table_product_categories pc ON pc.product_id = p.id
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

// READ PRODUCTS BY BEST RATING LIMIT 5 HOME
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
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription, pc.category_id 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id LEFT JOIN table_product_categories pc ON pc.product_id = p.id
    WHERE p.status = 1 GROUP BY p.id ORDER BY rating_avg DESC`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ PRODUCTS TERPOPULER
router.get('/products/popularproducts', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription, pc.category_id 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id LEFT JOIN table_product_categories pc ON pc.product_id = p.id
    WHERE p.status = 1 GROUP BY p.id ORDER BY product_total DESC`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ TOTAL TERJUAL
router.get('/product/sold/:product_id', (req, res) => {
    const sqlSelect = `
    select p.id, count(t.product_id) as 'product_sold' 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id
    left join table_transaction t on t.product_id = p.id
    WHERE (p.status = 1 or t.status=6) and p.id=${req.params.product_id} group by p.id order by product_sold desc`

    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ TOTAL PRODUCT DIBERI RATING
router.get('/product/ratingcount/:product_id', (req, res) => {
    const sqlSelect = `
    SELECT p.id, count(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', r.feedback, p.status
    FROM table_ratings r right join table_products p on r.product_id = p.id where p.id=${req.params.product_id} and p.status=1 group by p.id`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// READ PRODUCTS TERPOPULER HOME
router.get('/products/popularproducts/home', (req, res) => {
    const sqlSelect = `
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', p.price_basic, p.product_photo, p.status, u.username, u.status_subscription, pc.category_id 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id LEFT JOIN table_product_categories pc ON pc.product_id = p.id
    WHERE p.status = 1 GROUP BY p.id ORDER BY product_total DESC LIMIT 5`

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
    SELECT p.id, p.product, p.user_id, p.rating_id, COUNT(r.product_id) as 'product_total', FORMAT(AVG(r.rating),1) as 'rating_avg', COUNT(t.product_id) as 'product_terjual', p.price_basic, p.detail_product, p.price_premium, p.detail_basic, p.detail_premium, p.product_photo, p.status, u.username, u.email, u.status_subscription 
    FROM table_products p LEFT JOIN table_users u ON p.user_id=u.id LEFT JOIN table_ratings r ON p.id=r.product_id LEFT JOIN table_transaction t ON t.product_id = p.id
    WHERE p.status = 1 AND p.id = ${req.params.product_id} GROUP BY p.id`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result[0])
    })
})

// SEARCH CATEGORY
router.get('/product/search/category', (req, res) => {
    const sqlSelect = `
    select product_id, pc.category_id, category, product, p.user_id, detail_basic, detail_product, detail_premium, price_basic, price_premium, product_photo, status
    from table_product_categories pc join table_categories c on pc.category_id = c.id join table_products p on pc.product_id = p.id where status=1`
    conn.query(sqlSelect, (err, result) => {
        if(err) return res.status(500).send(err)
        
        res.status(200).send(result)
    })
})

// SEARCH CATEGORY BY ID CATEGORY
router.get('/categorysearch/:cat_id', (req, res) => {
    const sqlSelect = `
    select p.id, pc.category_id, category, product, p.user_id, detail_basic, detail_product, detail_premium, price_basic, price_premium, product_photo, status
    from table_product_categories pc join table_categories c on pc.category_id = c.id join table_products p on pc.product_id = p.id where status=1 AND pc.category_id = ${req.params.cat_id}`
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
SELECT pc.id, pc.product_id, c.category, pc.category_id FROM table_product_categories pc join 
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




router.get('/product/search/category', (req, res) => {
    const sqlSelect = `
    select pc.id, pc.product_id, u.username, pc.category_id, category, product, p.user_id, detail_basic, detail_product, detail_premium, price_basic, price_premium, product_photo, status
    from table_product_categories pc join table_categories c on pc.category_id = c.id join table_products p on pc.product_id = p.id join table_users u on p.user_id=u.id where status=1`
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

// GET RATING USER
router.get('/product/ratings/:product_id/:order_id', auth, (req, res) => {
    
    const sqlInsert = `
    SELECT * FROM table_ratings WHERE user_id = ${req.user.id} AND product_id = ${req.params.product_id} AND order_id = ${req.params.order_id}
    `
    conn.query(sqlInsert, (err, result) => {
        if (err) return res.status(500).send(err)

        res.status(200).send({result})
    })
})  

// ADD RATING USER
router.post('/product/addrating/:product_id/:order_id', auth, (req, res) => {
    
    const sqlInsert = `
    INSERT INTO table_ratings 
    SET feedback = ? , rating = ?, order_id=${req.params.order_id}, user_id = ${req.user.id}, product_id = ${req.params.product_id}
    `
    const data = [req.body.message, req.body.rating]

    conn.query(sqlInsert, data, (err, result) => {
        if (err) return res.status(500).send(err)

        res.status(200).send({message: "Pembayaran berhasil ditolak!"})
    })
})

module.exports = router
