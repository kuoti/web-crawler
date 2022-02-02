export function assertNotNull(value: any, name: string) {
    if (!value) {
        throw new Error(`${name} was not expected to be null: ${value}`)
    }
}

export function assertNotEquals(current: any, expected: any, message: string) {
    if (current == expected) {
        throw new Error(message)
    }
}


export function assertEquals(current: any, expected: any, message: string) {
    if (current != expected) {
        throw new Error(message)
    }
}

export function assertNotEmpty(value: any[], name: string) {
    if (!value || value.length == 0) {
        throw new Error(`${name} was not expected to be empty: ${value ? '[length: ' + value.length + ']' : 'undefined'}`)
    }
}