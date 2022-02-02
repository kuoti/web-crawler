import { Cheerio, CheerioAPI, Node } from "cheerio";
import fs from 'fs'
import path from 'path'

export class ElementNotFoundError extends Error {

}

export default class CheerioParser {
    constructor(public readonly $: CheerioAPI, public readonly url: string) {
    }

    findFirst(selector: string): Cheerio<Node> | undefined {
        const resultArray = this.$(selector).toArray()
        return resultArray.length == 0 ? undefined : this.$(resultArray[0])
    }

    findAll(selector: string): Array<Cheerio<Node>> {
        return this.$(selector).toArray().map(n => this.$(n))
    }

    findNotEmpty(selector: string) {
        const result = this.findAll(selector)
        if (result.length == 0) throw new ElementNotFoundError(`Using selector ${selector} at ${this.url}`)
        return result
    }

    async saveHtml(fileName: string) {
        const dataDir = path.join(process.cwd(), 'data', 'pages')
        fs.mkdirSync(dataDir, { recursive: true })
        fs.writeFileSync(path.join(dataDir, fileName), this.$.html(), { encoding: 'utf-8' })
    }
}