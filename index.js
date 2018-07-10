const serve = require('koa-static')
const Koa = require('koa')
const app = new Koa()
var port = process.env.PORT || 8080;
var server = app.listen(port)

var y2bsync = {}

var io = require('socket.io')(server)


function findbyid(id) {
    if (id == null) return null
    if (y2bsync[id]) return y2bsync[id]
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

    socket.on('sync', async (data) => {


        var serverTime = Date.now()


        for (var i in y2bsync) {

            if (y2bsync[i].time !== null && serverTime - y2bsync[i].time > 10000) {
                delete y2bsync[i]
            }
        }

        y2bsync[socket.id].pack = data.pack
        y2bsync[socket.id].time = serverTime

        var other = null

        data.with = findbyid(data.with)

        if (data.with && data.with != socket.id) {
            other = y2bsync[data.with]
        }


        socket.emit('sync', {
            serverTime,
            clientTime: data.time,
            other
        })
    })

    socket.on('setid', id => {
        console.log('set id', id)

        if (findbyid(id) != null) return socket.emit('message', 'id cannot use')
        if (y2bsync[socket.id] == null) y2bsync[socket.id] = {}
        y2bsync[socket.id].nick = id
        socket.emit('id', y2bsync[socket.id].nick)

    })

    socket.on('disconnected', () => {
        delete y2bsync[socket.id]
    })


})


// response


app.use(serve('./pub'))


