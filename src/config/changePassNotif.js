const nodemailer = require('nodemailer')
const dotenv = require('dotenv')
dotenv.config()

const changePassNotif = (name, email, userid, token) => {
    //CONFIG
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth : {
        type: 'OAuth2',
        user: 'javaeagle30@gmail.com',
        clientId : process.env.CLIENT_ID,
        clientSecret : process.env.CLIENT_SECRET,
        refreshToken : process.env.REFRESH_TOKEN
        },
        // jika err: self signed certificate in certificate chain
        tls: {
            rejectUnauthorized: false
        }
    })

    //MAIL
    const mail = {
        from : 'Java Eagle <javaeagle30@gmail.com',
      to: email,
      subject: 'Testing Nodemailer',
      html: `
          <h1>Hello,</h1>
            <h3><a href='http://localhost:3000/changePassword/${token}/${userid}'>Tekan Untuk mengganti password</h3>
            `
    }

    //SEND EMAIL

    transporter.sendMail(mail, (err, result) => {
        if(err) return console.log({Errornya: err.message})

        console.log('Email terkirim')
    })
}

module.exports = changePassNotif