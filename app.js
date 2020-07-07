const express = require('express')
const cors = require('cors')
const app = express()
const port = 2022

const userRouter = require('./src/router/userRouter')
const productRouter = require('./src/router/productRouter')
const adminRouter = require('./src/router/adminRouter')

app.use(cors())
app.use(express.json())

app.use(userRouter)
app.use(productRouter)
app.use(adminRouter)


app.get('/', (req, res) => {
    res.send({
        message : 'Akses berhasil'
    })
})

app.listen(port, () => console.log('API IS RUNNING AT ' + port))
