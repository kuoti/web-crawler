import fs from 'fs'
import path from 'path'

export async function mkdir(path: string, recursive: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            fs.mkdirSync(path, { recursive })
            resolve()
        } catch (e) {
            reject(e)
        }
    })
}

export async function writeFile(file: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView, options?: fs.WriteFileOptions): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            fs.writeFileSync(file, data, options)
            resolve()
        } catch (e) {
            reject(e)
        }
    })
}

export function emptyDir(dir: string) {
    const files = fs.readdirSync(dir)
    for (let file of files) {
        file = path.join(dir, file)
        let description = fs.lstatSync(file)
        if (description.isDirectory()) {
            emptyDir(file)
            fs.rmdirSync(file)
        } else {
            fs.unlinkSync(file)
        }
    }
}