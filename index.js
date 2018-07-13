const serve = require('koa-static')
const Koa = require('koa')
const app = new Koa()
const port = process.env.PORT || 8080;
var server = app.listen(port)

var y2bsync = {}
var io = require('socket.io')(server)


function findbyid(id) {
    if (id == null) return null
    if (y2bsync[id]) return id
    for (var i in y2bsync) {
        if (id == y2bsync[i].nick) return i
    }
    return null
}

io.on('connection', socket => {
    console.log(socket.id)

    y2bsync[socket.id] = {
        nick: socket.id
    }

    socket.emit('id', y2bsync[socket.id].nick)


    socket.on('timing', async (data) => {
        var serverTime = Date.now() + 500
        await new Promise(done => setTimeout(done, 1000))
        socket.emit('timing', {
            clientTime: data,
            serverTime
        })
    })


    socket.on('sync', async (data) => {

        if (!y2bsync[socket.id]) return

        var serverTime = Date.now()

        // remove user that idle over TEN seconds
        for (var i in y2bsync) {
            if (y2bsync[i].time !== null && serverTime - y2bsync[i].time > 10000) {
                delete y2bsync[i]
            }
        }

        // update check time
        y2bsync[socket.id].time = serverTime

        // see if there is a pack to upload
        if (data.pack)
            y2bsync[socket.id].pack = data.pack


        var other = null

        data.with = findbyid(data.with)

        if (data.with && data.with != socket.id) {
            other = y2bsync[data.with]
            y2bsync[socket.id].with = data.with
        }

        if (data.force) {
            console.log('forced update')
            for (var i in io.sockets.sockets) {
                console.log('ids', i)
                if (y2bsync[i] && y2bsync[i].with == socket.id) {
                    console.log('found follower')
                    io.sockets.sockets[i].emit('force')
                }
            }
        }

        socket.emit('sync', {
            serverTime,
            clientTime: data.time,
            other
        })

        delete other
    })



    socket.on('setid', id => {
        console.log('set id', id)
        if (!y2bsync[socket.id]) return

        if (id == y2bsync[socket.id].nick)
            return socket.emit('id', y2bsync[socket.id].nick)

        if (findbyid(id) != null)
            return socket.emit('id', { error: true })

        if (y2bsync[socket.id] == null) y2bsync[socket.id] = {}
        y2bsync[socket.id].nick = id

        socket.emit('id', y2bsync[socket.id].nick)
    })

    socket.on('disconnect', () => {
        delete y2bsync[socket.id]
    })
})


// response


app.use(serve('./pub'))


