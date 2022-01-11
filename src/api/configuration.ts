
const sources = {
    "explorers": {
        "tucarro": {
            
        }
    }
}



function get(source: string, key:string): any|null{
    return sources[source][key]
}