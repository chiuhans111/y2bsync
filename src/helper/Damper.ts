/**
 * a simple damper which create a damping effect
 * to the value you feed in.
 * basically removes noise from continuous data stream
 */
class Damper {
    data: number[]
    size: number
    bias: number
    min: number
    /**
     * 
     * @param size this size of data array, which stores the value you feed in
     * @param bias this number of element to exclude (from top and bottom) ex: size 20 bias 5 will result in 10 element valid
     * @param min the minimum number of element to calculate, if the data array not big enough, it will not exclude by bias
     */
    constructor(size: number, bias: number, min: number) {
        this.size = size
        this.bias = bias
        this.min = min
    }

    /**
     * feed in value
     * @param value the value
     */
    feed(value: number) {
        this.data.push(value)
        while (this.data.length > this.size) this.data.shift()
        let n = this.validData()
        return n.reduce((a, b) => a + b, 0) / n.length
    }

    /**
     * return a list of valid data (after excluding bias)
     */
    validData() {
        let bias = this.data.length / this.size * this.bias;
        let x = this.data.map(x => x).sort((a, b) => a - b)
        let n = x.slice(bias, -bias)
        if (n.length >= this.min) return n
        return this.data
    }

    /**
     * the difference between the maximum value and minimum value of valid data
     */
    diverge() {
        let n = this.validData()
        return n[n.length - 1] - n[0]
    }
}
