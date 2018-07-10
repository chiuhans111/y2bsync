const serve = require('koa-static')
const Koa = require('koa')
const app = new Koa()
 
// response
app.use(serve('./pub'))
 
app.listen(8080)