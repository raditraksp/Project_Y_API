const mysql = require('mysql')

const conn = mysql.createConnection({


    user : "root",
    password : "Mysql123git add ",
    host :'localhost',
    database : "jasaja_db",
    port : 3306
})

module.exports = conn