import { Explorer, ExploringContext } from "../../../api/explore";
import log4js from "log4js";
import { createRequestConfig, getHtml, getJson, postUrlEncoded } from '../../../api/http-client'
import { discover } from "../../../api/item-service";
import { Cheerio, CheerioAPI } from "cheerio";
import { assertNotEmpty, assertNotNull } from "../../../util/assert";
import CheerioParser from "../../../util/html-parser";


interface Brand {
    id: string
    name: string
    url: string
}

const logger = log4js.getLogger("MercadolibreDefaultExplorer")
const idRegex = /.*\/(?<id>MCO-[0-9]+)-.*/i
const trackingIdPattern = /&?tracking_id=([0-9a-f]|-)+/
const searchLayoutPattern = /&?search_layout=stack/
const positionPattern = /#?&?position=[0-9]+/
const typePattern = /#?&?type=item/

function extractItems($: CheerioAPI, items: Cheerio<Element>) {
}

function normalizeUrl(url:string): string{
    //https://articulo.tucarro.com.co/MCO-850966913-chevrolet-n300-_JM#position=20&search_layout=stack&type=item&tracking_id=eff40492-b059-4d3d-9cbf-a11bcfe649a6
    return url.replace(trackingIdPattern, "").replace(searchLayoutPattern, "").replace(typePattern, "").replace(positionPattern, "")
}

function extractExternalId(url: string): string | undefined {
    if (!url) return undefined
    const matcher = url.match(idRegex)
    return matcher?.groups?.id
}


async function getBrandUrl(brandId: string): Promise<string | undefined> {
    try {
        const requestConfig = createRequestConfig()
        requestConfig.maxRedirects = 0
        logger.info(`Getting url for brand ${brandId}`)
        await postUrlEncoded("https://www.tucarro.com.co/vehiculos/search", {
            category: 'MCO1744', BRAND: brandId, MODEL: '', price_from: '', price_to: '', years_from: '', years_to: ''
        }, requestConfig)
    } catch (error) {
        if(error.response && error.response.status == 302){ //We expect a 302
            return error.response.headers['location']
        }
        return undefined
    }
}

async function getBrandUrls(ctx: ExploringContext): Promise<Brand[]>{
    const cached = await ctx.getCached("brands", 24 * 7)
    if(cached){
        logger.info(`Getting brand urls from cache`)
        return cached
    }
    logger.info(`Getting brand keys`)
    const brands = await getBrands(ctx)
    for(const brand of brands){
        const url = await getBrandUrl(brand.id)
        brand.url = url
    }
    ctx.cacheValue("brands", brands)
    return brands
}

async function getBrands(ctx: ExploringContext): Promise<Brand[]> {
    //https://carros.tucarro.com.co/chevrolet/_Desde_145_PublishedToday_YES_NoIndex_False
    const { data, statusCode } = await getJson("https://frontend.mercadolibre.com/sites/MCO/homes/motors/filters?nc=5953417692&&category=MCO1744&os=web")
    if (statusCode != 200) throw Error("Unable to explore tucarro main page")
    const { available_filters } = data
    assertNotNull(available_filters, "available filters")
    const brands = available_filters.find(f => f.id == 'BRAND')
    assertNotEmpty(brands, "brands list")
    const result:Brand[] = []
    for(const brand of brands.values){
        const url = await getBrandUrl(brand.id)
        result.push({...brand, url})
    }
    return result
}

async function exploreResultsPage($: CheerioParser, ctx: ExploringContext) {

    $.saveHtml()
    const elements = $.findAll(".ui-search-row")
    if(elements.length == 0){
        logger.warn(`No elements found in current page`)
        return
    }

    for(const e of elements){
        const links = e.find("div.ui-row-item-info > a").toArray()
        .map(el => $.$(el)).map(el => el.attr('href')).map(l => normalizeUrl(l))
        for(let link of links){
            let externalId = extractExternalId(link)
            const url = externalId? null : link //If external id, don't need a url
            if(!externalId){
                logger.warn(`Unnable to extract external id from url ${link}`)
            }
            await ctx.addItemLink(url, externalId)
        }
    }
    
}

async function exploreResults(url: string, ctx: ExploringContext){
    logger.debug(`Getting page at url ${url}`)
    const {$, statusCode}  =  await getHtml(url)
    if(statusCode != 200){
        logger.error(`Unable to get page at ${url}, result code: ${statusCode}`)
        return
    }

    await exploreResultsPage($, ctx)

    const nextLink = $.findFirst("li.andes-pagination__button--next > a")
    if(!nextLink){
        logger.debug("No next page link found")
        return
    }
    const nextLinkUrl = nextLink.attr("href")
    if(continueScrapping(ctx)){
        await exploreResults(nextLinkUrl, ctx)
    }else{
        logger.info(`Not scrapping next page: ${nextLinkUrl}`)
    }
}

function continueScrapping (ctx:  ExploringContext):  boolean{
    return false
}


function toUrl(baseUrl: string, urlArgs: any = {}): string{
    const args = Object.keys(urlArgs).sort().map(k => `${k}_${urlArgs[k]}`)
    return `${baseUrl}${args.length > 0? "/_" + args.join("_"): ""}`
}

export default class MercadolibreExplorer implements Explorer {
    explore = async function (ctx: ExploringContext) {
        //const brands = await getBrandUrls(ctx);
        await exploreResults("https://carros.tucarro.com.co/chevrolet", ctx)


        //const slug = await getBrandUrl("56870")
        //console.log(brands)
        //ctx.cacheValue("test", "Holi")
        return {done: true}
        //await exploreResultsPage(`https://carros.mercadolibre.com.co/#CATEGORY_ID=MCO1744`, ctx)
    };
}