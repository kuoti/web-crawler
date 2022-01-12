import {ExplorerConfiguration, getNetworkConfiguration} from '../api/configuration'
import log4js from 'log4js'

const logger = log4js.getLogger("explorer")

export interface ExploringContext {
    configuration: any
    addItemLink(url:string, externalId?:string): boolean;
}

export interface Explorer {
    explore(context:ExploringContext): void
}

async function createExplorer(key: string, configuration: ExplorerConfiguration): Promise<Explorer> {
    const includePath = configuration.includePath || `${key}/explorer.ts`
    logger.debug(`Loading explorer from ${includePath}`)
    const module = await import(includePath)
    return new module.default()
}

export async function explore(networkKey: string){
    logger.info(`Exploring ${networkKey}`)
    const {explorers: explorersConfig} = await getNetworkConfiguration("explorers", networkKey);
    for(let explorerKey of explorersConfig.keys()){
        logger.debug(`Creating explorer for key ${explorerKey}`)
        const configuration = explorersConfig.get(explorerKey)
        const explorer = await createExplorer(explorerKey, explorersConfig.get(explorerKey))
        let result = await explorer.explore(configuration);
    }
    
}