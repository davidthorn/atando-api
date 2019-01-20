import { user } from './endpoints/user.endpoint'
import login from './endpoints/login'
import DQLServer from './src/DQLServer'

const server = new DQLServer()

server.add(user.resourcePath , user.endpoint)
server.host = process.env.HOST
server.port = parseInt(process.env.PORT || '3000') 

console.log({
    host: server.host || 'not set',
    port: server.port || 'not set',
    firebase: {
        port: process.env.FIREBASE_PORT,
        host: process.env.FIREBASE_HOST
    }
})

server.listen()       