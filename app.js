const express = require('express')
const cors = require('cors')
const app = express()
const port = 2022

const userRouter = require('./src/router/userRouter')
const productRouter = require('./src/router/productRouter')
const authRouter = require('./src/router/authRouter')

app.use(cors())
app.use(express.json())

app.use(userRouter)
app.use(productRouter)
app.use(authRouter)


app.get('/', (req, res) => {
    res.send({
        message : 'Akses berhasil'
    })
})

app.listen(port, () => console.log('API IS RUNNING AT ' + port))
