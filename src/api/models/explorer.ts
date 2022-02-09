import mongoose, { ObjectId } from "mongoose";

const CachedValue = new mongoose.Schema({
    cachedAt: Number,
    endedAt: Date,
    value: {},
    lastHit: Number
}, { _id: false, versionKey: false })

const LastRunSchema = new mongoose.Schema({
    startedAt: Date,
    endedAt: Date,
    stateVars: {}
}, { _id: false, versionKey: false })

const NetworkExplorerSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    networkKey: { type: String, required: true },
    explorerKey: { type: String, required: true },
    configuration: {},
    cache: { type: Map, of: CachedValue },
    lastRun: LastRunSchema
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
    lastRun: LastRun
    cache: Map<string, CacheEntry>
    configuration: any
}

export interface LastRun {
    startedAt: Date
    endedAt?: Date
    stateVars?: any
}


export const NetworkExplorerModel = mongoose.models.NetworkExplorer || mongoose.model('NetworkExplorer', NetworkExplorerSchema, 'network-explorers')
