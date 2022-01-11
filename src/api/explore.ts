

export interface ExplorerConfiguration {
    explorerKey: string
    includePath?: string
    configuration?: any
}

export interface NetworkConfiguration {
    key: string
    version: string
    explorers: Map<string, ExplorerConfiguration>
}

export interface Explorer {
    explore(): void
}


async function getNetworkConfiguration(networkKey:string): Promise<NetworkConfiguration>{
    return null
}

async function createExplorer(key: string, configuration: ExplorerConfiguration): Promise<Explorer> {
    const includePath = configuration.includePath || `${key}/explorer.ts`
    const module = await import(includePath)
    return null
}

export async function explore(networkKey: string){
    console.log("Exploring ", networkKey)
    const {explorers: explorersConfig} = await getNetworkConfiguration(networkKey);
    const explorers = Array.from(explorersConfig.keys()).map(k => createExplorer(k, explorersConfig.get(k)));
    for(let explorer of explorers){
        let result = await (await explorer).explore();
    }
    
}