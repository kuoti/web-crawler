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
const validUrlPattern = /^https?:\/\/carros.tucarro.com.co\/?.*/


function normalizeUrl(url: string): string {
    //https://articulo.tucarro.com.co/MCO-850966913-chevrolet-n300-_JM#position=20&search_layout=stack&type=item&tracking_id=eff40492-b059-4d3d-9cbf-a11bcfe649a6
    return url.replace(trackingIdPattern, "").replace(searchLayoutPattern, "").replace(typePattern, "").replace(positionPattern, "")
}

function extractExternalId(url: string): string | undefined {
    if (!url) return undefined
    const matcher = url.match(idRegex)
    return matcher?.groups?.id
}

async function exploreResultsPage($: CheerioParser, url: string, ctx: ExploringContext) {
    const elements = $.findAll(".ui-search-result__image > a")
    if (elements.length == 0) {
        const tmpFile = `${Date.now}.html`
        const file = createTempFilePath(".html")
        logger.warn(`No elements found in current page: ${url} -> ${file}`)
        await $.saveHtmlInFile(file)
        return
    }

    //Get all images, if they are same size and the size is 21090 it might be a test 
    for (const e of elements) {
        const link = normalizeUrl(e.attr('href'))
        let externalId = extractExternalId(link)
        const url = externalId ? null : link //If external id, don't need a url
        if (!externalId) {
            logger.warn(`Unnable to extract external id from url ${link}`)
        }
        await ctx.addItemLink(url, externalId)
    }

}

export async function exploreResults(url: string, ctx: ExploringContext) {
    logger.debug(`Getting page at url ${url}`)
    const { $, statusCode } = await getHtml(url, { userAgentType: 'mobile' })
    if (statusCode != 200) {
        logger.error(`Unable to get page at ${url}, result code: ${statusCode}`)
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
