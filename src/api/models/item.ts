import mongoose, { ObjectId } from 'mongoose'
import { string } from 'yargs'

const DataHistorySchema = new mongoose.Schema({
    date: { type: Date, required: true },
    changes: {}
}, { _id: false, versionKey: false })

const ItemDisplaySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    image: String,
    featured: {},
    location: {}
}, { _id: false, versionKey: false })

export interface ItemDisplay {
    title: string
    description?: string
    image?: string
}

const ItemDataSchema = new mongoose.Schema({
    display: { type: ItemDisplaySchema, required: true },
    features: {},
    extra: {},
    assets: [String],
    prices: {},
    location: {}
}, { _id: false, versionKey: false, minimize: false })

export interface ItemData {
    display: ItemDisplay
    features: any
    extra: any
    assets: string[]
    prices: any
    location?: any
}

const ItemSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    uri: { type: String },
    externalId: { type: String },
    discoveredAt: { type: Date, default: () => new Date() },
    lastDiscovered: { type: Date, default: () => new Date() },
    lastUpdated: { type: Date },
    deletedAt: { type: Date },
    data: { type: ItemDataSchema },
    rawData: {},
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
    data?: ItemData
    /**
     * History of changes over data
     */
    history: DataHistory[]
}