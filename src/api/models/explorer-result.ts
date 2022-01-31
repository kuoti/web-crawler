import mongoose from 'mongoose'

const ExplorerResultSchema = new mongoose.Schema({
    networkKey: { type: String, required: true},
    explorerKey: { type: String, required: true},
    status: String,
    date: {type: Date, default: () => new Date()},
    stats: {}
}, {versionKey: false})

export default mongoose.models.ExplorerResult || mongoose.model('ExplorerResult', ExplorerResultSchema, 'explorer-result')