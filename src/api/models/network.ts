import mongoose from "mongoose";


const CachedValue = new mongoose.Schema({
    expiresOn: Number,
    value: {},
    key: String
}, { _id: false, versionKey: false })

const ExplorerConfig = new mongoose.Schema({
    configuration: {},
    cachedData: { type: [CachedValue] },
    lastResult: {}
}, { _id: false, versionKey: false })

const NetworkSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    explorers: { type: Map, of: ExplorerConfig }
})

export default mongoose.models.Network || mongoose.model('Network', NetworkSchema, 'networks')
