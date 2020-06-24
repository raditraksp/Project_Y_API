const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()

const verifSendEmail = (name, email, userid) => {
   // Config
   // Config
   const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth : {
      type: 'OAuth2',
      user: 'javaeagle30@gmail.com',
      clientId : process.env.CLIENT_ID,
      clientSecret : process.env.CLIENT_SECRET,
      refreshToken : process.env.REFRESH_TOKEN
      }
  })
  
  // Mail
  const mail = {
      from : 'Java Eagle <javaeagle30@gmail.com',
      to: email,
      subject: 'Testing Nodemailer',
      html: `
          <h1>Hello, ${name}</h1>
          <h2><a href='http://localhost:2022/verify/${userid}' >Tekan untuk verifikasi</a></h1>
      `
  }
  
  // Send Email
  
  transporter.sendMail(mail, (err, result) => {
      if(err) return console.log({errorgan: err.message})
  
      console.log('Email terkirim')
  }) 

}

module.exports = verifSendEmail