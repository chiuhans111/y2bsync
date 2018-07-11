var timespan = 5000

function tx(time) {
    return (timespan - (data.local.time - time) - timespan / 4) / timespan * canvas.width
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
            var y = d.event.maxErr * 40 + 45
            if (lastmaxErr != null) {
                line(lastmaxErrx, lastmaxErr, x, y)
            }
            lastmaxErr = y
            lastmaxErrx = x
        }
    }
    pop()


    // server
    push()
    stroke('#009688')
    strokeWeight(10)
    line(0, 20, canvas.width, 20)
    pop()

    push()
    stroke('#757575')
    strokeWeight(10)
    var deltaTime = data.local.playTime - data.server.time
    if (Math.abs(deltaTime) < 0.1) correctSize += (30 - correctSize) * 0.3
    else correctSize += (10 - correctSize) * 0.1

    var ta = data.local.time
    var tb = (data.local.playTime - data.server.time) * 1000 + data.local.time
    line(tx(tb), 45, tx(ta), 45)
    noStroke()

    fill('#4CAF50')
    ellipse(tx(tb), 45, correctSize, correctSize)
    fill('#212121')
    ellipse(tx(ta), 45, 10, 10)
    fill('#E91E63')
    ellipse(tx(data.server.event - timeoffset), 30, 10, 10)
    pop()



    var lastTweak = null

    for (var d of data.events) {
        push()

        var event = d.event
        var x = tx(d.time)


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
