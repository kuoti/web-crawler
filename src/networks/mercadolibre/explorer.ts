import { Explorer, ExploringContext } from "../../api/explore";
import log4js from "log4js";
import {get} from '../../api/http-client'
import { discover } from "../../api/item-service";
import { Cheerio, CheerioAPI } from "cheerio";

const logger = log4js.getLogger("tucarro-explorer")

function extractItems($: CheerioAPI, items: Cheerio<Element>){
}

export default class MercadolibreExplorer implements Explorer {
    explore = async function (ctx:ExploringContext) {
        logger.info("Done!!!");
        const {$, statusCode} = await get(`https://carros.mercadolibre.com.co/#CATEGORY_ID=MCO1744`)
        if(statusCode != 200) throw Error("Unable to explore tucarro network")
        $(".ui-search-result__wrapper").each( (i, e) => {
            const links = $(e).find("a.ui-search-result__content")
            links.map((i, el) => $(el)).each((i, el) => console.log(el.attr('href')))
        })
    };
}