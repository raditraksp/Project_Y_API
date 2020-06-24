const express = require('express')
const cors = require('cors')
const app = express()
const port = 2022
const conn = require('./config/db')
const isEmail = require('validator/lib/isEmail')
const bcrypt = require('bcrypt')
const jwt = require('./config/token')
const path = require('path')
const auth = require('./config/auth')
const multer = require('multer')
const sharp = require('sharp')
const shortid = require('shortid')

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
   res.status(200).send('<h1>API IS RUNNING AT 2020</h1>')
})

// REGISTER


app.listen(port, () => console.log('API is Running at ' + port))
