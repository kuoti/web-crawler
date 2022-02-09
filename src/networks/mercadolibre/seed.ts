import { NetworkModel } from "../../../src/api/models/network"
import { NetworkExplorerModel } from "../../../src/api/models/explorer"
import { connectMongo } from "../../util/mongo"
import { FilterModel } from "../../api/models/filter"


(async function createSeeds() {
    await connectMongo()
    const networkKey = 'mercadolibre'
    await NetworkModel.findOneAndUpdate({ key: 'mercadolibre' },
        {
            key: 'mercadolibre',
            configuration: { urlTemplate: "https://articulo.tucarro.com.co/$externalId" }
        }, { upsert: true, new: true })
    await NetworkExplorerModel.findOneAndUpdate({ networkKey, explorerKey: 'today' }, {
        networkKey,
        explorerKey: 'today',
        configuration: { maxRepeatCountStrike: 10.0 },
        lastResult: {},
        cache: []
    }, { upsert: true })
    await NetworkExplorerModel.findOneAndUpdate({ networkKey, explorerKey: 'all' }, {
        networkKey,
        explorerKey: 'all',
        configuration: {},
        lastResult: {},
        cache: []
    }, { upsert: true })

    await FilterModel.findOneAndUpdate({ networkKey, key: "all" }, {
        networkKey,
        key: "all",
        description: "Process all items",
        query: "{}",
        sort: `{ "discoveredAt":-1 }`
    }, { upsert: true })
    process.exit(0)
})()