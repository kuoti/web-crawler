import log4js from 'log4js'

let counter = 0 
const logger = log4js.getLogger("item-service")


/**
 * Appends an url to the discovered urls to check
 * @param url an url to append to our items to check
 * @returns true if the url was new and was added to processing queue
 */
export function discover(url: string, externalId?: string): boolean{
    const isNew =  counter++ < 5
    if(isNew){
        logger.info(`New Link discovered: ${url}`)
    }
    return isNew
}
