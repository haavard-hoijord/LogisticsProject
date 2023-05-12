export function create3DArray(width, height, depth) {
    const arr = new Array(width);
    for (let i = 0; i < width; i++) {
        arr[i] = new Array(height);
        for (let j = 0; j < height; j++) {
            arr[i][j] = new Array(depth).fill(0);
        }
    }
    return arr;
}

export function stableSort(array, compareFn) {
    return array
        .map((item, index) => ({item, index}))
        .sort((a, b) => {
            const result = compareFn(a.item, b.item);
            return result !== 0 ? result : a.index - b.index;
        })
        .map(({item}) => item);
}