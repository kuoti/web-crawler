import { Explorer, ExploringContext } from "../../../api/explore";
import { createRequestConfig, getJson, postUrlEncoded } from "../../../api/http-client";
import { assertNotEmpty, assertNotNull } from "../../../util/assert";
import { exploreResults } from "./common";
import log4js from "log4js";
const logger = log4js.getLogger("MercadolibreAllExplorer")

//TODO: Implement all network explorer
interface Brand {
    id: string
    name: string
    url: string
}

async function getBrandUrls(ctx: ExploringContext): Promise<Brand[]> {
    const cached = await ctx.getCached("brands", 24 * 7)
    if (cached) {
        logger.info(`Getting brand urls from cache`)
        return cached
    }
    logger.info(`Getting brand keys`)
    const brands = await getBrands(ctx)
    for (const brand of brands) {
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
    const result: Brand[] = []
    for (const brand of brands.values) {
        const url = await getBrandUrl(brand.id)
        result.push({ ...brand, url })
    }
    return result
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
        if (error.response && error.response.status == 302) { //We expect a 302
            return error.response.headers['location']
        }
        return undefined
    }
}


export default class MercadolibreAllExplorer implements Explorer {
    explore = async function (ctx: ExploringContext) {
        //const brands = await getBrandUrls(ctx);

        const today = "https://carros.tucarro.com.co/_PublishedToday_YES_NoIndex_False"

        //await exploreResults("https://carros.tucarro.com.co/chevrolet", ctx)
        await exploreResults(today, ctx)

        //const slug = await getBrandUrl("56870")
        //console.log(brands)
        //ctx.cacheValue("test", "Holi")
        return { done: true }
        //await exploreResultsPage(`https://carros.mercadolibre.com.co/#CATEGORY_ID=MCO1744`, ctx)
    };
}