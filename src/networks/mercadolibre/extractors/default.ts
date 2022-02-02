import { ExtractedContent, ExtractorContext, ItemDataExtractor } from "../../../api/extract";
import { ItemData, ItemDisplay } from "../../../api/models/item";
import { assertNotEquals, assertNotNull } from "../../../util/assert";
import CheerioParser from "../../../util/html-parser";
import lodash from 'lodash'

const startSubstring = "window.__PRELOADED_STATE__ = {"


function getImageUrl(imageTemplate: string, image: any) {
    if (typeof (image) == 'object' && image.id) {
        image = image.id
    }
    if (typeof (image) != 'string') return undefined
    return imageTemplate.replace(/\{id\}/, image)
}

function normalizeKey(name: string): string | undefined {
    if (!name) return undefined
    name = name.replace("de ", "")
    name = name.replace("ñ", "ni")
    name = lodash.camelCase(name)
    if (name == 'anio') return 'year'
    if (name == 'marca') return 'brand'
    if (name == 'modelo') return 'model'
    return name
}

function parseValue(key: string, value: any): any {
    if (key == 'year') return parseInt(value)
    if (key == 'puertas') return parseInt(value)
    return value
}

function extractData(json: any): ExtractedContent {
    let { technical_specifications, description, gallery, price, header, content_left } = json.initialState?.components

    const template = gallery.picture_config.template
    const assets = gallery.pictures.map(p => getImageUrl(template, p))
    const image = assets.length > 0 ? assets[0] : undefined
    const display: ItemDisplay = {
        title: header?.title, description: description?.content, image
    }
    const features = {}
    const { specs } = technical_specifications
    const attributes = specs.flatMap(s => s.attributes).map(a => {
        if (a.id && a.text) return a
        if (a.values) return { id: a?.values?.value_text?.text, text: true }
        return undefined
    }).filter(a => a).map(({ id, text }) => {
        const key = normalizeKey(id)
        return { key, value: parseValue(key, text) }
    })
    attributes.forEach(({ key, value }) => features[normalizeKey(key)] = value)
    const extra = {}
    const data: ItemData = { display, features, extra }
    return { data }
}


export default class MercadolibreExtractor implements ItemDataExtractor {
    async extract($: CheerioParser, ctx: ExtractorContext): Promise<ExtractedContent> {
        const scripts = $.findAll("script")
        const script = scripts.find(s => s.html().indexOf("window.__PRELOADED_STATE__") >= 0)
        assertNotNull(script, "Unable to find data object script")
        let html = script.html()
        const startIndex = html.indexOf(startSubstring)
        assertNotEquals(startIndex, -1, "Can't find object start")
        html = html.substring(startIndex + startSubstring.length - 1)
        const endIndex = html.indexOf("}},{s:function(){/* eslint-disable no-restricted-syntax */")
        assertNotEquals(endIndex, -1, "Can't find object end")
        html = html.substring(0, endIndex).trim()
        html = html.substring(0, html.length - 1)
        return extractData(JSON.parse(html)) //No links available in detail
    }

}