import log4js from 'log4js'


const logConfig = {
    appenders: {
        general: { type: 'file', filename: 'log/general.log', maxLogSize: 10485760, backups: 3, compress: true },
        out: { type: 'stdout' }
    },
    categories: {
        default: { appenders: ['general', 'out'], level: 'info' }
    }
}

export function configure(levelName: string){
    console.log(`Logger lever is ${levelName}`)
    logConfig.categories.default.level = levelName
    log4js.configure(logConfig);
}