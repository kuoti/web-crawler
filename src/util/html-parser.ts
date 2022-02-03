import { Cheerio, CheerioAPI, Node } from "cheerio";
import { writeFile } from '../util/filesystem'
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

    async saveHtmlInDirectory(directory: string, fileName: string): Promise<void> {
        await writeFile(path.join(directory, fileName), this.$.html(), { encoding: 'utf-8' })
    }

    async saveHtmlInFile(filePath: string): Promise<void> {
        await writeFile(filePath, this.$.html(), { encoding: 'utf-8' })
    }
}