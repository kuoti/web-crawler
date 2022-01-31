import { ObjectId } from "mongoose"
import { connectMongo } from "../util/mongo"
import Network from "./models/network"
import Explorer from "./models/explorer"


//TODO: get this configuration from another source
function createDefault(key: string): NetworkConfiguration{
    const explorers = new Map<string, ExplorerConfiguration>()
    explorers.set("default", {
        explorerKey: "default",
        configuration: {}
    })
    return {
        explorers,
        key
    }
}

export interface CacheEntry {
    value: any
    expiresOn: number
    lastHit: number
}


export interface ExplorerConfiguration {
    explorerKey: string
    includePath?: string
    configuration?: any
}

export interface NetworkConfiguration {
    key: string
    explorers: Map<string, ExplorerConfiguration>
}

export async function getNetworkConfiguration(source: string, key:string): Promise<NetworkConfiguration> {
    await connectMongo()
    const configuration = await Network.findOne({key})
    console.log(configuration)
    const config =  configuration || createDefault(key)
    return config
}

export async function getExplorers(networkKey: String): Promise<ExplorerConfiguration[]>{
    await connectMongo()
    const explorers = Explorer.find({networkKey})
    return explorers
}


export async function updateNetworkExplorerState(networkKey:string, explorerKey:string, lastResult: any, cache: Map<string,CacheEntry>){
    await connectMongo()
    await Explorer.findOneAndUpdate({networkKey, explorerKey}, {$set: {lastResult, cache}})
}

export async function updateNetworkExplorerStateError(networkKey: string, explorerKey:string, error: any, cache: Map<string, CacheEntry>){
    const lastResult = {error, state: 'ERROR'}
    await Explorer.updateOne({networkKey, explorerKey}, {$set: {lastResult, cache}})
}
