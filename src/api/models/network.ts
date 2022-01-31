import mongoose from "mongoose";

const NetworkSchema = new mongoose.Schema({
    _id: mongoose.Types.ObjectId,
    key: { type: String, unique: true }
}, { versionKey: false })

export default mongoose.models.Network || mongoose.model('Network', NetworkSchema, 'networks')
