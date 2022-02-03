import mongoose, { ObjectId } from "mongoose";

const CachedValue = new mongoose.Schema({
    cachedAt: Number,
    value: {},
    lastHit: Number
}, { _id: false, versionKey: false })

const NetworkExplorerSchema = new mongoose.Schema({
    networkKey: { type: String, required: true },
    explorerKey: { type: String, required: true },
    configuration: {},
    cache: { type: Map, of: CachedValue },
    lastResult: {}
}, { _id: false, versionKey: false })


export interface CacheEntry {
    value: any
    cachedAt: number
    lastHit: number
}


export interface NetworkExplorer {
    _id: ObjectId
    networkKey: string
    explorerKey: string
    lastResult: any
    cache: Map<string, CacheEntry>
    configuration: any
}

export const NetworkExplorerModel = mongoose.models.NetworkExplorer || mongoose.model('NetworkExplorer', NetworkExplorerSchema, 'network-explorers')
