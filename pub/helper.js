function Timer() {
    var me = this
    this.events = []
    this.interval = 14

    this.setTimeout = function (callback, millis) {
        var now = Date.now()
        me.events.push({
            time: now + millis,
            callback
        })
    }

    this.update = function (now) {
        me.events = me.events.filter(event => {
            var time = event.time - now
            if (time < me.interval / 2) {
                event.callback()
                return false
            }
            return true
        })
    }
}


function Damper(size, bias, min) {
    var me = this
    this.data = []
    this.size = size
    this.bias = bias
    this.value = null
    this.time = 0
    this.min = min
    this.validData = function () {
        var bias = me.data.length / me.size * me.bias;
        var x = me.data.map(x => x).sort((a, b) => a - b)
        var n = x.slice(bias, -bias)
        if (n.length >= me.min) return n
        return me.data
    }

    this.feed = function (value) {
        me.data.push(value)
        while (me.data.length > me.size) me.data.shift()
        var n = me.validData()
        return n.reduce((a, b) => a + b, 0) / n.length
    }

    this.diverge = function () {
        var n = me.validData()
        return n[n.length-1]-n[0]
    }
}