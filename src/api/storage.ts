import fs from 'fs'
import archiver from 'archiver'
import path from 'path'
import { emptyDir, rename } from '../util/filesystem'

const root = './data'
const tmp = `${root}/tmp`
const storage = `${root}/storage`

export function createTempDir(): string {
    let fullDir = undefined
    do {
        const fileName = new Date().toISOString().replace(/[-|:|\.]/g, "")
        fullDir = `${root}/tmp/${fileName}`
    } while (fs.existsSync(fullDir))
    fs.mkdirSync(fullDir, { recursive: true })
    return fullDir
}

export function getStorageDirectory(subPath: string): string {
    const fullPath = path.join(storage, subPath)
    fs.mkdirSync(fullPath, { recursive: true })
    return fullPath
}

export async function moveToStorage(filePath: string, directory: string) {
    const folder = getStorageDirectory(directory)
    const fileName = path.basename(filePath)
    await rename(filePath, path.join(folder, fileName))
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