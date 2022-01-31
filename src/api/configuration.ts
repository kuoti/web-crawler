import { ObjectId } from "mongoose"
import { connectMongo } from "../util/mongo"
import Network from "./models/network"
import Explorer from "./models/explorer"
import ExplorerResult from "./models/explorer-result"



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

export async function updateNetworkExplorerState(networkKey:string, explorerKey:string, lastResult: any, cache: Map<string,CacheEntry>){
    await connectMongo()
    await Explorer.findOneAndUpdate({networkKey, explorerKey}, {$set: {lastResult, cache}})
    const status = 'COMPLETED'
    await ExplorerResult.create({networkKey, explorerKey, status})
}

export async function updateNetworkExplorerStateError(networkKey: string, explorerKey:string, error: any, cache: Map<string, CacheEntry>){
    const lastResult = {error, state: 'ERROR'}
    await Explorer.updateOne({networkKey, explorerKey}, {$set: {lastResult, cache}})
    const status = 'FAILED'
    await ExplorerResult.create({networkKey, explorerKey, status})
}
