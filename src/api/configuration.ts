
const sources = {
    "explorers": {
    }
}


//TODO: get this configuration from another source
function createDefault(key: string): NetworkConfiguration{
    const explorers = new Map<string, ExplorerConfiguration>()
    explorers.set("default", {
        explorerKey: "default",
        includePath: `../networks/${key}/explorer.ts`,
        configuration: {}
    })
    return {
        explorers,
        key
    }
}

export interface ExplorerConfiguration {
    explorerKey: string
    includePath: string
    configuration?: any
}

export interface NetworkConfiguration {
    key: string
    explorers: Map<string, ExplorerConfiguration>
}

export function getNetworkConfiguration(source: string, key:string): NetworkConfiguration {
    const config =  sources[source][key] || createDefault(key)
    return config
}