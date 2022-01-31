import { ExplorerConfiguration, getNetworkConfiguration, CacheEntry, updateNetworkExplorerState, updateNetworkExplorerStateError, getExplorers } from '../api/configuration'
import log4js from 'log4js'
import { discover } from './item-service'
import { string } from 'yargs'

const logger = log4js.getLogger("explorer")

export interface ExploringContext {
    configuration: any
    addItemLink(url: string, externalId?: string): boolean;
    putValue(key: string, value: any);
    getValue(key: string): any | undefined;
    cacheValue(key: string, value: any, expires?: number);
    isCached(key: string): boolean;
    getCached(key: string): any | undefined;
    invalidateCached(key: string): void;
}


class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();
    cachedValues = new Map<string, CacheEntry>();


    constructor(public configuration: any) {
    }
    getCached(key: string) {
        const item: CacheEntry = this.cachedValues.get(key)
        if (item == null) return undefined
        if (item.expiresOn < Date.now()) {
            this.cachedValues.delete(key)
            return undefined
        }
        item.lastHit = Date.now()
        return item.value
    }

    getCache(): Map<string, CacheEntry> {
        return this.cachedValues
    }

    isCached(key: string): boolean {
        const item: CacheEntry = this.cachedValues.get(key)
        if (item == null) return false
        if (item.expiresOn < Date.now()) {
            this.cachedValues.delete(key)
            return false
        }
        return true
    }

    invalidateCached(key: string): void {
        this.cachedValues.delete(key)
    }

    cacheValue(key: string, value: any, expires: number = 360_000) {
        const entry: CacheEntry = { value, lastHit: Date.now(), expiresOn: (expires + Date.now()) }
        this.cachedValues.set(key, entry)
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
    const includePath = configuration.includePath || `../networks/${networkKey}/explorers/${key}.ts`
    logger.debug(`Loading explorer from ${includePath}`)
    const module = await import(includePath)
    return new module.default()
}

export async function explore(networkKey: string) {
    logger.info(`Exploring ${networkKey}`)
    const networks = await getNetworkConfiguration("explorers", networkKey);
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