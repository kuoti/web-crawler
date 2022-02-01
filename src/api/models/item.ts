import mongoose, { ObjectId } from 'mongoose'
import { string } from 'yargs'

const DataHistorySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    changes: {}
}, { id: false, versionKey: false })

const ItemSchema = new mongoose.Schema({
    uri: { type: String },
    externalId: { type: String },
    discoveredAt: { type: Date, default: () => new Date() },
    lastDiscovered: {type: Date, default: () => new Date() },
    data: {},
    lastCheckedAt: Date,
    state: { type: String, enum: ['created', 'fecthed', 'removed', 'error'], default: 'created' },
    history: [DataHistorySchema]
})

export const ItemModel = mongoose.models.ItemSchema || mongoose.model('Item', ItemSchema, 'items')


export interface DataHistory {
    date: Date
    changes: any
}

export interface Item {
    _id: ObjectId
    /**
     * Url of the item
     */
    url?: string
    /**
     * Time when the element was discovered by the crawler
     */
    discoveredAt: Date
    /**
     * Time when the extractor process was run over this item
     */
    lastCheckedAt: Date
    /**
     * Optional external item id
     */
    externalId?: string
    /**
     * 
     */
    state: 'created' | 'fetched' | 'removed' | 'error'
    /**
     * Last extracted data
     */
    data?: string
    /**
     * History of changes over data
     */
    history: DataHistory[]
}