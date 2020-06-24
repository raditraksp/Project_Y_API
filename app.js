const express = require('express')
const cors = require('cors')
const app = express()
const port = 2022

const userRouter = require('./public/src/router/userRouter')

app.use(cors())
app.use(express.json())
app.use(userRouter)


app.get('/', (req, res) => {
    res.send({
        message : 'Akses berhasil'
    })
})

app.listen(port, () => console.log('API IS RUNNING AT ' + port))
