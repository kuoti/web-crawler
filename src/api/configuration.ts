import { connectMongo } from "../util/mongo"
import { NetworkExplorerModel, NetworkExplorer } from "./models/explorer"
import ExplorerResult from "./models/explorer-result"
import { ExploringContext } from "./explore"



export async function updateNetworkExplorerState(networkKey: string, explorerKey: string, ctx: ExploringContext) {
    await connectMongo()
    const cache = ctx.getCache()
    const state = 'completed'
    const lastResult = { state }
    await NetworkExplorerModel.findOneAndUpdate({ networkKey, explorerKey }, { $set: { lastResult, cache } })
    await ExplorerResult.create({ networkKey, explorerKey, state, stats: ctx.getStats() })
}

export async function updateNetworkExplorerStateError(networkKey: string, explorerKey: string, error: any, ctx: ExploringContext) {
    const state = 'failed'
    const lastResult = { error, state }
    const cache = ctx.getCache()
    await NetworkExplorerModel.updateOne({ networkKey, explorerKey }, { $set: { lastResult, cache } })
    await ExplorerResult.create({ networkKey, explorerKey, state, stats: ctx.getStats() })
}
