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
    cacheValue(key:string, value: any, expires?:number);
    isCached(key: string): boolean;
    getCached(key: string) : any | undefined;
    invalidateCached(key: string): void;
}

interface CacheEntry {
    value: any
    expiresOn: number
    lastAccess: number
}

class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();
    cachedValues = new Map<string, CacheEntry>();

    constructor(public configuration: any){
    }
    getCached(key: string) {
        const item:CacheEntry = this.cachedValues[key]
        if(item == null) return undefined
        if(item.expiresOn < Date.now()) {
            this.cachedValues.delete(key)
            return undefined
        }
        item.lastAccess = Date.now()
        return item.value 
    }
    isCached(key: string): boolean {
        const item:CacheEntry = this.cachedValues[key]
        if(item == null) return false
        if(item.expiresOn < Date.now()) {
            this.cachedValues.delete(key)
            return false
        }
        return true 
    }
    
    invalidateCached(key: string): void {
        this.cachedValues.delete(key)
    }

    cacheValue(key: string, value: any, expires: number = 360_000) {
        this.cachedValues[key] = {value, lastAccess: Date.now(), expires: (expires + Date.now())}
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

async function createExplorer(networkKey:string, key: string, configuration: ExplorerConfiguration): Promise<Explorer> {
    const includePath = configuration.includePath || `../networks/${networkKey}/explorers/${key}.ts`
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
        const explorer = await createExplorer(networkKey, explorerKey, explorersConfig.get(explorerKey))
        let result = await explorer.explore(context);
    }
    
}