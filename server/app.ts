// Dependencies
import * as path from 'path'
import * as express from 'express'
import * as exphbs from 'express-handlebars'
import * as passport from 'passport'
import * as epilogue from 'epilogue'
import * as bodyParser from 'body-parser'
import { SESSION_CONFIG } from './constants'
import * as httpsRedirect from 'express-https-redirect'

const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)

// Init Express Server
const app = express()
import connection from './connection'

// View Engine
const hbs = exphbs.create({})
app.set('views', __dirname + '/views')
app.set('view engine', 'handlebars')
app.engine('handlebars', hbs.engine)

// Middleware
import { cors } from './middleware'
import { checkAdminLogin, checkStudentLogin } from './authentication'
const staticRoute = express.static(path.resolve('./dist'))
app.use('/', httpsRedirect())

app.use(session({
  secret: SESSION_CONFIG.secret,
  store: new SequelizeStore({
    db: connection
  }),
  resave: false, // we support the touch method so per the express-session docs this should be set to false
  proxy: true // if you do SSL outside of node.
}))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(require('express-fileupload')())
app.use(passport.initialize())
app.use(passport.session())
app.use(cors)

app.use('/landing', express.static(path.resolve('./landing')))
app.use('/invite*', staticRoute)
app.use('/confirm*', staticRoute)
app.use('/reset-password*', staticRoute)
app.use('/l/:userType', staticRoute)

// Student
app.use('/app', checkStudentLogin)
app.use('/app*', staticRoute)

// Admin
app.use('/dashboard', checkAdminLogin)
app.use('/dashboard', staticRoute)
app.use('/c/*', checkAdminLogin)
app.use('/c/*', staticRoute)
app.use('/s/*', checkAdminLogin)
app.use('/s/*', staticRoute)
app.use('/b/*', checkAdminLogin)
app.use('/b/*', staticRoute)

app.get('/', (req, res) => {
  res.render('index')
})

app.use('/assets', express.static(path.resolve('./dist/assets')))
app.use('/static', staticRoute)

epilogue.initialize({ app, sequelize: connection })

export default app
