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
    parseJson?: boolean
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
    const { skipProxy = false, userAgentType = 'mobile', parseJson = false } = options
    const userAgent = skipProxy ? userAgentType == 'mobile' ? mobileUserAgent : desktopUserAgent : desktopUserAgent
    const config: AxiosRequestConfig = {
        headers: {
            'accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
            'User-Agent': userAgent
        }, transformResponse: (data: any) => {
            if (parseJson) return JSON.parse(data)
            return data
        }
    }
    return config
}


export async function get(url: string, options: RequestOptions = {}): Promise<AxiosResponse> {
    const { skipProxy = false, userAgentType = 'mobile', parseJson = false } = options
    const requestConfig = createRequestConfig(url, options)
    if (!skipProxy) {
        const apiKey = getEnv().ROCKETSCRAPE_API_KEY
        if(apiKey){            
            url = rocketscrapeUrl + `?apiKey=${apiKey}&keep_headers=true&url=${url}`
        }else{
            logger.warn("No ROCKETSCRAPE api key provided, will not use this feature")
        }
    }
    logger.debug(`Getting url ${url}`)
    console.log("Before get")
    const response = await axios.get(url, requestConfig)
    console.log("after get")
    return response
}

export async function getHtml(url: string, options?: RequestOptions): Promise<HtmlGetResult> {
    if (!url) throw new Error(`url must'n be empty`)
    try {
        const response = await get(url, { ...options, parseJson: false })
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
    const response = await get(url, { parseJson: true })
    const statusCode = response.status
    if (statusCode != 200) return { response, statusCode }
    logger.debug(`Loading and parsing json response`)
    const data = response.data
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