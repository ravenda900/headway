require('dotenv').config()

import app from './app'
import connection from './connection'

import './routes/public'
import './routes/admin'
import './routes/student'
import './routes/rest'
import './routes/mentor'
import { PORT } from './constants'
import { Logger } from './logger'

const startServer = () => {
  const server = app.listen(PORT)
  server.setTimeout(500000)
  Logger.info(`headway started @ ${(new Date()).toLocaleString()}\nhttp://localhost:${PORT}\n`)
}

const debug = async () => {
}

connection.sync().then(() => {
  // debug()
  startServer()
})
