import { connectMongo } from "../util/mongo";
import { FilterModel } from "./models/filter";


export async function listFilters(argv: any): Promise<void> {
    await connectMongo()
    const filters = await FilterModel.find({})
    console.log(`Available filters [${filters.length}]\n`)
    filters.forEach(f => console.log(`${f.networkKey}:${f.key}\t${f.description}`))
    console.log(``)
}