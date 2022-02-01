import { ObjectId } from "mongoose"
import { connectMongo } from "../util/mongo"
import Network from "./models/network"
import Explorer from "./models/explorer"
import ExplorerResult from "./models/explorer-result"
import { ExploringContext } from "./explore"



export interface CacheEntry {
    value: any
    cachedAt: number
    lastHit: number
}


export interface ExplorerConfiguration {
    networkKey: string
    explorerKey: string
    lastResult: any
    cache: Map<string, CacheEntry>
    configuration: any
}

export interface NetworkConfiguration {
    key: string
    explorers: Map<string, ExplorerConfiguration>
}

export async function getNetworkConfiguration(key:string): Promise<NetworkConfiguration> {
    await connectMongo()
    return await Network.findOne({key})
}

export async function getExplorers(networkKey: String): Promise<ExplorerConfiguration[]>{
    await connectMongo()
    return await Explorer.find({networkKey})
}

export async function updateNetworkExplorerState(networkKey:string, explorerKey:string, ctx: ExploringContext){
    await connectMongo()
    const cache = ctx.getCache()
    const state = 'completed'
    const lastResult = {state}
    await Explorer.findOneAndUpdate({networkKey, explorerKey}, {$set: {lastResult, cache}})
    await ExplorerResult.create({networkKey, explorerKey, state, stats: ctx.getStats()})
}

export async function updateNetworkExplorerStateError(networkKey: string, explorerKey:string, error: any, ctx: ExploringContext){
    const state = 'failed'
    const lastResult = {error, state}
    const cache = ctx.getCache()
    await Explorer.updateOne({networkKey, explorerKey}, {$set: {lastResult, cache}})
    await ExplorerResult.create({networkKey, explorerKey, state, stats: ctx.getStats()})
}
