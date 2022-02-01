import log4js from 'log4js'
import { Item, ItemModel } from '../api/models/item'
import crypto from 'crypto'
import mongoose from 'mongoose'

const logger = log4js.getLogger("item-service")


function normalizeUrl(url: string): string {
    if (url.endsWith("/")) return url.substring(0, url.length - 1);
    return url
}

function objectIdFromUrl(url: string): mongoose.Types.ObjectId {
    const hash = crypto.createHash('sha256').update(url).digest('hex');
    return new mongoose.Types.ObjectId(hash.substring(0, 24))
}

/**
 * Appends an url to the discovered urls to check
 * @param url an url to append to our items to check
 * @returns true if the url was new and was added to processing queue
 */
export async function discover(url: string, externalId?: string): Promise<boolean> {
    const _id = objectIdFromUrl(externalId || url)
    const updated = await ItemModel.updateOne({ _id }, { $set: { lastDiscovered: new Date() } })
    if (!updated.matchedCount) {
        logger.info(`New item discovered: ${externalId || url}`)
        await ItemModel.create({ _id, url, externalId })
        return true
    }
    return false
}
