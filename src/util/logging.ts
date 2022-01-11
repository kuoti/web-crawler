import log4js from 'log4js'


function addLogCategory(configuration, name, level) {
    const { appenders, categories } = configuration
    appenders[name] = { type: 'file', filename: `log/${name}.log`, maxLogSize: 10485760, backups: 3, compress: true }
    categories[name] = { appenders: [name, 'out'], level }
}


export function setLogLevel(levelName: string){
    console.log("Setting log level", levelName)
}

export function configure(){

}