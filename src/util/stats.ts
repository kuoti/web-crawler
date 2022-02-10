export class NumericStats {
    private stats = {}
    increase(counter: string) {
        let value = this.stats[counter] || 0
        value++
        this.stats[counter] = value
    }
    decrease(counter: string) {
        let value = this.stats[counter] || 0
        value--
        this.stats[counter] = value
    }
    reset(counter: string) {
        this.stats[counter] = 0
    }

    getValue(counter: string): number {
        return this.stats[counter] || 0
    }

    getAll(): Map<string, number> {
        return Object.keys(this.stats).reduce((p, c) => {
            p.set(c, this.stats[c])
            return p
        }, new Map<string, number>())
    }
}
