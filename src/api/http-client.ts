import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from 'cheerio'
import log4js from 'log4js'
import CheerioParser from "../util/html-parser";
import { inspect } from 'util'
import fs from 'fs'
import path from 'path'
import { cleanEnv, str } from 'envalid'

let __env = undefined


function getEnv() {
    if (__env) return __env
    __env = cleanEnv(process.env, {
        ROCKETSCRAPE_API_KEY: str({ desc: "Rocketscrape api key", default: "", docs: "https://docs.rocketscrape.com/" })
    })
    return __env
}

const logger = log4js.getLogger("http")
const rocketscrapeUrl = "https://api.rocketscrape.com"

export interface HtmlGetResult {
    statusCode: number
    response: AxiosResponse
    $?: CheerioParser
}

export interface HtmlJsonResponse {
    response: AxiosResponse
    data?: any
    statusCode: number
}
export interface RequestOptions {
    userAgentType?: 'mobile' | 'desktop'
    skipProxy?: boolean
    retryCount?: number
}

axios.interceptors.request.use(request => {
    if (logger.isDebugEnabled()) {
        logger.trace('Starting Request', inspect(request, false, 3))
    }
    return request
})

const mobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Mobile Safari/537.36"
const desktopUserAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"

export function createRequestConfig(url: string, options: RequestOptions = {}): AxiosRequestConfig {
    const { skipProxy = false, userAgentType = 'mobile' } = options
    const userAgent = skipProxy ? userAgentType == 'mobile' ? mobileUserAgent : desktopUserAgent : desktopUserAgent
    const loggedPartSize = 100;
    const config: AxiosRequestConfig = {
        headers: {
            'accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
            'User-Agent': userAgent
        }, transformResponse: (data: any) => `${data}`
    }
    return config
}


export async function get(url: string, options: RequestOptions = {}): Promise<AxiosResponse> {
    const { skipProxy = false, userAgentType = 'mobile', retryCount = 3 } = options
    const requestConfig = createRequestConfig(url, options)
    if (!skipProxy) {
        const apiKey = getEnv().ROCKETSCRAPE_API_KEY
        if (apiKey) {
            url = rocketscrapeUrl + `?apiKey=${apiKey}&keep_headers=true&url=${url}`
        } else {
            logger.warn("No ROCKETSCRAPE api key provided, will not use this feature")
        }
    }
    logger.info(`Getting url ${url}`)
    let response = undefined
    let retry = false
    let currentAttempt = 0
    do {
        currentAttempt++
        response = await axios.get(url, requestConfig)
        const { status } = response
        if (status > 500) {
            logger.warn(`Error getting content [Status: ${status}], retrying. Attempt [${currentAttempt} of ${retryCount}]`)
            retry = currentAttempt < retryCount
        } else {
            retry = false
        }
    } while (retry)
    return response
}

export async function getHtml(url: string, options?: RequestOptions): Promise<HtmlGetResult> {
    if (!url) throw new Error(`url must'n be empty`)
    try {
        const response = await get(url, { ...options })
        //console.log("Response request: ", inspect(response.request))
        const statusCode = response.status
        if (statusCode != 200) return { statusCode, response }
        logger.debug(`Loading and parsing html response`)
        const data = response.data
        const $ = cheerio.load(data)
        return { statusCode, response, $: new CheerioParser($, url) }
    } catch (e) {
        const { response } = e
        if (response) {
            return { statusCode: response.status, response }
        }
        throw e
    }
}

export async function getJson(url: string, profile?: string): Promise<HtmlJsonResponse> {
    const response = await get(url, { skipProxy: true })
    const statusCode = response.status
    if (statusCode != 200) return { response, statusCode }
    logger.debug(`Loading and parsing json response`)
    let data = undefined
    const logSize = 200
    try {
        data = JSON.parse(response.data)
    } catch (e) {
        const logged = response.data && response.data.length > logSize ? response.data.substr(0, logSize) : response.data
        logger.error(`Error parsing json: ${logged}`)
        throw e
    }
    return { response, data, statusCode }
}

export async function postUrlEncoded(url: string, data: any, requestConfig?: AxiosRequestConfig): Promise<AxiosResponse> {
    const params = new URLSearchParams()
    Object.keys(data).forEach(k => params.append(k, data[k]))
    const rqConfig = requestConfig || createRequestConfig(url)
    rqConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const response = await axios.post(url, params, rqConfig)
    return response
}

export async function postJson(url: string, data: any, requestConfig?: AxiosRequestConfig, profile?: string): Promise<AxiosResponse> {
    const rqConfig = requestConfig || createRequestConfig(url)
    const response = await axios.post(url, data, rqConfig)
    return response
}

export async function downloadFile(url: string, directory: string, fileName?: string): Promise<void> {
    logger.info(`Downloading file: ${url}`)
    const writer = fs.createWriteStream(path.join(directory, fileName))
    const response = await axios.get(url, { responseType: 'stream' })
    return new Promise((resolve, reject) => {
        response.data.pipe(writer)
        let error = undefined
        writer.on('error', e => {
            e = error
            writer.close()
            reject(e)
        })
        writer.on('close', () => {
            if (error) return
            resolve()
        })
    })
}