import mongoose from 'mongoose'

const FilterSchema = new mongoose.Schema({
    networkKey: String,
    key: String,
    description: String,
    query: {},
    sort: {}
})

export interface Filter {
    networkKey: String,
    key: string
    description?: string
    query: any
    sort: any
}

export function parseFilter(result: any): Filter {
    if (!result) return undefined
    let { query = {}, sort = {} } = result
    try {
        query = typeof (query) == 'string' ? JSON.parse(query) : query
        sort = typeof (sort) == 'string' ? JSON.parse(sort) : sort
        return { ...result, query, sort }
    } catch (e) {
        throw new Error(`Error parsing filter ${JSON.stringify(result)}`)
    }
}

export const FilterModel = mongoose.models.Filter || mongoose.model('Filter', FilterSchema, "filters")