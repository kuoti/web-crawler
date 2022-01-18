import mongoose from "mongoose";


const CachedValue = new mongoose.Schema({
    expiresOn: Date,
    value: {},
    key: String
},{_id: false})

const ExplorerConfig = new mongoose.Schema({
    configuration: {},
    cachedData: {type: [CachedValue]},
    lastResult: {}
})

const NetworkSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    explorers: { type: Map, of: ExplorerConfig }
})

module.exports = mongoose.models['network'] || mongoose.model('network', NetworkSchema)