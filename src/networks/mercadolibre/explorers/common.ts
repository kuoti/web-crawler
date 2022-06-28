import { ExploringContext, StatsKeys } from "../../../api/explore";
import log4js from "log4js";
import { getHtml } from '../../../api/http-client'
import CheerioParser from "../../../util/html-parser";
import { createTempFilePath } from "../../../api/storage";

const logger = log4js.getLogger("MercadolibreExplorerCommon")
const idRegex = /.*\/(?<id>MCO-[0-9]+)-.*/i
const trackingIdPattern = /&?tracking_id=([0-9a-f]|-)+/
const searchLayoutPattern = /&?search_layout=stack/
const positionPattern = /#?&?position=[0-9]+/
const typePattern = /#?&?type=item/
const validUrlPattern = /^https?:\/\/((carros\.tucarro)|(vehiculos\.mercadolibre))\.com\.co\/?.*/


function normalizeUrl(url: string): string {
    //https://articulo.tucarro.com.co/MCO-850966913-chevrolet-n300-_JM#position=20&search_layout=stack&type=item&tracking_id=eff40492-b059-4d3d-9cbf-a11bcfe649a6
    return url.replace(trackingIdPattern, "").replace(searchLayoutPattern, "").replace(typePattern, "").replace(positionPattern, "")
}

function extractExternalId(url: string): string | undefined {
    if (!url) return undefined
    const matcher = url.match(idRegex)
    return matcher?.groups?.id
}

function tryExtractAsDesktop($: CheerioParser): Array<string> | undefined {
    logger.debug(`Attempting to get publications as desktop`)
    const elements = $.findAll(".ui-search-result__image > a")
    if (elements.length == 0) return undefined
    return elements.map(e => normalizeUrl(e.attr('href')))
}

function tryExtractAsMobile($: CheerioParser): Array<string> | undefined {
    logger.debug(`Attempting to get publications as mobile`)
    const elements = $.findAll(".ui-row-card__item-image-container > a")
    if (elements.length == 0) return undefined
    return elements.map(e => normalizeUrl(e.attr('href')))
}

async function exploreResultsPage($: CheerioParser, url: string, ctx: ExploringContext) {
    logger.debug(`Exploring url ${url}`)
    let elements = tryExtractAsDesktop($)
    if (!elements) {
        elements = tryExtractAsMobile($)
    }
    if (!elements) {
        const file = createTempFilePath(".html")
        logger.warn(`No elements found in current page: ${url} -> ${file}`)
        await $.saveHtmlInFile(file)
        return
    }
    logger.debug(`${elements.length} elements were found in ${url}`)

    for (let link of elements) {
        let externalId = extractExternalId(link)
        const url = externalId ? null : link //If external id, don't need a url
        if (!externalId) {
            logger.warn(`Unable to extract external id from url ${link}`)
        }
        await ctx.addItemLink(url, externalId)
    }
}

const sleep = (seconds) => new Promise((resolve, reject) => setTimeout(() => resolve(0), seconds * 1000))

export async function exploreResults(url: string, ctx: ExploringContext) {
    logger.info(`Getting page at url ${url}`)
    let $ = undefined
    let stop = false
    let statusCode = 0
    let attempts = 0
    do {
        const response = await getHtml(url, { userAgentType: 'mobile' })
        attempts++
        statusCode = response.statusCode
        if (statusCode == 200) {
            stop = true
            $ = response.$
        } else if (statusCode > 500) {
            await sleep(2);
            stop = attempts < 5
        } else {
            stop = true
        }
    } while (!stop)
    if (statusCode != 200) {
        logger.error(`Unable to get page at ${url}, status code: ${statusCode}`)
        return
    }

    await exploreResultsPage($, url, ctx)

    const nextLink = $.findFirst("li.andes-pagination__button--next > a")
    if (!nextLink) {
        logger.debug("No next page link found")
        return
    }
    const nextLinkUrl = nextLink.attr("href")
    if (!nextLinkUrl || !validUrlPattern.exec(nextLinkUrl)) {
        logger.info(`Invalid url found [breaking] ${nextLinkUrl}`)
        return
    }

    if (continueScrapping(ctx)) {
        await exploreResults(nextLinkUrl, ctx)
    } else {
        logger.info(`Not scrapping next page: ${nextLinkUrl}`)
    }
}

function continueScrapping(ctx: ExploringContext): boolean {
    const stats = ctx.getStats()
    const strike = stats.get(StatsKeys.REPEAT_STRIKE) || 0
    const maxRepeatCountStrike = ctx.getConfiguration("maxRepeatCountStrike", 100)
    if (strike > maxRepeatCountStrike) {
        logger.info(`Repeated count strike bigger than ${maxRepeatCountStrike}`)
        return false
    }
    return true
}
