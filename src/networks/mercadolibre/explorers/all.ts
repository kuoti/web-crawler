import { Explorer, ExploringContext } from "../../../api/explore";
import { createRequestConfig, getJson, postUrlEncoded } from "../../../api/http-client";
import { assertNotEmpty, assertNotNull } from "../../../util/assert";
import { exploreResults } from "./common";
import log4js from "log4js";


const logger = log4js.getLogger("MercadolibreAllExplorer")
const filtersBase = "https://frontend.mercadolibre.com/sites/MCO/homes/motors/filters"

//TODO: Implement all network explorer
async function getBrandIds(ctx: ExploringContext): Promise<number[]> {
    const cached = await ctx.getCached("brands", 24 * 7)
    if (cached) {
        logger.info(`Getting brand ids from cache`)
        return cached
    }
    logger.info(`Fetching brand keys`)
    const brandIds = (await fetchBrandsIds(ctx)).sort()
    await ctx.cacheValue("brandIds", brandIds)
    return brandIds
}

async function getModelIds(brandId: number, ctx: ExploringContext): Promise<number[]> {
    const key = `brand@${brandId}_models`
    const cached = await ctx.getCached(key, 24 * 7)
    if (cached) {
        logger.info(`Getting model ids from cache for brand ${brandId}`)
        return cached
    }
    logger.info(`Fetching brand model keys for ${brandId}`)
    const models = (await fetchModels(brandId)).sort()
    await ctx.cacheValue(key, models)
    return models
}

async function fetchModels(brandId: number): Promise<Array<number>> {
    const modelsUrl = `${filtersBase}?nc=1356492860&&category=MCO1744&BRAND=${brandId}&os=web`
    return extractFilterIds(modelsUrl, "MODEL")
}

async function fetchBrandsIds(ctx: ExploringContext): Promise<number[]> {
    const brandsURL = `${filtersBase}?nc=5953417692&&category=MCO1744&os=web`
    return extractFilterIds(brandsURL, "BRAND")
}

async function extractFilterIds(url: string, filterName: string): Promise<Array<number>> {
    const { data, statusCode } = await getJson(url)
    if (statusCode != 200) throw new Error(`Unable to get filters`)
    const { available_filters } = data
    assertNotNull(available_filters, "available filters")
    const filter = available_filters.find(f => f.id == filterName) || []
    if (!filter || filter.length == 0) {
        logger.warn(`Empty filter list ${filterName}`)
    }
    return filter.values.map(m => m.id)
}

async function getModelUrl(brandId: number, model: number): Promise<string | undefined> {
    try {
        const requestConfig = createRequestConfig()
        requestConfig.maxRedirects = 0
        logger.info(`Getting url for brand ${brandId} - model ${model}`)
        await postUrlEncoded("https://www.tucarro.com.co/vehiculos/search", {
            category: 'MCO1744', BRAND: `${brandId}`, MODEL: `${model}`, price_from: '', price_to: '', years_from: '', years_to: ''
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
        const { startedAt, endedAt, stateVars } = ctx.configuration?.lastRun || {}
        if (startedAt && !endedAt) {
            logger.warn(`Last run didn'end well, resuming from`, stateVars)
        }
        let brands = await getBrandIds(ctx)
        const { brand: startBrand, model: startModel } = stateVars || {}
        const index = brands.indexOf(startBrand)
        if (index > 0) {
            brands = brands.slice(index)
            if (brands.length > 0)
                logger.info(`Starting at brand ${brands[0]}`)
        }

        for (const brand of brands) {
            let models = await getModelIds(brand, ctx)
            if (brand == startBrand) {
                const startIndex = models.indexOf(startModel)
                models = startIndex == (models.length - 1) ? [] : models.slice(startIndex)
                if (models.length > 0)
                    logger.info(`Starting at model ${models[0]}`)
            }

            for (const model of models) {
                const url = await getModelUrl(brand, model)
                await ctx.saveStateVars({ brand, model })
                await exploreResults(url, ctx)
            }
        }
    }
}