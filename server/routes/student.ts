import app from '../app'

import { checkStudentLogin, authStudent, checkStudentEnrolled, mockStudentLogin, authStudentInvite, hashPassword } from '../authentication'

import { Course, Student, Card, Unit, Business, Activity, Admin, Notification } from '../models'
import { getStudentActivitiesByUnit, studentUnitProgress, incrementCompletedUnits } from '../actions'
import { Logger } from '../logger'
import { getSignedUrl } from '../s3'

if (process.env.MOCK_AUTH) {
  Logger.warn('WARNING: Mock Student Auth enabled for /student')
  app.use('/student*', mockStudentLogin)
} else {
  app.use('/student*', checkStudentLogin)
}

app.get('/student', (req, res) => {
  Student.scope('public').findByPk(req.user.student.id, {
    include: [
      {
        model: Business,
        include: [Admin.scope('public')],
      },
      {
        model: Course,
        include: [Unit],
      },
      {
        model: Notification
      }
    ]
  }).then(student => res.send(student))
})

app.put('/update-student-details', authStudentInvite, (req, res) => {
  (async () => {
    const student = await Student.findByPk(req.user.id)

    const { first_name, last_name, password } = req.body
    student.first_name = first_name
    student.last_name = last_name
    student.lastLoggedIn = new Date()

    if (password) {
      student.password = await hashPassword(password)
    }

    await student.save()
    res.send(student)
  })()
})

app.get('/student/course/:courseId', checkStudentEnrolled, (req, res) => {
  Course.findByPk(req.params.courseId, {
    include: [
      { model: Unit, include: [Card] }
    ]
  }).then(course => {
    course.units.forEach(unit => {
      if (unit.sortOrder && unit.cards) {
        const sortOrder = JSON.parse(unit.sortOrder)
        unit.cards = unit.cards.sort((a, b) => {
          return sortOrder.findIndex(d => d === a.id) - sortOrder.findIndex(d => d === b.id)
        })
      }
    })
    res.send(course)
  })
})

app.get('/student/activity', (req, res) => {
  const studentId = req.user.student.id
  Activity.findAll({
    where: {
      studentId,
    },
  }).then(activities => {
    res.send(activities)
  })
})

app.post('/student/activity', (req, res) => {
  const { text } = req.body
  const studentId = req.user.student.id
  console.warn('Need to supply adminId to create an Activity')
  Activity.create({
    studentId,
    text,
  }).then(activity => {
    res.send(activity)
  })
})

app.get('/student/unit/:unitId/progress', (req, res) => {
  const studentId = req.user.student.id
  const { unitId } = req.params
  studentUnitProgress(unitId, studentId).then(progress => {
    res.send(progress)
  })
})

app.post('/student/card/:cardId/submit', (req, res) => {
  const studentId = req.user.student.id
  const { cardId } = req.params
  const { completed } = req.body
  Card.scope('includeCourse').findByPk(cardId).then(card => {
    if (!card) {
      return res.status(404)
    }
    if (completed) {
      Activity.findOne({
        where: {
          studentId,
          cardId,
          completed,
        }
      }).then(activity => {
        if (activity) {
          res.send('Card already completed')
        } else {
          const text = `completed ${card.name}`
          Activity.create({
            studentId,
            cardId,
            completed,
            text,
            adminId: card.unit.course.adminId,
          }).then(activity => {
            studentUnitProgress(card.unit.id, studentId).then(progress => {
              if (progress.unitCompleted) {
                incrementCompletedUnits(card.unit.course.id, studentId).then(result => {
                  res.send('Unit completed')
                })
              } else {
                res.send('OK')
              }
            })
          })
        }
      })
    }
    else {
      // Log user attempted card but failed
      const text = `Attempted ${card.name}`
      Activity.create({
        studentId,
        cardId,
        completed,
        text,
        adminId: card.unit.course.adminId,
      }).then(activity => {
        res.send('OK')
      })
    }
  })
})

app.get('/student/card/:cardId/:format', (req, res) => {
  const { cardId, format } = req.params
  Promise.all([
    Card.scope('includeCourse').findByPk(cardId),
    Student.scope('public').findByPk(req.user.student.id, { include: [Course] }),
  ])
    .then(([card, student]) => {
      const courseIds = student.courses.map(course => course.id)
      if (courseIds.indexOf(card.unit.courseId) === -1) {
        res.status(401).send({ message: 'Unauthorized: Student does not own Card #' + cardId })
        return
      }
      let filename = card.media
      if (format === 'video') {
        filename = card.video
      } else if (format === 'audio') {
        filename = card.audio
      }
      if (!filename) {
        return
      }
      const Key = `${cardId}/${filename}`
      getSignedUrl(Key).then(url => {
        // res.send(`<img src="${url}">`)
        res.redirect(url)
      })
    })
})


app.get('/student/progress', (req, res) => {
  Student.scope('public').findByPk(req.user.student.id, { include: [Course] }).then(student => {
    const data = student.courses.map(course => {
      const { CourseStudent } = course.toJSON()
      return {
        id: course.id,
        name: course.name,
        numberOfUnits: course.units ? course.units.length : 0,
        numberOfCompletedUnits: CourseStudent.completedUnits,
      }
    })
    res.send(data)
  })
})
