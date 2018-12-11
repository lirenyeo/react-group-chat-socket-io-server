// const express = require('express')
// const socket = require('socket.io')
var cors = require('cors')
var Sentencer = require('sentencer');

var app = require('express')();
app.use(cors())

var port = process.env.PORT || 80

var server = require('http').createServer(app).listen(port);
var io = require('socket.io').listen(server)

io.set('origins', '*:*');

// server.listen(80);
// WARNING: app.listen(80) will NOT work here!

app.get('/', function (req, res) {
  res.sendStatus(200)
})

let users = []

io.on('connection', (socket) => {

  socket.on('NEW_USER', () => {
    const randomName = Sentencer.make("{{ adjective }} {{ noun }}")
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ')

    const newUser = {
      id: socket.id,
      name: randomName,
    }

    users.push(newUser)
    socket.emit('GET_USER_INFO', newUser)
    io.emit('UPDATE_USER_LIST', users)
  })

  socket.on('BROADCAST_MESSAGE', data => {
    io.emit('RECEIVE_BROADCAST', data);
  })

  socket.on('ACCEPT_PRIVATE_CHAT', ({roomName, initiator}) => {
    console.log(roomName, initiator)
    socket.join(roomName, () => {
      io.to(roomName).emit('RECEIVE_PRIVATE_MESSAGE', {
        sender: {name: 'System Announcement'},
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
          text: `${sender.name} has initiated a private chat with you!`,
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
            text: `You have initiated a chat with ${recipient.name}. Please hold!`,
          }
        })
      })

      socket.on('LEAVE_PRIVATE_CHAT', ({leaver}) => {
        io.to(roomName).emit('RECEIVE_PRIVATE_MESSAGE', {
          message: {
            type: 'notification',
            text: `${leaver.name} left! You are all alone, just leave.`
          }
        })

        socket.leave(roomName, () => {
          console.log(`${sender.name} left!`)
        })
      })
    }
  })

  socket.on('SEND_PRIVATE_MESSAGE', data => {
    io.emit('RECEIVE_PRIVATE_MESSAGE', data);
  })


  // socket.on('SEND_PM', data => {
  //   console.log(data)
  //   socket.emit('RECEIVE_PM', data)
  //   io.to(data.recipient.id).emit('RECEIVE_PM', data)
  // })

  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id)
    io.emit('UPDATE_USER_LIST', users)
    socket.removeAllListeners()
  })
})