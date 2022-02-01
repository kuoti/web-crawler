import { ExplorerConfiguration, CacheEntry, updateNetworkExplorerState, updateNetworkExplorerStateError, getExplorers, getNetworkConfiguration } from '../api/configuration'
import log4js from 'log4js'
import { discover } from './item-service'
import { clone } from '../util/common'

const logger = log4js.getLogger("explorer")

export interface ExploringContext {
    configuration: ExplorerConfiguration
    addItemLink(url: string, externalId?: string): Promise<boolean>;
    putValue(key: string, value: any);
    getValue(key: string): any | undefined;
    cacheValue(key: string, value: any);
    isCached(key: string, ttlhours?: number): boolean;
    getCached(key: string, ttlhours?: number): any | undefined;
    invalidateCached(key: string): void;
    getStats(): Map<string,number>;
    getCache(): any;
    getConfiguration(key: string, defValue: any): any
}

export class StatsKeys {
    static readonly DISCOVERED_ITEMS = "discoveredItems"
    static readonly NEW_ITEMS = "newItems"
    static readonly REPEAT_STRIKE = "repeatStrike"
}

export class NumericStats {
    private stats = {}
    increase(counter: string){
        let value = this.stats[counter] || 0
        value++
        this.stats[counter] = value
    }
    decrease(counter: string){
        let value = this.stats[counter] || 0
        value--
        this.stats[counter] = value
    }
    reset(counter: string){
        this.stats[counter] = 0
    }

    getValue(counter: string) : number{ 
        return this.stats[counter] || 0
    }

    getAll(): Map<string,number>{
        return Object.keys(this.stats).reduce((p, c) => {
            p.set(c, this.stats[c])
            return p
        } , new Map<string,number>())
    }
}

class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();
    stats = new NumericStats()
    
    constructor(public configuration: ExplorerConfiguration) {
    }

    getConfiguration(key: string, defValue: any) {
        const value = this.configuration.configuration[key]
        if(value == null) return defValue
        return value
    }

    getCached(key: string, ttlHours: number = 24) {
        const cache = this.configuration.cache
        const item: CacheEntry = cache.get(key)
        if (item == null) return undefined
        if (this.isExpired(item, ttlHours)) {
            cache.delete(key)
            return undefined
        }
        item.lastHit = Date.now()
        return item.value
    }

    getCache(): Map<string, CacheEntry> {
        return this.configuration.cache
    }

    private isExpired(item: CacheEntry, ttlHours: number): boolean {
        const expiresOn = item.cachedAt + (ttlHours * 3600_000)
        return expiresOn <= Date.now()
    }

    isCached(key: string, ttlHours: number = 24): boolean {
        const cache = this.configuration.cache
        const item: CacheEntry = cache.get(key)
        if (item == null) return false
        if (this.isExpired(item, ttlHours)) {
            cache.delete(key)
            return false
        }
        return true
    }

    invalidateCached(key: string): void {
        this.configuration.cache.delete(key)
    }

    cacheValue(key: string, value: any, expiresinHours: number = 24) {
        const expires = 1000 * 60 * 60 * expiresinHours
        const entry: CacheEntry = { value, lastHit: Date.now(), cachedAt: Date.now() }
        this.configuration.cache.set(key, entry)
    }

    async addItemLink(url: string, externalId?: string): Promise<boolean> {
        const isNew = await discover(url, externalId);
        this.stats.increase(StatsKeys.DISCOVERED_ITEMS)
        if(isNew){
            this.stats.increase(StatsKeys.NEW_ITEMS)
            this.stats.reset(StatsKeys.REPEAT_STRIKE)
        } else{
            this.stats.increase(StatsKeys.REPEAT_STRIKE)
        }
        return isNew
    }

    putValue(key: string, value: any) {
        this.values.set(key, value);
    }

    getValue(key: string): any | undefined {
        this.values.get(key)
    }

    getStats():Map<string,number> {
        return this.stats.getAll()
    }
}

export interface Explorer {
    explore(context: ExploringContext): Promise<any>
}

async function createExplorer(networkKey: string, configuration: ExplorerConfiguration): Promise<Explorer> {
    const key = configuration.explorerKey
    const includePath = `../networks/${networkKey}/explorers/${key}.ts`
    logger.debug(`Loading explorer from ${includePath}`)
    const module = await import(includePath)
    return new module.default()
}

export async function explore(networkKey: string) {
    logger.info(`Exploring ${networkKey}`)
    //const networks = await getNetworkConfiguration(networkKey);
    const explorersConfig = await getExplorers(networkKey)

    for (let configuration of explorersConfig) {
        const explorerKey = configuration.explorerKey
        logger.debug(`Creating explorer ${configuration.explorerKey} for network ${networkKey}`)
        logger.info(`Explorer configuration: ${JSON.stringify(configuration.configuration)}`)
        const context = new DefaultExploringContext(configuration);
        const explorer = await createExplorer(networkKey, configuration)
        try {
            logger.info(`Running explorer for network ${networkKey}`)
            let result = await explorer.explore(context);
            logger.info(`Network explorer execution completed ${networkKey}`)
            await updateNetworkExplorerState(networkKey, explorerKey, context)
        } catch (e) {
            logger.error(`Error running network explorer ${networkKey}`, e)
            await updateNetworkExplorerStateError(networkKey, explorerKey, e, context)
        }
    }

}