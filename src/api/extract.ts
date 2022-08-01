import CheerioParser from "../util/html-parser"
import { Item, ItemData, ItemModel } from "./models/item"
import { Network, NetworkModel } from "./models/network"
import { downloadFile, get, getHtml } from "./http-client"
import diff from 'deep-diff'
import { discover } from "./item-service"
import { clone, createObject, ExecutionResult, mapToObject, sleep } from "../util/common"
import log4js from "log4js"
import { connectMongo } from "../util/mongo"
import { createTempDir, moveToStorage, zipDir } from './storage'
import path from 'path'
import { emptyAndDelete } from "../util/filesystem"
import { Filter, FilterModel, parseFilter } from "./models/filter"
import { ArgumentsCamelCase } from "yargs"
import { NumericStats } from "../util/stats"
import { cloneDeep } from "lodash"

const logger = log4js.getLogger("extract")

export interface ExtractionResult {
    data?: ItemData
    error?: string
    itemLinks?: string[]
    skipSaveSnapshot?: boolean
    refetchContent?: boolean
}

export interface ExtractorContext {
}

export interface UrlBuilder {
    buildUrl(externalId: string, network: Network)
}

class TemplateUrlBuilder implements UrlBuilder {
    static singleton = new TemplateUrlBuilder()
    buildUrl(externalId: string, network: Network) {
        const template = network.configuration?.urlTemplate
        if (!template) throw new Error(`Unable to build url for network: ${network.key} - No url template found`)
        return template.replace("$externalId", externalId)
    }
}

export interface ItemDataExtractor {
    extract($: CheerioParser, ctx: ExtractorContext): Promise<ExtractionResult>
}

function validateFilterPath(filterPath: string): { networkKey, filterKey } {
    const match = filterPath.match(/^(?<networkKey>[a-z0-9]+):(?<filterKey>[a-z]+)$/)
    if (!match) throw new Error(`Invalid filter path format ${filterPath}`)
    const { networkKey, filterKey } = match.groups
    return { networkKey, filterKey }
}


export async function extract(argv: ArgumentsCamelCase): Promise<ExecutionResult> {

    const filterPath = argv.filter as string
    await connectMongo()

    const { networkKey, filterKey } = validateFilterPath(filterPath)
    const filter: Filter = parseFilter(await FilterModel.findOne({ key: filterKey, networkKey }))
    if (!filter) throw new Error(`No filter with key "${filterKey}" found in network "${networkKey}"`)

    const network = await NetworkModel.findOne({ key: networkKey })
    if (!network) throw new Error(`Network not found ${networkKey}`)

    //TODO: Do we need to use different extractors?
    const extractor = await createObject(`../networks/${networkKey}/extractors/default.ts`)
    logger.info(`Applying extraction using filter "${filterKey}"`)
    const stats = new NumericStats()
    try {
        await processPaginated(filter, extractor, network, stats)
        return { result: mapToObject(stats.getAll()) }
    } catch (error) {
        const partialResult = mapToObject(stats.getAll())
        return { error, partialResult }
    }
}

async function processPaginated(filter: Filter, extractor: ItemDataExtractor, network: Network, stats: NumericStats): Promise<any> {
    let page = 0
    let hasElements = true
    let pageSize = network.configuration?.extractPageSize || 10
    while (hasElements) {
        hasElements = await processPage(filter, extractor, network, page, pageSize, stats)
        page++
    }
    return mapToObject(stats.getAll())
}

async function processPage(filter: Filter, extractor: ItemDataExtractor, network: Network, page: number, pageSize: number, stats: NumericStats): Promise<boolean> {

    const { query, sort } = filter
    const skip = page * pageSize
    const limit = pageSize
    const results: Array<Item> = await ItemModel.find(query, {}, { skip, limit, sort })
    if (results.length == 0) return false

    for (const item of results) {
        let refetch = false
        let fetchCount = 0
        let maxFetchCount = 5

        do {
            refetch = false
            const url = buildUrl(item, extractor, network)
            const { $, statusCode } = await getHtml(url)
            fetchCount++
            stats.increase("processedItems")
            if (statusCode == 200) {
                try {
                    const result = await processContent(item, extractor, $, network)
                    if (!result.refetchContent) {
                        stats.increase("extractedItems")
                        continue
                    }
                    if (fetchCount < maxFetchCount) {
                        logger.warn(`Refetch request was received for url ${url}`)
                        stats.increase("refetch")
                        refetch = true
                    } else {
                        throw new Error("Max fetch count reached")
                    }
                } catch (e) {
                    logger.error(`Error while processing item ${item.externalId} -> ${url}`, e)
                    throw e
                }
            } else if (statusCode == 404) {
                stats.increase("deletedItems")
                await markItemDeleted(item)
            } else if (statusCode >= 500 && statusCode < 600) {
                refetch = fetchCount < maxFetchCount
                if (refetch)
                    await sleep(1000);
                else
                    logger.warn(`Unable to process element ${item.externalId} -> ${url}`)
            } else {
                logger.warn(`Received a invalid response code ${statusCode}`)
                throw new Error(`Unhandled error code ${statusCode}`)
            }
        } while (refetch)
    }
    return true
}

async function markItemDeleted(item: Item) {
    logger.info(`Item was deleted ${item._id}`)
    const cloned = cloneDeep(item)
    await ItemModel.findByIdAndDelete({ _id: item._id })
    await ItemModel.findByIdAndUpdate(item._id, { state: 'deleted', deletedAt: new Date() })
}

function buildUrl(item: Item, extractor: any, newtwork: Network): string {
    if (item.url) return item.url
    const externalId = item.externalId
    if ((extractor as UrlBuilder).buildUrl != undefined) {
        return (extractor as UrlBuilder).buildUrl(externalId, newtwork)
    }
    return TemplateUrlBuilder.singleton.buildUrl(externalId, newtwork)
}

async function processContent(item: Item, extractor: ItemDataExtractor, parser: CheerioParser, network: Network): Promise<ExtractionResult> {

    const dir = createTempDir()
    await parser.saveHtmlInDirectory(dir, "index.html")

    let result: ExtractionResult = undefined
    try {
        result = await extractor.extract(parser, network)
        if (result.refetchContent) return result
    } catch (e) {
        logger.error(`Error extracting data for item -> html saved at ${dir}`)
        throw e
    }

    if (result.error) {
        logger.warn(`Unable to extract content: ${result.error}`)
        await ItemModel.updateOne({ _id: item._id }, { "$set": { state: 'error', error: result.error } })
        return result
    }
    const { itemLinks = [], data, skipSaveSnapshot = false } = result
    const currentDate = new Date()
    for (const itemLink of itemLinks) {
        await discover(itemLink)
    }
    const current = clone(item.data || {})
    const changes = diff(current, data)

    if (!changes) {
        logger.info(`No changes detected on item ${item.externalId}`)
        return
    }
    const assets = data.assets || []
    logger.debug(`${assets.length} assets detected in result`)
    const history = item.history || []
    if (item.data) {
        history.push({ date: currentDate, changes })
    }
    logger.info(`Updating item ${item.externalId || item._id}`)
    await ItemModel.updateOne({ _id: item._id }, { $set: { data, lastUpdated: new Date(), history, state: 'fetched', error: null } })

    let idx = 1
    //for (const asset of assets) {
    //    await downloadFile(asset, dir, `img_${idx++}${path.extname(asset)}`)
    //}
    const zipped = await zipDir(dir)
    emptyAndDelete(dir)
    await moveToStorage(zipped, `${network.key}/history/${item._id}`)
    return result
}