export function clone(object:any): any{
    return JSON.parse(JSON.stringify(object))
}

export async function createObject(importPath: string): Promise<any> {
    const module = await import(importPath)
    return new module.default()
}
