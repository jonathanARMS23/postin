import { readFileSync } from 'fs'
import { IConfig } from '../models/models'

const CONFIG_PATH = `${__dirname}/../../config.json`
const CONFIG_CONTENT = readFileSync(CONFIG_PATH).toString()
const CONFIG = JSON.parse(CONFIG_CONTENT) as IConfig

export default {
    serverConfig: {
        ...CONFIG.server,
        serverURL: `${CONFIG.server.protocol}://${CONFIG.server.domain}:${CONFIG.server.port}`
    }
}

