import Network from "../../../src/api/models/network"
import Explorer from "../../../src/api/models/explorer"
import { connectMongo } from "../../util/mongo"


(async function createSeeds() {
    await connectMongo()
    const networkKey = 'mercadolibre'
    await Network.findOneAndUpdate({ key: 'mercadolibre' }, { key: 'mercadolibre' }, { upsert: true, new: true })
    await Explorer.findOneAndUpdate({ networkKey, explorerKey: 'today' }, {
        networkKey,
        explorerKey: 'today',
        configuration: { maxRepeatCountStrike : 10.0 },
        lastResult: {},
        cache: []
    }, { upsert: true })
    await Explorer.findOneAndUpdate({ networkKey, explorerKey: 'all' }, {
        networkKey,
        explorerKey: 'all',
        configuration: { maxRepeatCountStrike : 100.0 },
        lastResult: {},
        cache: []
    }, { upsert: true })
    process.exit(0)
})()