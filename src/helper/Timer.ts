/**
 * a simple Timer helper that gives a more accurate setTimeout handler,
 * with manually call update method
 */
class Timer {
    events: TimerEvent[]
    interval: number = 14


    setTimeout(callback: (now: number) => any, millis: number) {
        let now = Date.now()
        this.events.push({
            time: now + millis,
            callback
        })
    }

        
    update() {
        let now = Date.now()
        this.events = this.events.filter(event => {
            let time = event.time - now
            if (time < this.interval / 2) {
                event.callback(now)
                return false
            }
            return true
        })
    }
}

interface TimerEvent {
    callback(now: number): any
    time: number
}