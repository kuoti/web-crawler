import fs from 'fs'
import archiver from 'archiver'
import path from 'path'
import { emptyDir } from '../util/filesystem'

const root = './data'
const tmp = `${root}/tmp`

export function createTempDir(): string {
    let fullDir = undefined
    do {
        fullDir = `${root}/tmp/${Date.now()}`
    } while (fs.existsSync(fullDir))
    fs.mkdirSync(fullDir, { recursive: true })
    return fullDir
}

export function zipDir(directory: string, targetFile?: string): Promise<string> {
    const fileName = targetFile || `${directory}.zip`
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(fileName)
        var archive = archiver('zip')
        output.on('close', () => {
            resolve(fileName)
        })
        archive.on('error', e => {
            reject(e)
        })
        archive.pipe(output)
        archive.directory(directory, false)
        archive.finalize()
    })
}

emptyDir(tmp)