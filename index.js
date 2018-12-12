const express = require('express') // to host web server
const socketIO = require('socket.io') // to provide us the realtime communication
const Sentencer = require('sentencer') // to randomly generate a username
const cors = require('cors')

const port = process.env.PORT || 80

const app = express()
app.use(cors())

const server = require('http').createServer(app).listen(port)
const io = socketIO.listen(server)
io.set('origins', '*:*')

console.log('Server has started...')

app.get('/', function (req, res) {
  res.sendStatus(200)
})

// An array of all active users
let users = []

// Whenever a socket/user joins the server (io),
io.on('connection', (socket) => {

  // we assign the user ID and random username and pass it to current user
  socket.on('NEW_USER', () => {
    const randomName = Sentencer.make("{{ adjective }} {{ noun }}")
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ')

    const newUser = {
      id: socket.id,
      username: randomName,
    }

    // we then populate user list,
    users.push(newUser)

    // and gives current user his id and username
    socket.emit('GET_USER_INFO', newUser)

    // and tell everyone on the server (io) to update their user list
    io.emit('UPDATE_USER_LIST', users)
  })

  // Whenever a user send message, we broadcast it to everyone
  socket.on('BROADCAST_MESSAGE', data => {
    const {username, message, timestamp} = data
    if (username && message && timestamp && typeof username == 'string' && typeof message == 'string') {
      io.emit('RECEIVE_BROADCAST', data)
    } else {
      socket.emit('HAS_ERROR', 'BROADCAST_MESSAGE must submit an object with username (string), message (string) and timestamp (number)')
    }
  })

  // Whenever a user disconnects, we update everyone's user lists
  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id)
    io.emit('UPDATE_USER_LIST', users)
    socket.removeAllListeners()
  })

  // Whenever there is an error on server,
  socket.on("error", () => {
    socket.emit("HAS_ERROR", 'Something went wrong on the server!')
  })


  /**
   * Everything below is for Private Messaging
   * with Invitation. Optional for students
   */
  socket.on('ACCEPT_PRIVATE_CHAT', ({roomName, initiator}) => {
    console.log(roomName, initiator)
    socket.join(roomName, () => {
      io.to(roomName).emit('RECEIVE_PRIVATE_MESSAGE', {
        sender: {username: 'System Announcement'},
        message: {
          type: 'notification',
          text: `Both of you are here! You may start chatting :)`
        }
      })
    })
  })

  socket.on('START_PRIVATE_CHAT', ({sender, recipient}) => {
    if (recipient) {
      const roomName = `${sender.id}${recipient.id}`

      io.to(recipient.id).emit('RECEIVE_BROADCAST', {
        message: {
          type: 'notification',
          text: `${sender.username} has initiated a private chat with you!`,
          action: {
            roomName,
            initiator: sender,
            recipient,
          },
        }
      })

      socket.join(roomName, (e) => {
        io.to(sender.id).emit('RECEIVE_PRIVATE_MESSAGE', {
          message: {
            type: 'notification',
            text: `You have initiated a chat with ${recipient.username}. Please hold!`,
          }
        })
      })

      socket.on('LEAVE_PRIVATE_CHAT', ({leaver}) => {
        io.to(roomName).emit('RECEIVE_PRIVATE_MESSAGE', {
          message: {
            type: 'notification',
            text: `${leaver.username} left! You are all alone, just leave.`
          }
        })

        socket.leave(roomName, () => {
          console.log(`${sender.username} left!`)
        })
      })
    }
  })

  socket.on('SEND_PRIVATE_MESSAGE', data => {
    io.emit('RECEIVE_PRIVATE_MESSAGE', data)
  })
})