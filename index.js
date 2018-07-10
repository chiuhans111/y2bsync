const serve = require('koa-static')
const Koa = require('koa')
const app = new Koa()
var port = process.env.PORT || 8080;
// response
app.use(serve('./pub'))
 
app.listen(port)