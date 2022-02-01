import { ExtractedContent, ExtractorContext, ItemDataExtractor } from "../../../api/extract";
import CheerioParser from "../../../util/html-parser";


export default class MercadolibreExtractor implements ItemDataExtractor {
    async extract($: CheerioParser, ctx: ExtractorContext): Promise<ExtractedContent> {
        return { itemLinks: [], data: { hola: "mundo" } }
    }

}