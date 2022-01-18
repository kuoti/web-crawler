import { connectMongo } from "../util/mongo"
import Network from "./models/network"


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
