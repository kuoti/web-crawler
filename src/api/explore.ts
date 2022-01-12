import {ExplorerConfiguration, getNetworkConfiguration} from '../api/configuration'
import log4js from 'log4js'
import {discover} from './item-service'
import { string } from 'yargs'

const logger = log4js.getLogger("explorer")

export interface ExploringContext {
    configuration: any
    addItemLink(url:string, externalId?:string): boolean;
    putValue(key: string, value: any);
    getValue(key: string): any | undefined;
    cacheValue(key:string, value: any, expires?:number): boolean;
    getCached(key:string, factory?: () => any): any | undefined;
    invalidateCached(key: string): void;
}

class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();
    constructor(public configuration: any){
    }
    
    invalidateCached(key: string): void {
        throw new Error('Method not implemented.')
    }
    cacheValue(key: string, value: any, expires?: number): boolean {
        throw new Error('Method not implemented.')
    }
    getCached(key: string, factory?: () => any) {
        throw new Error('Method not implemented.')
    }
    
    addItemLink(url: string, externalId?: string): boolean {
        return discover(url, externalId);
    }
    putValue(key: string, value: any) {
       this.values[key] = value;
    }
    getValue(key: string): any | undefined{
        this.values.get(key)
    }
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
        const context = new DefaultExploringContext(configuration);
        const explorer = await createExplorer(explorerKey, explorersConfig.get(explorerKey))
        let result = await explorer.explore(context);
    }
    
}