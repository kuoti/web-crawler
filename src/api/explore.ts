import { ExplorerConfiguration, CacheEntry, updateNetworkExplorerState, updateNetworkExplorerStateError, getExplorers, getNetworkConfiguration } from '../api/configuration'
import log4js from 'log4js'
import { discover } from './item-service'
import { string } from 'yargs'

const logger = log4js.getLogger("explorer")

export interface ExploringContext {
    configuration: ExplorerConfiguration
    addItemLink(url: string, externalId?: string): boolean;
    putValue(key: string, value: any);
    getValue(key: string): any | undefined;
    cacheValue(key: string, value: any);
    isCached(key: string, ttlhours?: number): boolean;
    getCached(key: string, ttlhours?: number): any | undefined;
    invalidateCached(key: string): void;
}


class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();

    constructor(public configuration: ExplorerConfiguration) {
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

    addItemLink(url: string, externalId?: string): boolean {
        return discover(url, externalId);
    }

    putValue(key: string, value: any) {
        this.values.set(key, value);
    }
    getValue(key: string): any | undefined {
        this.values.get(key)
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
        const context = new DefaultExploringContext(configuration);
        const explorer = await createExplorer(networkKey, configuration)
        try {
            logger.info(`Running explorer for network ${networkKey}`)
            let result = await explorer.explore(context);
            logger.info(`Network explorer execution completed ${networkKey}`)
            await updateNetworkExplorerState(networkKey, explorerKey, result, context.getCache())
        } catch (e) {
            logger.error(`Error running network explorer ${networkKey}`, e)
            await updateNetworkExplorerStateError(networkKey, explorerKey, e, context.getCache())
        }
    }

}