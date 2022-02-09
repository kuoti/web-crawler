import mongoose from 'mongoose'

const ExecutionResultSchema = new mongoose.Schema({
    arguments: {},
    startedAt: Date,
    endedAt: Date,
    error: String,
    result: {}
}, { versionKey: false })

export interface ExecutionResult {
    arguments: any
    startedAt: Date
    endedAt?: Date
    error?: string
    result?: any
}

export const ExecutionResultModel = mongoose.models.ExecutionResult || mongoose.model('ExecutionResult', ExecutionResultSchema, 'execution-result')