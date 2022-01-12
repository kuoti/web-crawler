import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from 'cheerio'
import log4js from 'log4js'

const logger = log4js.getLogger("http")

export interface GetResult {
    statusCode: number
    response: AxiosResponse
    $?: cheerio.CheerioAPI
}

export async function get(url: string, profile?: string): Promise<GetResult>{
    logger.info(`Getting: ${url}`)
    const config:AxiosRequestConfig = {
        headers: {
            'accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
            'user-agent': 'Mozilla/5.0 (Linux; Android 6.0.1; Moto G (4)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Mobile Safari/537.36'
        }
    } 
    const response = await axios.get(url)
    const statusCode = response.status
    if(statusCode != 200) return {statusCode, response}
    logger.debug(`Loading and parsing data`)
    const data = response.data
    const $ = cheerio.load(data)
    return {statusCode, response, $}
}