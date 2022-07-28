import express from 'express'
import * as bodyParser from 'body-parser'
import * as https from 'https'
import fileUpload from 'express-fileupload'
import cors from 'cors'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { createConnection } from 'typeorm'
import { IConfig } from './models/models'
import Route from './routes/index'
import 'reflect-metadata'

const CONFIG_PATH = `${__dirname}/../config.json`
const CONFIG_CONTENT = readFileSync(CONFIG_PATH).toString()
const CONFIG  = JSON.parse(CONFIG_CONTENT)

const PORT: IConfig = CONFIG.server.port

const serverOptions = {
    key: readFileSync(`${__dirname}/../localhost-key.pem`),
    cert: readFileSync(`${__dirname}/../localhost.pem`)
}

const exitHandler = (options: any, exitCode: any) => {
    if (options.cleanup) console.log('clean');
    if (exitCode || exitCode === 0) console.log(exitCode);
    if (options.exit) process.exit();
}

createConnection()
.then (async () => {
    const route = new Route()
    const app = express()
    const server = https.createServer(serverOptions, app)

    dotenv.config()
    
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(cors())
    app.use('/assets', express.static('public'))
    app.use('/upload', express.static('upload'))
    app.use('/segment', express.static('segment'))
    app.use(fileUpload({
        useTempFiles: true,
        tempFileDir: `./tmp/`
    }))

    route.routes(app)

    server.listen( PORT, () => {
        console.log( `Server launched and listening on port ${PORT}` )
    })

    process.stdin.resume();

    process.on('exit', exitHandler.bind(null,{cleanup:true}));
    process.on('SIGINT', exitHandler.bind(null, {exit:true}));
    process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
    process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
    process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

    process.on('uncaughtException', () => {
        server.close()
        console.log(`server crashed`)
    })
    process.on('SIGTERM', () => {
        server.close()
        console.log(`server killed`)
    })
})
.catch (error => console.log(`Connection failed, Error: ${error}`))