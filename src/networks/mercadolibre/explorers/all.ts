import { Explorer, ExploringContext } from "../../../api/explore";
import { createRequestConfig, getJson, postUrlEncoded } from "../../../api/http-client";
import { assertNotEmpty, assertNotNull } from "../../../util/assert";
import { exploreResults } from "./common";
import { get } from "../../../api/http-client"
import log4js from "log4js";

const logger = log4js.getLogger("MercadolibreAllExplorer")

async function getBrandIds(ctx: ExploringContext): Promise<string[]> {
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

async function getModelIds(brandId: string, ctx: ExploringContext): Promise<string[]> {
    const key = `brand@${brandId}_models`
    const cached = await ctx.getCached(key, 24 * 7)
    if (cached) {
        logger.info(`Getting model ids from cache for brand ${brandId}`)
        return cached
    }
    logger.info(`Fetching brand model keys for ${brandId}`)
    console.log(1)
    const models = (await fetchModels(brandId)).sort()
    console.log(2)
    await ctx.cacheValue(key, models)
    console.log(3)
    return models
}

async function fetchModels(brandId: string): Promise<Array<string>> {
    const url = `https://www.tucarro.com.co/faceted-search/MCO/MOT/searchbox/BRAND/MODEL?MODEL=&category=MCO1744&BRAND=${brandId}`
    logger.info(`Getting models for brand ${brandId}`)
    const response = await get(url, { parseJson: true });
    return response.data.map(v => `${v.id}`)
}

async function fetchBrandsIds(ctx: ExploringContext): Promise<string[]> {
    const result = await get(`https://www.tucarro.com.co`)
    let { data } = result
    const checkIndex = i => {
        if (i < 0) throw new Error(`Unable to extract make list`)
    }
    let start = data.indexOf("__PRELOADED_STATE__")
    checkIndex(start)
    data = data.substr(start)
    start = data.indexOf("{")
    checkIndex(start)
    data = data.substr(start)
    let end = data.indexOf("}};")
    checkIndex(end)
    data = data.substr(0, end + 2)
    const parsed = JSON.parse(data)
    const items = parsed?.dataLanding?.components || []
    const brands = items.find(c => c.component_name == "VisFacetedSearch")
    const list = (brands?.data?.renderConfig || []).find(r => r.id == "BRAND")?.options
    if (!list) throw new Error("unable to extract make list")
    return list.map(l => `${l.id}`)
}

async function getModelUrl(brandId: string, model: string): Promise<string | undefined> {
    return `https://vehiculos.mercadolibre.com.co/_BRAND_${brandId}_MODEL_${model}`
}

//TODO: Need to implement an explorer that crawl the entire web page in order to detect dead links
export default class MercadolibreAllExplorer implements Explorer {
    explore = async function (ctx: ExploringContext) {
        const { startedAt, endedAt, stateVars } = ctx.configuration?.lastRun || {}
        if (startedAt && !endedAt && stateVars) {
            logger.warn(`Last run didn'end well, resuming from`, stateVars)
        }
        let brands = await getBrandIds(ctx)
        const totalBrands = brands.length
        const { brand: startBrand, model: startModel } = stateVars || {}
        const index = brands.indexOf(startBrand)
        if (index > 0) {
            brands = brands.slice(index)
            if (brands.length > 0)
                logger.info(`Starting at brand ${brands[0]}`)
        }

        let currentIndex = 0
        for (const brand of brands) {
            logger.info(`Processing brand ${currentIndex++} of ${brand.length}`)
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
            brandIndex++
        }
    }
}