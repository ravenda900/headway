import * as jwt from 'jsonwebtoken'
import * as passwordGenerator from 'generate-password'
import * as Stripe from 'stripe'

import app from '../app'
import { createAdmin } from '../actions'
import { PASSWORD_OPTS, JWT_ISSUER } from '../constants'
import { authAdmin, authStudent, authAdminInvite, hashPassword } from '../authentication'
import mailer from '../mailer'
import mail from '../mail'

import { Business, Card, Course, Mentor, Student, Unit, Admin, BusinessStudent, BusinessCourse, CourseStudent, Activity } from '../models'

const SERVER_STARTUP = new Date()

const stripe = new Stripe(process.env.STRIPE_SECRET)

const slack = require('slack-notify')(process.env.MY_SLACK_WEBHOOK_URL)

app.get('/status', (req, res) => {
  res.send(`<pre>Server started ${SERVER_STARTUP.toLocaleString()}`)
})

app.get('/user', (req, res) => {
  res.send(req.user)
})

app.get('/logout', (req, res) => {
  console.log(req, res)
  req.logout()
  res.redirect('/')
})

app.post('/login/admin', authAdmin, (req, res) => {
  res.send(req.user)
})

app.post('/register', (req, res) => {
  const password: string = passwordGenerator.generate(PASSWORD_OPTS)
  const data = {
    name: req.body.name,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    password,
  }
  createAdmin(data).then(admin => {
    // Send confirmation email
    const token = jwt.sign({
      sub: admin.id,
      name: admin.name,
      firstName: req.body.first_name,
      email: admin.email,
      iss: JWT_ISSUER,
      userType: 'admin',
      aud: 'invite',
    }, process.env.JWT_SECRET)

    console.log('\n\n')
    console.log('http://localhost:5000/confirm?token=' + token)
    console.log('\n\n')

    const mailData = {
      token,
      name: data.name,
      first_name: req.body.first_name,
    }
    mailer.messages().send({
      to: admin.email,
      from: mail.FROM,
      subject: mail.welcome.subject(admin.name),
      text: mail.welcome.text(mailData),
      html: mail.welcome.html(mailData),
    }, (error, body) => {
      if (error) {
        console.warn(error)
      }
    })

    // Create stripe subscription
    stripe.customers.create({
      email: admin.email
    }).then(customer => {
      const subscription = stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: process.env.STRIPE_PLAN }],
        trial_period_days: 30,
      })
      admin.stripe_cust_id = customer.id
      return admin.save()
    })

    // slack.alert({
    // text: 'New Admin registration',
    // fields: {
    // 'Name': req.body.first_name + ' ' + req.body.last_name,
    // 'Email': admin.email,
    // 'Organisation': admin.name
    // }
    // })

    return Business.create({
      adminId: admin.id,
      name: admin.name,
    }).then(business => {
      res.send(admin)
    })
  }).catch(err => {
    console.warn(err)
    res.status(500).send({ message: 'Could not register' })
  })
})

const sendPasswordResetEmail = (user) => {
  console.log('Send email to ', user.userType)
  const token = jwt.sign({
    sub: user.id,
    name: user.name || user.first_name,
    email: user.email,
    iss: JWT_ISSUER,
    userType: user.userType,
    aud: 'invite', // WARNING: should be reset-password? sharing passport strategy though...
  }, process.env.JWT_SECRET)

  console.log('http://localhost:5000/reset-password?token=' + token)
  const mailData = {
    token,
  }
  mailer.messages().send({
    to: user.email,
    from: mail.FROM,
    subject: mail.resetPassword.subject,
    text: mail.resetPassword.text(mailData),
    html: mail.resetPassword.html(mailData),
  }, (error, body) => {
    if (error) {
      console.warn(error)
    }
  })
}

app.post('/forgot-password', (req, res) => {
  const { email } = req.body
  Admin.findOne({ where: { email } }).then(admin => {
    if (admin) {
      sendPasswordResetEmail(admin)
      res.send({ success: true, message: 'Reset email sent' })
    } else {
      Student.findOne({ where: { email } }).then(student => {
        if (student) {
          sendPasswordResetEmail(student)
          res.send({ success: true, message: 'Reset email sent' })
        } else {
          res.send({ success: false, message: 'Account not found' })
        }
      })
    }
  })
})

app.get('/password-reset-failed', (req, res) => {
  res.send('Password Reset Failed')
})

app.put('/update-admin-details', authAdminInvite, (req, res) => {
  (async () => {
    const admin = await Admin.findByPk(req.user.id)

    const { password } = req.body
    admin.password = await hashPassword(password)

    await admin.save()
    res.send(admin)
  })()
})

app.post('/login/student', authStudent, (req, res) => {
  res.send(req.user)
})

app.post('/stripe/hook', (req, res, next) => {
  const {id, type, data} = req.body
  console.log('stripe hook', id, type)
  res.sendStatus(200)
})
