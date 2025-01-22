/**
 * https://github.com/jtrim-ons/accurate-beeswarm-plot
 * Edited constructor to be more d3-like KG2023
 */
class AccurateBeeswarm {
    constructor(items, mapper, {
        radius = 6,
        tieBreakFn = value => value,
        oneSided = false
    } = {}) {
        this.items = items;
        this.radius = radius;
        this.diameter = this.radius * 2;
        this.diameterSq = this.diameter * this.diameter;
        this.mapper = mapper;
        this.tieBreakFn = tieBreakFn;
        this._oneSided = oneSided;
    }

    withTiesBrokenRandomly() {
        this.tieBreakFn = this._sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, 1);
        return this;
    }

    oneSided() {
        this._oneSided = true;
        return this;
    }

    calculateOffsetPositions() {
        let all = this.items.map((d,i) => ({
            datum: d,
            originalIndex: i,
            value: this.mapper(d),
            offset: null,
            placed: false,
            minPositiveOffset: 0,
            maxNegativeOffset: 0,
            score: 0,
            bestPosition: 0,
            heapPos: -1
        })).sort((a,b) => a.value - b.value);
        all.forEach(function (d, i) {d.index = i;});
        let tieBreakFn = this.tieBreakFn;
        all.forEach(function(d) {d.tieBreaker = tieBreakFn(d.value)});
        let pq = new AccurateBeeswarmPriorityQueue();
        pq.push(...all);
        while (!pq.isEmpty()) {
            let item = pq.pop();
            item.placed = true;
            item.offset = item.bestPosition;
            this._updateOffsetBounds(item, all, pq);
        }
        all.sort((a, b) => a.originalIndex - b.originalIndex);
        return all.map(d => ({datum: d.datum, value: d.value, offset: d.offset}));
    }

    // Random number generator
    // https://stackoverflow.com/a/47593316
    _sfc32(a, b, c, d) {
        let rng = function() {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            var t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        }
        for (let i=0; i<10; i++) {
            rng();
        }
        return rng;
    }

    _updateOffsetBounds(item, all, pq) {
        for (let step of [-1, 1]) {
            let xDist;
            for (let i = item.index + step;
                    i >= 0 && i < all.length && (xDist = Math.abs(item.value - all[i].value)) < this.diameter;
                    i += step) {
                let other = all[i];
                if (other.placed) continue;
                let yDist = Math.sqrt(this.diameterSq - xDist * xDist);
                other.minPositiveOffset = Math.max(other.minPositiveOffset, item.offset + yDist);
                let prevScore = other.score;
                other.score = other.minPositiveOffset;
                other.bestPosition = other.minPositiveOffset;
                if (!this._oneSided) {
                    other.maxNegativeOffset = Math.min(other.maxNegativeOffset, item.offset - yDist);
                    if (-other.maxNegativeOffset < other.score) {
                        other.score = -other.maxNegativeOffset;
                        other.bestPosition = other.maxNegativeOffset;
                    }
                }
                if (other.score > prevScore) {
                    // It is never the case that other.score < prevScore here.
                    // The if statement is unnecessary, but makes the algorithm
                    // run a little faster.
                    pq.deprioritise(other);
                }
            }
        }
    }
}

class AccurateBeeswarmPriorityQueue {
    // Based on https://stackoverflow.com/a/42919752
    parent(i) {return ((i + 1) >>> 1) - 1;}
    left(i) {return (i << 1) + 1;}
    right(i) {return (i + 1) << 1;}

    constructor() {
        this.TOP = 0;
        this._heap = [];
    }
    size() {
        return this._heap.length;
    }
    isEmpty() {
        return this.size() == 0;
    }
    peek() {
        return this._heap[this.TOP];
    }
    push(...values) {
        values.forEach(value => {
            value.heapPos = this.size();
            this._heap.push(value);
            this._siftUp();
        });
        return this.size();
    }
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > this.TOP) {
            this._swap(this.TOP, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }
    // Caution: this only works if new priority is less than or equal to old one.
    deprioritise(item) {
        this._siftDown(item.heapPos);
    }
    _greater(i, j) {
        let a = this._heap[i];
        let b = this._heap[j];
        if (a.score < b.score) return true;
        if (a.score > b.score) return false;
        return a.tieBreaker < b.tieBreaker;
    }
    _swap(i, j) {
        let tmp = this._heap[i];
        this._heap[i] = this._heap[j];
        this._heap[j] = tmp;
        this._heap[i].heapPos = i;
        this._heap[j].heapPos = j;
    }
    _siftUp() {
        let node = this.size() - 1;
        while (node > this.TOP && this._greater(node, this.parent(node))) {
            this._swap(node, this.parent(node));
            node = this.parent(node);
        }
    }
    _siftDown(node = this.TOP) {
        let l, r
        let sz = this.size();
        while (l = this.left(node), r = this.right(node),
            (l < sz && this._greater(l, node)) ||
            (r < sz && this._greater(r, node))
        ) {
            let maxChild = (r < sz && this._greater(r, l)) ? r : l;
            this._swap(node, maxChild);
            node = maxChild;
        }
    }
}

