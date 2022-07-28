interface IServer {
    port: string
    domain: string
    protocol: string
}

export interface IConfig {
    server: IServer
}