import { user } from './endpoints/user.endpoint'
import { company } from './endpoints/company.endpoint'
import { login } from './endpoints/login'

import DQLServer from './src/DQLServer'

const server = new DQLServer()


server.addAuthentication({
    allowedMethod: [
        'GET'
    ],
    firebaseAuth: {},
    name: 'users-auth',
    priority: 1000,
    resourcePath: '/user',
    scheme: 'FBAuth'
})

server.addAuthentication({
    allowedMethod: [
        'GET'
    ],
    firebaseAuth: {},
    name: 'companies-auth',
    priority: 1000,
    resourcePath: '/companies',
    scheme: 'FBAuth'
})

server.add(login.resourcePath , login.endpoint)
server.add(company.resourcePath , company.endpoint)
server.add(user.resourcePath , user.endpoint)
server.host = process.env.HOST
server.port = parseInt(process.env.PORT || '3000') 

console.log({
    host: server.host || 'not set',
    port: server.port || 'not set',
    firebase: {
        api_key: process.env.API_KEY,
        port: process.env.FIREBASE_PORT,
        host: process.env.FIREBASE_HOST
    }
})

server.listen()       