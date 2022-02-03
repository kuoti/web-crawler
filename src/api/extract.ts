import CheerioParser from "../util/html-parser"
import { Item, ItemData, ItemModel } from "./models/item"
import { Network, NetworkModel } from "./models/network"
import { downloadFile, get, getHtml } from "./http-client"
import diff from 'deep-diff'
import { discover } from "./item-service"
import { clone, createObject } from "../util/common"
import log4js from "log4js"
import { connectMongo } from "../util/mongo"
import { createTempDir, moveToStorage, zipDir } from './storage'
import path from 'path'
import { emptyAndDelete } from "../util/filesystem"
import { Filter, FilterModel, parseFilter } from "./models/filter"

const logger = log4js.getLogger("extract")

export interface ExtractedContent {
    data: ItemData
    itemLinks?: string[]
    assets?: string[]
    skipSaveSnapshot?: boolean
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
    extract($: CheerioParser, ctx: ExtractorContext): Promise<ExtractedContent>
}

function validateFilterPath(filterPath: string): { networkKey, filterKey } {
    const match = filterPath.match(/^(?<networkKey>[a-z0-9]+):(?<filterKey>[a-z]+)$/)
    if (!match) throw new Error(`Invalid filter path format ${filterPath}`)
    const { networkKey, filterKey } = match.groups
    return { networkKey, filterKey }
}


export async function extract(filterPath: string) {
    //TODO: Fetch a query from database using network splitted key
    //TODO: Need to handle exceptions that might happend during extraction process
    //const query = { lastProcessed: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 1 } } } //Getting a query for mongo
    await connectMongo()

    const { networkKey, filterKey } = validateFilterPath(filterPath)
    const filter: Filter = parseFilter(await FilterModel.findOne({ key: filterKey, networkKey }))
    if (!filter) throw new Error(`No filter with key "${filterKey}" found in network "${networkKey}"`)

    const network = await NetworkModel.findOne({ key: networkKey })
    if (!network) throw new Error(`Network not found ${networkKey}`)

    //TODO: Do we need to use different extractors?
    const extractor = await createObject(`../networks/${networkKey}/extractors/default.ts`)
    logger.info(`Applying extraction using filter "${filterKey}"`)
    await processPaginated(filter, extractor, network)
}

async function processPaginated(filter: Filter, extractor: ItemDataExtractor, network: Network) {
    let page = 0
    let hasElements = true
    let pageSize = network.configuration?.extractPageSize || 10
    while (hasElements) {
        hasElements = await processPage(filter, extractor, network, page, pageSize)
        page++
    }
}

async function processPage(filter: Filter, extractor: ItemDataExtractor, network: Network, page: number, pageSize: number): Promise<boolean> {

    const { query, sort } = filter
    const skip = page * pageSize
    const limit = pageSize
    const results: Array<Item> = await ItemModel.find(query, {}, { skip, limit, sort })
    if (results.length == 0) return false

    for (const item of results) {
        const url = buildUrl(item, extractor, network)
        const response = await getHtml(url)
        if (response.statusCode == 200) {
            await processContent(item, extractor, response.$, network)
        } else {
            logger.warn(`Received a invalid response code ${response.statusCode}`)
            //TODO: Handle this sad path
        }
    }
    return true
}

function buildUrl(item: Item, extractor: any, newtwork: Network): string {
    if (item.url) return item.url
    const externalId = item.externalId
    if ((extractor as UrlBuilder).buildUrl != undefined) {
        return (extractor as UrlBuilder).buildUrl(externalId, newtwork)
    }
    return TemplateUrlBuilder.singleton.buildUrl(externalId, newtwork)
}

async function processContent(item: Item, extractor: ItemDataExtractor, parser: CheerioParser, network: Network) {
    const { itemLinks = [], data, assets = [], skipSaveSnapshot = false } = await extractor.extract(parser, network)
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
    logger.debug(`${assets.length} assets detected in result`)
    const history = item.history || []
    if (item.data) {
        history.push({ date: currentDate, changes })
    }
    logger.info(`Updating item ${item.externalId || item._id}`)
    await ItemModel.updateOne({ _id: item._id }, { $set: { data, lastUpdated: new Date(), history } })
    const dir = createTempDir()
    await parser.saveHtml(dir, "index.html")

    let idx = 1
    for (const asset of assets) {
        await downloadFile(asset, dir, `img_${idx++}${path.extname(asset)}`)
    }
    const zipped = await zipDir(dir)
    emptyAndDelete(dir)
    await moveToStorage(zipped, `${network.key}/history/${item._id}`)
}