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


function Damper(size, bias) {
    var me = this
    this.data = []
    this.size = size
    this.bias = bias
    this.value = null
    this.time = 0

    this.feed = function (value) {
        me.data.push(value)
        while (me.data.length > me.size) me.data.shift()

        var x = me.data.map(x => x).sort()
        var n = x.slice(bias, -bias)
        if (n.length == 0) return me.data.reduce((a, b) => a + b, 0) / me.data.length;
        return n.reduce((a, b) => a + b, 0) / n.length
    }
}