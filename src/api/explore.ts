import log4js from 'log4js'
import { discover } from './item-service'
import { ExecutionResult, mapToObject } from '../util/common'
import { CacheEntry, NetworkExplorer, NetworkExplorerModel } from './models/explorer'
import { connectMongo } from '../util/mongo'
import { ArgumentsCamelCase } from 'yargs'
import { NumericStats } from '../util/stats'

const logger = log4js.getLogger("explore")

export interface ExploringContext {
    configuration: NetworkExplorer
    addItemLink(url: string, externalId?: string): Promise<boolean>;
    putValue(key: string, value: any);
    getValue(key: string): any | undefined;
    cacheValue(key: string, value: any): Promise<void>;
    isCached(key: string, ttlhours?: number): boolean;
    getCached(key: string, ttlhours?: number): any | undefined;
    invalidateCached(key: string): void;
    getStats(): Map<string, number>;
    getCache(): any;
    getConfiguration(key: string, defValue: any): any
    saveStateVars(state: any): Promise<void>
}

export class StatsKeys {
    static readonly DISCOVERED_ITEMS = "discoveredItems"
    static readonly NEW_ITEMS = "newItems"
    static readonly REPEAT_STRIKE = "repeatStrike"
}

class DefaultExploringContext implements ExploringContext {

    values = new Map<string, any>();
    stats = new NumericStats()

    constructor(public configuration: NetworkExplorer) {
    }

    getConfiguration(key: string, defValue: any) {
        const value = this.configuration.configuration[key]
        if (value == null) return defValue
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

    async cacheValue(key: string, value: any, expiresinHours: number = 24): Promise<void> {
        const expires = 1000 * 60 * 60 * expiresinHours
        const entry: CacheEntry = { value, lastHit: Date.now(), cachedAt: Date.now() }
        this.configuration.cache.set(key, entry)
        logger.info("Saving cache values");
        await NetworkExplorerModel.findByIdAndUpdate(this.configuration._id, { $set: { cache: this.configuration.cache } })
        logger.info("Cache saved");
    }

    async addItemLink(url: string, externalId?: string): Promise<boolean> {
        const isNew = await discover(url, externalId);
        this.stats.increase(StatsKeys.DISCOVERED_ITEMS)
        if (isNew) {
            this.stats.increase(StatsKeys.NEW_ITEMS)
            this.stats.reset(StatsKeys.REPEAT_STRIKE)
        } else {
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

    getStats(): Map<string, number> {
        return this.stats.getAll()
    }

    async saveStateVars(state: any): Promise<void> {
        await NetworkExplorerModel.findByIdAndUpdate(this.configuration._id, { $set: { "lastRun.stateVars": state } })
    }
}

export interface Explorer {
    explore(context: ExploringContext): Promise<any>
}

async function createExplorer(networkKey: string, configuration: NetworkExplorer): Promise<Explorer> {
    const key = configuration.explorerKey
    const includePath = `../networks/${networkKey}/explorers/${key}.ts`
    logger.debug(`Loading explorer from ${includePath}`)
    const module = await import(includePath)
    return new module.default()
}

export async function explore(argv: ArgumentsCamelCase): Promise<ExecutionResult> {
    const explorerPath: string = argv.explorer as string
    const [networkKey, explorerKey] = explorerPath.split(":")
    logger.info(`Creating explorer ${explorerKey} for network ${explorerPath}`)

    await connectMongo()
    const configuration = await NetworkExplorerModel.where({ networkKey, explorerKey }).findOne()
    if (!configuration) {
        throw new Error(`No explorer found: ${explorerPath}`)
    }

    logger.info(`Explorer configuration: ${JSON.stringify(configuration.configuration)}`)
    const context = new DefaultExploringContext(configuration);
    try {
        const explorer = await createExplorer(networkKey, configuration)

        await NetworkExplorerModel.findByIdAndUpdate(configuration._id, { $set: { lastRun: { startedAt: new Date() } } })
        logger.info(`Running explorer for network ${explorerPath}`)

        await explorer.explore(context);
        logger.info(`Network explorer execution completed ${explorerPath}`)

        const stats = mapToObject(context.getStats())
        const cache = mapToObject(context.getCache())
        await NetworkExplorerModel.findByIdAndUpdate(configuration._id, { $set: { cache, "lastRun.endedAt": new Date() } })

        logger.info(`Execution numbers: ${JSON.stringify(stats)}`)
        return { result: stats }
    } catch (error) {
        const partialResult = mapToObject(context.getStats())
        return { error, partialResult }
    }
}