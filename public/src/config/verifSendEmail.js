const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()

const verifSendEmail = (name, email, userid) => {
   // Config
   const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth : {
         type: 'OAuth2',
         user: 'rochafi.teach@gmail.com',
         clientId : process.env.CLIENT_ID,
         clientSecret : process.env.CLIENT_SECRET,
         refreshToken : process.env.REFRESH_TOKEN
      }
   })

   // Mail
   const mail = {
      from : 'Rochafi Teach <rochafi.teach@gmail.com',
      to: email,
      subject: 'Testing Nodemailer',
      html: `
         <h1>Hallo, ${name}</h1>
         <h3><a href='http://localhost:2020/verify/${userid}' >Tekan untuk verifikasi</a></h3>   
      `
   }

   // Send Email
   transporter.sendMail(mail, (err, result) => {
      if(err) return console.log({errornich: err.message})

      console.log('Email terkirim')
   })
}

module.exports = verifSendEmail