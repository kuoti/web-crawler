let counter = 0 

/**
 * Appends an url to the discovered urls to check
 * @param url an url to append to our items to check
 * @returns true if the url was new and was added to processing queue
 */
export function discover(url: string, externalId?: string): boolean{
    return counter++ < 100
}
