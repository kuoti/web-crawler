import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from 'cheerio'
import log4js from 'log4js'
import CheerioParser from "../util/html-parser";
import { inspect } from 'util'
import fs from 'fs'
import { md5 } from "../util/common";

const logger = log4js.getLogger("http")

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
}

axios.interceptors.request.use(request => {
    if (logger.isDebugEnabled()) {
        logger.debug('Starting Request', inspect(request, false, 3))
    }
    return request
})

const mobileUserAgent = "Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Mobile Safari/537.36"
const desktopUserAgent = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"

export function createRequestConfig(options?: RequestOptions): AxiosRequestConfig {

    const resolvedOpts = options || {}
    const userAgentType = resolvedOpts['userAgentType'] || 'desktop'
    const userAgent = userAgentType == 'mobile' ? mobileUserAgent : desktopUserAgent
    const config: AxiosRequestConfig = {
        headers: {
            'accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
            'User-Agent': userAgent
        }
    }
    return config
}


export async function get(url: string, options?: RequestOptions): Promise<AxiosResponse> {
    const response = await axios.get(url, createRequestConfig(options))
    return response
}

export async function getHtml(url: string, options?: RequestOptions): Promise<HtmlGetResult> {
    const response = await get(url, options)
    //console.log("Response request: ", inspect(response.request))
    const statusCode = response.status
    if (statusCode != 200) return { statusCode, response }
    logger.debug(`Loading and parsing html response`)
    const data = response.data
    const $ = cheerio.load(data)
    return { statusCode, response, $: new CheerioParser($, url) }
}

export async function getJson(url: string, profile?: string): Promise<HtmlJsonResponse> {
    const response = await get(url)
    const statusCode = response.status
    if (statusCode != 200) return { response, statusCode }
    logger.debug(`Loading and parsing json response`)
    const data = response.data
    return { response, data, statusCode }
}

export async function postUrlEncoded(url: string, data: any, requestConfig?: AxiosRequestConfig): Promise<AxiosResponse> {
    const params = new URLSearchParams()
    Object.keys(data).forEach(k => params.append(k, data[k]))
    const rqConfig = requestConfig || createRequestConfig()
    rqConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded'
    const response = await axios.post(url, params, rqConfig)
    return response
}

export async function postJson(url: string, data: any, requestConfig?: AxiosRequestConfig, profile?: string): Promise<AxiosResponse> {
    const rqConfig = requestConfig || createRequestConfig()
    const response = await axios.post(url, data, rqConfig)
    return response
}