import { Explorer, ExploringContext } from "../../../api/explore";
import { exploreResults } from "./common";
import log4js from "log4js";
const logger = log4js.getLogger("MercadolibreTodayExplorer")

export default class MercadolibreTodayExplorer implements Explorer {
    explore = async function (ctx: ExploringContext) {
        const today = "https://carros.tucarro.com.co/_PublishedToday_YES_NoIndex_False"
        const url = ctx.getConfiguration("baseUrl", today)
        await exploreResults(url, ctx)
    };
}