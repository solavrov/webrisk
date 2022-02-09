/* global math */

import {Matrix} from "./Matrix.js";

export {
    makeHistogramData
};

function makeHistogramData(array, min_val, max_val, step) {
    function color(x) {
        if (x < 0) return "fill-color: red";
        else return "fill-color: green";
    }
    let b = [];
    for (let v = min_val; v <= max_val; v += step) b.push(v);
    let arr = array.slice(0);
    let hist = [];
    for (let j = 0; j < b.length; j++) {
        let n = arr.filter(e => e < b[j]).length;
        let row;
        if (j === 0) row = [b[0] - step, n, n + " outcomes < " + b[0], color(b[0])];
        else row = [b[j - 1], n, n + " outcomes in [" + b[j - 1] + ", " + b[j] + ")", color(b[j - 1])];
        hist.push(row);
        arr = arr.filter(e => e >= b[j]);
    }
    hist.push([b[b.length - 1], arr.length, arr.length + " outcomes >= " + b[b.length - 1], color(b[b.length - 1])]);
    return hist;
}
