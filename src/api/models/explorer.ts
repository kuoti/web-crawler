import mongoose from "mongoose";

const CachedValue = new mongoose.Schema({
    expiresOn: Number,
    value: {},
    lastHit: Number
}, { _id: false, versionKey: false })

const NetworkExplorer = new mongoose.Schema({
    networkKey: { type: String, required: true },
    explorerKey: { type: String, required: true },
    configuration: {},
    cache: { type: Map, of: CachedValue},
    lastResult: {}
}, { _id: false, versionKey: false })


export default mongoose.models.NetworkExplorer || mongoose.model('NetworkExplorer', NetworkExplorer, 'network-explorers')
