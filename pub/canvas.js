var timespan = 5000

function tx(time) {
    return (timespan - (data.local.time - time) - timespan / 2) / timespan * width
}

function txs(time) {
    return (timespan + time - timespan / 2) / timespan * width
}

function txl(time) {
    return (time) / timespan * width
}


var canvasdiv = document.getElementById('canvas')

function setup() {
    var canvas = createCanvas(canvasdiv.offsetWidth, canvasdiv.offsetHeight);
    canvas.parent('canvas')
}

function windowResized() {
    resizeCanvas(canvasdiv.offsetWidth, canvasdiv.offsetHeight)
}

var correctSize = 0

function draw() {
    

    background(255)
    data.local.time = Date.now()
    data.events = data.events.filter(x => {
        return x.time > data.local.time - timespan
    })

    push()
    strokeWeight(2)
    var lastmaxErr = null
    var lastmaxErrx = null
    for (var d of data.events) {
        var x = tx(d.time)

        if (d.event.maxErr) {
            stroke(lerpColor(color('#388E3C'), color('#FF5252'), map(Math.abs(d.event.maxErr), 0.05, 0.3, 0, 1)))
            var y = Math.abs(d.event.maxErr) * 40 + 45
            if (lastmaxErr != null) {
                line(lastmaxErrx, lastmaxErr, x, y)
            }
            lastmaxErr = y
            lastmaxErrx = x
        }
    }
    pop()

    var x_reaction = txs(reactionTime * 1000)
    var x_preload = txs((reactionTime + preloadTime) * 1000)

    // action line
    push()
    strokeWeight(3)
    stroke('#212121')
    line(x_reaction, 0, x_reaction, 60)
    stroke('#607D8B')
    line(x_preload, 0, x_preload, 60)
    pop()

    // server
    push()
    stroke('#009688')
    strokeWeight(10)
    line(0, 20, width, 20)
    pop()

    // delta
    push()
    stroke('#757575')
    strokeWeight(10)
    var deltaTime = data.local.playTime - data.server.time
    if (Math.abs(deltaTime) < 0.1) correctSize += (30 - correctSize) * 0.3
    else correctSize += (10 - correctSize) * 0.1


    var tb = (data.local.playTime - data.server.time) * 1000
    line(txs(tb), 45, txs(0), 45)
    noStroke()

    // correct ball
    fill('#4CAF50')
    ellipse(txs(tb), 45, correctSize, correctSize)
    fill('#212121')
    ellipse(txs(0), 45, 10, 10)
    fill('#E91E63')
    ellipse(tx(data.server.event - timeoffset), 30, 10, 10)
    pop()


    var count_outofexpect = 0
    var lastTweak = null
    for (var d of data.events.map(x => x).reverse()) {
        var event = d.event
        push()
        if (event.outofexpect) {
            var y = count_outofexpect * 10 + 60
            count_outofexpect++

            noStroke()
            fill('#F44336')
            var xr = txs(event.reactionTime * 1000)
            ellipse(xr, y, 5, 5)
            stroke('#F44336')
            var x2 = +xr + txl(event.outofexpect * 1000)

            line(xr, y, x2, y)
            line(x2 - 5, y - 5, x2 + 5, y + 5)
            line(x2 + 5, y - 5, x2 - 5, y + 5)
        }
        pop()
    }

    var last_v_state = null
    var last_v_time = null


    for (var d of data.events.concat([
        {
            event: { v_state: true },
            time: data.local.time
        }
    ])) {
        push()

        var event = d.event
        var x = tx(d.time)

        // V state
        push()

        stroke(0)
        strokeWeight(4)

        if (event.v_state) {
            if (last_v_state != null) {
                switch (last_v_state) {
                    case YT.PlayerState.ENDED: stroke('#BDBDBD'); break
                    case YT.PlayerState.PLAYING: stroke('#4CAF50'); break
                    case YT.PlayerState.PAUSED: stroke('#9C27B0'); break
                    case YT.PlayerState.BUFFERING: stroke('#FF5722'); break
                    case YT.PlayerState.CUED: stroke('#448AFF'); break
                }
                line(tx(last_v_time), 36, tx(d.time), 36)

            }

            last_v_state = event.v_state
            last_v_time = d.time
        }
        pop()


        // sync A
        if (event.synca) {
            var sx = tx(event.synca)

            noStroke()
            fill('#1976D2')
            ellipse(sx, 10, 10, 10)
        }

        pop()
        push()
        if (event.tweak) {
            noStroke()
            fill('#F44336')
            ellipse(x, 55, 10, 10)
            lastTweak = x
        }
        if (event.seek) {
            fill('#E91E63')
            ellipse(txs((event.seek - data.server.time) * 1000), 30, 10, 10)
        }
        if (event.tweaked) {
            if (lastTweak != null) {
                strokeWeight(2)
                stroke('#F44336')
                line(lastTweak, 55, x, 55)
            }
            noStroke()
            fill('#F44336')
            ellipse(x, 55, 10, 10)
        }

        pop()
        push()

        if (event.syncb) {
            var x1 = tx(event.syncb.time1)
            var x2 = tx(event.syncb.time2)
            var xs = tx(event.syncb.serverTime - timeoffset)
            stroke('#212121')
            strokeWeight(2)
            line(x1, 10, x2, 10)
            noStroke()
            fill('#03A9F4')
            ellipse(x2, 10, 10, 10)
            fill('#FFFFFF')
            ellipse(xs, 20, 10, 10)
        }
        pop()
    }

}
