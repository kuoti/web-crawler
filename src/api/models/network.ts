import mongoose from "mongoose";

const NetworkSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    key: { type: String, unique: true },
    configuration: {}
}, { versionKey: false })

export interface Network {
    key: string,
    configuration?: any
}

export const NetworkModel = mongoose.models.Network || mongoose.model('Network', NetworkSchema, 'networks')
