import Network from "../../../src/api/models/network"
import Explorer from "../../../src/api/models/explorer"
import { connectMongo } from "../../util/mongo"


(async function createSeeds() {
    await connectMongo()
    const networkKey = 'mercadolibre'
    await Network.findOneAndUpdate({ key: 'mercadolibre' }, { key: 'mercadolibre' }, { upsert: true, new: true })
    await Explorer.findOneAndUpdate({ networkKey, explorerKey: 'default' }, {
        networkKey,
        explorerKey: 'default',
        configuration: {},
        lastResult: {},
        cache: []
    }, { upsert: true })
    process.exit(0)
})()