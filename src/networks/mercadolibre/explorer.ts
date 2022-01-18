import { Explorer, ExploringContext } from "../../api/explore";
import log4js from "log4js";
import { createRequestConfig, getHtml, getJson, postUrlEncoded } from '../../api/http-client'
import { discover } from "../../api/item-service";
import { Cheerio, CheerioAPI } from "cheerio";
import { assertNotEmpty, assertNotNull } from "../../util/assert";


interface BrandUrl {
    id: string
    name: string
    url: string
}

const logger = log4js.getLogger("tucarro-explorer")
const idRegex = /.*\/(?<id>MCO-[0-9]+)-.*/i

function extractItems($: CheerioAPI, items: Cheerio<Element>) {
}

function extractExternalId(url: string): string | undefined {
    if (!url) return undefined
    const matcher = url.match(idRegex)
    return matcher?.groups?.id
}

async function exploreResultsPage(url: string, ctx: ExploringContext) {
    const { $, statusCode } = await getHtml(url)
    if (statusCode != 200) throw Error("Unable to explore tucarro network")
    $(".ui-search-result__wrapper").each((i, e) => {
        const links = $(e).find("a.ui-search-result__content").toArray()
        links.map(el => $(el)).map(el => el.attr('href'))
            .map(url => ({ url, id: extractExternalId(url) }))
            .forEach(e => ctx.addItemLink(e.url, e.id))
    })
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

async function getBrandUrls(ctx: ExploringContext){
    return await ctx.getCached("brands", () => getBrands(ctx))
}

async function getBrands(ctx: ExploringContext): Promise<BrandUrl[]> {
    const { data, statusCode } = await getJson("https://frontend.mercadolibre.com/sites/MCO/homes/motors/filters?nc=5953417692&&category=MCO1744&os=web")
    if (statusCode != 200) throw Error("Unable to explore tucarro main page")
    const { available_filters } = data
    assertNotNull(available_filters, "available filters")
    const brands = available_filters.find(f => f.id == 'BRAND')
    assertNotEmpty(brands, "brands list")
    const result:BrandUrl[] = []
    for(const brand of brands.values){
        const url = await getBrandUrl(brand.id)
        result.push({...brand, url})
    }
    return result
}

export default class MercadolibreExplorer implements Explorer {
    explore = async function (ctx: ExploringContext) {
        const brands = await getBrandUrls(ctx);
        //const slug = await getBrandUrl("56870")
        console.log(brands)
        //await exploreResultsPage(`https://carros.mercadolibre.com.co/#CATEGORY_ID=MCO1744`, ctx)
    };
}