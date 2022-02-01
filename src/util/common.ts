export function clone(object:any): any{
    return JSON.parse(JSON.stringify(object))
}