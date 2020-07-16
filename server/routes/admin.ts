import { createCourse, inviteStudent } from '../actions'
import app from '../app'
import { checkAdminLogin, checkAdminPermission, mockAdminLogin } from '../authentication'
import { Logger } from '../logger'
import { Admin, Business, BusinessCourse, Card, Course, CourseStudent, Student, Unit, BusinessStudent, Activity, Notification } from '../models'
import { getSignedUrl, createPresignedPost, s3 } from '../s3'
import { S3_BUCKET, UPLOAD_DIRECTORY, PUSHER } from '../constants'
import { get } from 'lodash'
import * as Stripe from 'stripe'

import * as fs from 'fs'

const stripe = new Stripe(process.env.STRIPE_SECRET)

if (!fs.existsSync(UPLOAD_DIRECTORY)) {
  fs.mkdirSync(UPLOAD_DIRECTORY)
}

if (process.env.MOCK_AUTH) {
  Logger.warn('WARNING: Mock Admin Auth enabled for /admin and /api')
  app.use('/admin*', mockAdminLogin)
  app.use('/api*', mockAdminLogin)
} else {
  app.use('/admin*', checkAdminLogin)
}

// Overview

app.get('/admin', (req, res) => {
  const adminId = req.user.admin.id
  Admin.findByPk(adminId, {
    include: [
      {
        model: Business,
        include: [
          Student.scope('public')
        ]
      },
      {
        model: Course,
        include: [
          // Student.scope('public'),
          Unit
        ]
      }
    ]
  }).then(admin => {
    res.send(admin)
  })
})

app.get('/admin/subscription', (req, res) => {
  const adminId = req.user.admin.id
  Admin.findByPk(adminId).then(admin => {
    if (admin.stripe_cust_id) {
      stripe.customers.retrieve(admin.stripe_cust_id, (err, customer) => {
        const status = get(customer, 'subscriptions.data[0].status')
        admin.stripe_subscription_status = status
        admin.save()
        res.send(customer)
      })
    } else {
      res.send({ message: 'No subscription data' })
    }
  })
})

app.post('/admin/subscription', (req, res) => {
  const adminId = req.user.admin.id
  const { token } = req.body
  console.log(token)
  Admin.findByPk(adminId).then(admin => {
    if (admin.stripe_cust_id) {
      stripe.customers.retrieve(admin.stripe_cust_id, (err, customer) => {
        const subscription_id = get(customer, 'subscriptions.data[0].id')
        console.log('Updating trial end:', subscription_id)
        stripe.subscriptions.update(subscription_id, {
          trial_end: 'now',
        }).then(() => {
          console.log('OK')
        })
      })

      stripe.customers.update(admin.stripe_cust_id, {
        source: token,
      }).then(() => {
        res.send('OK')
      })
    } else {
      res.send({ message: 'No subscription data' })
    }
  })
})

// Courses

app.get('/admin/course', (req, res) => {
  Admin.findByPk(req.user.admin.id, {
    include: [
      { model: Course, include: [Unit] }
    ]
  }).then(admin => {
    res.send(admin.courses)
  })
})

app.post('/admin/course', (req, res) => {
  const { name, businessIds = [] } = req.body
  Admin.findByPk(req.user.admin.id, { include: [Business] }).then(admin => {
    const ids = admin.businesses.map(d => d.id)
    for (const id of businessIds) {
      if (ids.indexOf(id) === -1) {
        res.status(401).send({ message: 'Unauthorized: Admin does not own Business #' + id })
        return
      }
    }
    createCourse(req.user.admin.id, name, businessIds).then(course => {
      res.send(course)
    })
  })
})

app.get('/admin/course/:courseId', checkAdminPermission, (req, res) => {
  Course.findByPk(req.params.courseId, { include: [Student, Business, Unit] }).then(course => {
    res.send(course)
  })
})


// Units

app.post('/admin/unit', checkAdminPermission, (req, res) => {
  const { name, courseId } = req.body
  Unit.create({ name, courseId }).then(unit => {
    res.send(unit)
  })
})

app.get('/admin/unit/:unitId', (req, res) => {
  const { unitId } = req.params
  Unit.findByPk(unitId, { include: [Card, Course] }).then(unit => {
    if (unit && unit.course.adminId === req.user.admin.id) {
      res.send(unit)
    } else {
      res.status(401).send({ message: 'Unauthorized: Admin does not own Unit #' + unitId })
    }
  })
})


// Cards

app.post('/admin/unit/:unitId/card', (req, res) => {
  const { unitId, name } = req.body
  Unit.findByPk(unitId, { include: [Course] }).then(unit => {
    if (unit.course.adminId === req.user.admin.id) {
      Card.create({ unitId, name }).then(card => {
        res.send(card)
      })
    }
    else {
      res.status(401).send({ message: 'Unauthorized: Admin does not own Unit #' + unitId })
    }
  })
})

app.post('/s3-policy', (req, res) => {
  const {cardId, file, format} = req.query
  const Key = `${cardId}/${file}`
  // console.log(req.query)
  // console.log('----')
  Card.findByPk(cardId, { include: [{ model: Unit, include: [Course] }] }).then(card => {
    if (card && card.unit.course.adminId === req.user.admin.id) {
      createPresignedPost(Key).then(d => {
        // console.log(d)
        if (format === 'video') {
          card.video = file
        } else if (format === 'audio') {
          card.audio = file
        } else {
          card.media = file
        }
        card.save()
        // map to format required here: https://rowanwins.github.io/vue-dropzone/docs/dist/#/aws-s3-upload
        res.send({
          signature: d.fields,
          postEndpoint: d.url,
        })
      }).catch(err => {
        res.status(500).send({ message: err })
      })
    } else {
      res.status(401).send({ message: 'Unauthorized: Admin does not own Card #' + cardId })
    }
  })
})

app.post('/admin/upload/:format', (req, res) => {
  const { format } = req.params
  const { cardId } = req.body
  const { file } = req.files
  Card.findByPk(cardId, { include: [{ model: Unit, include: [Course] }] }).then(card => {
    if (card && card.unit.course.adminId === req.user.admin.id) {
      const Key = card.id + '/' + file.name
      const params = {
        Bucket: S3_BUCKET,
        Key,
        Body: file.data
      }
      s3.putObject(params, (err) => {
        if (err) {
          Logger.error(`Failed to upload file to ${S3_BUCKET}/${Key}`)
        } else {
          if (format === 'video') {
            card.video = file.name
          } else if (format === 'audio') {
            card.audio = file.name
          } else {
            card.media = file.name
          }
          card.save()
          Logger.debug(`Successfully uploaded file to ${S3_BUCKET}/${Key}`)
          res.send('Uploaded')
        }
      })
    }
    else {
      res.status(401).send({ message: 'Unauthorized: Admin does not own Card #' + cardId })
    }
  })
})


// Students

app.post('/admin/student', (req, res) => {
  const { email, first_name, last_name, businessIds = [] } = req.body
  Admin.findByPk(req.user.admin.id, { include: [Business] }).then(admin => {
    const ids = admin.businesses.map(d => d.id)
    for (const id of businessIds) {
      if (ids.indexOf(id) === -1) {
        res.status(401).send({ message: 'Unauthorized: Admin does not own Business #' + id })
        return
      }
    }
    inviteStudent({ email, first_name, last_name }, businessIds, admin.name).then(result => {
      Business.findAll({ where: { id: businessIds } })
        .then(businesses => {
          const businessNames = businesses.map(b => '<strong>' + b.name + '<strong>')
          Notification.create({
            message: 'You have been added to ' + businessNames.join(', ') + ' business' + (businessNames.length > 1 ? 'es' : ''),
            studentId: result.id
          }).then(notification => {
            PUSHER.trigger('headway', `studentId:${result.id}`, {
              notification
            })
          })
        })
      res.send(result)
    }).catch(err => {
      Logger.warn(err)
      res.status(500).send({ message: 'Could not invite Student' })
    })
  })
})

app.get('/admin/student', (req, res) => {
  Admin.findByPk(req.user.admin.id, {
    include: [
      {
        model: Business,
        include: [Student.scope('public')]
      }
    ]
  }).then(admin => {
    res.send(admin.getStudents())
  })
})

app.get('/admin/student/:studentId', checkAdminPermission, (req, res) => {
  const adminId = req.user.admin.id
  Student.scope('public').findByPk(req.params.studentId, {
    include: [
      { model: Course, where: { adminId }, required: false },
      { model: Business, where: { adminId } },
    ]
  }).then(student => {
    res.send(student)
  })
})

app.get('/admin/student/:studentId/activity', checkAdminPermission, (req, res) => {
  const { studentId } = req.params
  const adminId = req.user.admin.id
  Activity.findAll({ where: { studentId, adminId } }).then(activities => {
    res.send(activities.reverse())
  })
})

app.get('/admin/student/:studentId/progress', (req, res) => {
  const adminId = req.user.admin.id
  Student.scope('public').findByPk(req.params.studentId, {
    include: [
      {
        model: Course,
        where: { adminId },
        required: false,
        include: [Unit]
      },
    ]
  }).then(student => {
    if (!student.courses) {
      return res.send([])
    }
    const data = student.courses.map(course => {
      const { CourseStudent } = course.toJSON()
      return {
        id: course.id,
        name: course.name,
        numberOfUnits: course.units.length,
        numberOfCompletedUnits: CourseStudent.completedUnits,
      }
    })
    res.send(data)
  })
})

app.delete('/admin/student/:studentId', checkAdminPermission, (req, res) => {
  const { studentId } = req.params
  const adminId = req.user.admin.id
  Student.scope('public').findByPk(studentId, {
    include: [
      { model: Course, where: { adminId }, required: false },
      { model: Business, where: { adminId } },
    ]
  }).then(student => {
    Promise.all([
      ...student.businesses.map(business => BusinessStudent.destroy({ where: { studentId, businessId: business.id, } })),
      ...student.courses.map(course => CourseStudent.destroy({ where: { studentId, courseId: course.id, } })),
    ]).then(results => {
      const businessNames = student.businesses.map(b => '<strong>' + b.name + '<strong>')
      Notification.create({
        message: 'You have been removed to ' + businessNames.join(', ') + ' business' + (businessNames.length > 1 ? 'es' : ''),
        studentId: student.id
      }).then(notification => {
        PUSHER.trigger('headway', `studentId:${student.id}`, {
          notification
        })
      })
      res.send('OK')
    })
  })
})

app.post('/admin/student-course', checkAdminPermission, (req, res) => {
  const { studentId, courseIds = [] } = req.body
  Admin.findByPk(req.user.admin.id, { include: [Course] }).then(admin => {
    const adminCourseIds = admin.courses.map(course => course.id)
    const promises = courseIds.map(courseId => {
      if (adminCourseIds.indexOf(parseInt(courseId)) === -1) {
        return res.status(401).send({ message: 'Unauthorized: Admin does not own Course' })
      }
      return CourseStudent.findOrCreate({
        where: {
          studentId,
          courseId,
        }
      })
    })
    Promise.all(promises).then(studentCourses => {
      Course.findAll({ where: { id: courseIds } }).then(courses => {
        const courseNames = courses.map(c => '<strong>' + c.name + '</strong>')
        Notification.create({
          message: 'You have been added to ' + courseNames.join(', ') + ' course' + (courseNames.length > 1 ? 's' : ''),
          studentId: studentId
        }).then(notification => {
          PUSHER.trigger('headway', `studentId:${studentId}`, {
            notification
          })
        })
      })
      res.send('OK')
    })
  })
})

app.delete('/admin/student-course', checkAdminPermission, (req, res) => {
  const { studentId, courseId } = req.body

  Course.findByPk(courseId).then(course => {
    CourseStudent.destroy({ where: { studentId, courseId, } }).then(result => {
      Notification.create({
        message: 'You have been removed from <strong>' + course.name + '</strong> course',
        studentId: studentId
      }).then(notification => {
        PUSHER.trigger('headway', `studentId:${studentId}`, {
          notification
        })
      })
      res.send('OK')
    })
  })
})

app.post('/admin/student-business', checkAdminPermission, (req, res) => {
  const { studentId, businessIds = [] } = req.body
  Admin.findByPk(req.user.admin.id, { include: [Business] }).then(admin => {
    const adminBusinessIds = admin.businesses.map(business => business.id)
    const promises = businessIds.map(businessId => {
      if (adminBusinessIds.indexOf(parseInt(businessId)) === -1) {
        return res.status(401).send({ message: 'Unauthorized: Admin does not own Business' })
      }
      return BusinessStudent.findOrCreate({
        where: {
          studentId,
          businessId,
        }
      })
    })
    Promise.all(promises).then(studentBusinesses => {
      Business.findAll({ where: { id: businessIds } }).then(businesses => {
        const businessNames = businesses.map(b => '<strong>' + b.name + '</strong>')
        Notification.create({
          message: 'You have been added to ' + businessNames.join(', ') + ' business' + (businessNames.length > 1 ? 'es' : ''),
          studentId: studentId
        }).then(notification => {
          PUSHER.trigger('headway', `studentId:${studentId}`, {
            notification
          })
        })
      })
      res.send(studentBusinesses)
    })
  })
})

app.delete('/admin/student-business', checkAdminPermission, (req, res) => {
  const { studentId, businessId } = req.body
  Business.findByPk(businessId, { include: [Course] }).then(business => {
    BusinessStudent.destroy({ where: { studentId, businessId, } }).then(result => {
      Notification.create({
        message: 'You have been removed from <strong>' + business.name + '</strong> business',
        studentId: studentId
      }).then(notification => {
        PUSHER.trigger('headway', `studentId:${studentId}`, {
          notification
        })
      })
      res.send('OK')
    })
  })
})



app.post('/admin/business-course', checkAdminPermission, (req, res) => {
  const { courseIds = [], businessId } = req.body
  Admin.findByPk(req.user.admin.id, { include: [Business] }).then(admin => {
    const promises = courseIds.map(courseId => {
      // const adminBusinessIds = admin.businesses.map(business => business.id)
      // if (adminBusinessIds.indexOf(parseInt(businessId)) === -1) {
      //   return res.status(401).send({ message: 'Unauthorized: Admin does not own Business' })
      // }
      return BusinessCourse.findOrCreate({
        where: {
          courseId,
          businessId,
        }
      })
    })
    Promise.all(promises).then(studentBusinesses => {
      Business.findByPk(businessId, {
        include: [
          {
            model: Student.scope('public'),
          },
          Course
        ]
      }).then(business => {
        const courseNames = business.courses.map(c => '<strong>' + c.name + '</strong>')
        business.students.forEach(student => {
          Notification.create({
            message: courseNames.join(', ') + ' course' + (courseNames.length > 1 ? 's are ' : ' is ') + 'added to <strong>' + business.name + '</strong> business',
            studentId: student.id
          }).then(notification => {
            PUSHER.trigger('headway', `studentId:${student.id}`, {
              notification
            })
          })
        })
      })
      res.send('OK')
    })
  })
})

app.delete('/admin/business-course', checkAdminPermission, (req, res) => {
  const { courseId, businessId } = req.body
  Business.findByPk(businessId, {
    include: [
      {
        model: Student.scope('public'),
      },
      Course
    ]
  }).then(business => {
    BusinessCourse.destroy({ where: { courseId, businessId, } }).then(result => {
      const course = business.courses.find(c => c.id === courseId)

      business.students.forEach(student => {
        Notification.create({
          message: '<strong>' + course.name + '</strong> has been removed from <strong>' + business.name + '</strong> business',
          studentId: student.id
        }).then(notification => {
          PUSHER.trigger('headway', `studentId:${student.id}`, {
            notification
          })
        })
      }) 
      res.send('OK')
    })
  })
})



// Businesses

app.post('/admin/business', (req, res) => {
  const adminId = req.user.admin.id
  const { name, courseIds = [] } = req.body
  Business.create({ name, adminId }).then(business => {
    const businessId = business.id
    Admin.findByPk(adminId, { include: [Course] }).then(admin => {
      for (const courseId of courseIds) {
        if (admin.ownsCourse(courseId)) {
          BusinessCourse.create({ courseId, businessId })
        } else {
          console.warn(`Admin does not own Course #${courseId}`)
        }
      }
    })
    res.send(business)
  })
})

app.get('/admin/business', (req, res) => {
  const adminId = req.user.admin.id
  Admin.findByPk(adminId, { include: [{ model: Business }] }).then(admin => {
    res.send(admin.businesses)
  })
})

app.get('/admin/business/:businessId', checkAdminPermission, (req, res) => {
  Business.findByPk(req.params.businessId, {
    include: [
      {
        model: Student.scope('public'),
        include: [Course]
      },
      Course,
    ]
  }).then(business => {
    res.send(business)
  })
})

app.get('/admin/card/:cardId/:format', checkAdminPermission, (req, res) => {
  const { cardId, format } = req.params
  Card.scope('includeCourse').findByPk(cardId).then(card => {
    let filename = card.media // default
    if (format === 'video') {
      filename = card.video
    } else if (format === 'audio') {
      filename = card.audio
    }
    const Key = `${cardId}/${filename}`
    getSignedUrl(Key).then(url => {
      res.send(url)
    })
  })
})

app.delete('/admin/card/:cardId/:format', checkAdminPermission, (req, res) => {
  const { cardId, format } = req.params

  Card.scope('includeCourse').findByPk(cardId).then(card => {
    let filename
    if (format === 'video') {
      filename = card.video
    } else if (format === 'audio') {
      filename = card.audio
    }
    const Key = `${cardId}/${filename}`
    // Logger.debug(`S3 deleteObject ${Key} request`)
    const params = {
      Bucket: S3_BUCKET,
      Key,
    }
    s3.deleteObject(params, (err, data) => {
      if (err) {
        console.warn(err)
      }
      // Logger.debug(`S3 deleteObject ${Key} success`)
    })
    if (format === 'video') {
      card.video = null
    } else if (format === 'audio') {
      card.audio = null
    }
    card.save()
    res.send('OK')
  })
})


app.post('/admin/student/activity', (req, res) => {
  const { text, studentId } = req.body
  Activity.create({
    studentId,
    text,
    adminId: req.user.admin.id,
  }).then(activity => {
    res.send(activity)
  })
})
