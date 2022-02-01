import CheerioParser from "../util/html-parser"
import { Item, ItemModel } from "./models/item"
import { Network, NetworkModel } from "./models/network"
import { get, getHtml } from "./http-client"
import diff from 'deep-diff'
import { discover } from "./item-service"
import { createObject } from "../util/common"
import log4js from "log4js"

const logger = log4js.getLogger("extract")

export interface ExtractedContent {
    itemLinks?: string[]
    data: any
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


export async function extract(networkKey: string, groupName: string) {
    //const query = { lastProcessed: { $dateSubtract: { startDate: "$$NOW", unit: "day", amount: 1 } } } //Getting a query for mongo
    const query = {}
    const network = await NetworkModel.findOne({ key: networkKey })
    if (!network) throw new Error(`Network not found ${networkKey}`)
    const extractor = await createObject(`../networks/${networkKey}/extractors/default.ts`)
    await processPaginated(query, extractor, network)
}

async function processPaginated(query: any, extractor: ItemDataExtractor, network: Network) {
    let page = 0
    let hasElements = true
    let pageSize = 30
    while (hasElements) {
        hasElements = await processPage(query, extractor, network, page, pageSize)
        page++
    }
}

async function processPage(query: any, extractor: ItemDataExtractor, network: Network, page: number, pageSize: number): Promise<boolean> {
    
    const skip = page * pageSize
    const limit = pageSize
    const results: Array<Item> = await ItemModel.find(query, {}, { skip, limit })
    if (results.length == 0) return false

    for (const item of results) {
        const url = buildUrl(item, extractor, network)
        const response = await getHtml(url)
        if (response.statusCode == 200) {
            await processContent(item, extractor, response.$, network)
        } else {
            logger.warn(`Received a invalid response code ${response.statusCode}`)
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
    const { itemLinks, data } = await extractor.extract(parser, network)
    const current = item.data || {}
    const changes = diff(current, data)
    for (const itemLink of itemLinks) {
        await discover(itemLink)
    }
    if (!changes) {
        return
    }
}