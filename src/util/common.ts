import crypto from 'crypto'

export function clone(object: any): any {
    return JSON.parse(JSON.stringify(object))
}

export async function createObject(importPath: string): Promise<any> {
    const module = await import(importPath)
    return new module.default()
}

export function sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
}

export function md5(value: string): string {
    return crypto.createHash('md5').update(value).digest('hex');
}