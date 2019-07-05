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
    socket.emit('GET_CURRENT_USER', newUser)

    // and tell everyone on the server (io) to update their user list
    io.emit('UPDATE_USER_LIST', users)
  })

  // Whenever a user send message, we broadcast it to everyone
  socket.on('BROADCAST_MESSAGE', data => {
    console.log(data)
    const {user_id, message, timestamp, plan_id} = data
    if (user_id && plan_id && message && timestamp && typeof message == 'string') {
      io.emit('RECEIVE_BROADCAST', data)

  
          const http = require('http')

          var data = JSON.stringify({ 
            "plan_id":plan_id,
            "user_id":user_id,
            "message":message,
            "timestamp": timestamp
          })
         

          const options = {
            host: 'localhost',
            port:5000,
            path:'/api/v1/chat/messages/'+ plan_id,
            method: 'POST',
            headers:{ 'Content-Type' : "application/json"},
            // body:data
          }

          const req = http.request(options, (res) => {
            console.log(`statusCode: ${res.StatusCode}`)

            res.on('data', (d) => {
              process.stdout.write(d)
            })
          })

            req.on('error', (error) => {
              console.log(error)
            })

            req.write(data)
            req.end()

    }
    else {
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
})











