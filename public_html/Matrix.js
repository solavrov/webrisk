/* global math */

export {Matrix};

class Matrix {
    
    constructor(a) {
        if (Array.isArray(a)) {
            if(Array.isArray(a[0])) {
                this.arr = a.slice(0);
            } else {
                this.arr = [a.slice(0)];
            }
        } else {
            this.arr = [[a]];
        }
    }
    
    static zeros(nrow, ncol=nrow) {
        return new Matrix(math.zeros(nrow, ncol)._data);
    }
    
    static id(nrow) {
        return new Matrix(math.identity(nrow)._data);
    }
    
    static runif(nrow, ncol) {
        let r = [];
        if (nrow === 1) {
            for (let i = 0; i < ncol; i++) {
                let x = 0;
                while(x === 0) x = Math.random();
                r.push(x);
            }
        } else {
            for (let i = 0; i < nrow; i++) {
                r.push(Matrix.runif(1, ncol).arr[0]);
            }
        }
        return new Matrix(r);
    }
    
    static rnorm(nrow, ncol) {
        let x = Matrix.runif(nrow, ncol).log().mult(-2).sqrt();
        let y = Matrix.runif(nrow, ncol).mult(2 * Math.PI).cos();
        return x.dot(y);
    }
    
    clone() {
        return new Matrix(this.arr);
    }
    
    decap() {
        return new Matrix(this.arr.slice(1));
    }
    
    nrow() {
        return this.arr.length;
    }
    
    ncol() {
        return this.arr[0].length;
    }
    
    t() {
        return new Matrix(math.transpose(this.arr));
    }
        
    plus(b) {
        let c = null;
        if (b.constructor.name === "Matrix") {
            if (b.nrow() === 1) {
                c = [];
                this.arr.forEach((row) => c.push(math.add(row, b.arr[0])));
                c = new Matrix(c);
            } else if (b.ncol() === 1) {
                c = this.t().plus(b.t()).t();
            } else {
                c = new Matrix(math.add(this.arr, b.arr));
            }
        } else if (typeof(b) === "number") {
            c = new Matrix(math.add(this.arr, b));
        }
        return c;
    }
    
    mult(b) {
        let c = null;
        if (b.constructor.name === "Matrix") {
            c = new Matrix(math.multiply(this.arr, b.arr));
        } else if (typeof(b) === "number") {
            c = new Matrix(math.multiply(this.arr, b));
        }
        return c;
    }
    
    dot(b) {
        return new Matrix(math.dotMultiply(this.arr, b.arr)); 
    }
    
    minus(b) {
        let c = null;
        if (b.constructor.name === "Matrix") {
            c = this.plus(b.mult(-1));
        } else if (typeof(b) === "number") {
            c = this.plus(-b);
        }
        return c;
    }
    
    inv() {
        return new Matrix(math.inv(this.arr));
    }
    
    sub(irows, icols=irows) {
        return new Matrix(math.subset(this.arr, math.index(irows, icols)));
    }
    
    rows(irows) {
        return this.sub(irows, math.range(0, this.ncol()));
    }
    
    cols(icols) {
        return this.sub(math.range(0, this.nrow()), icols);
    }
    
    //replace values of this with values of b
    replace(b, icols, irows=math.range(0, b.arr.length)._data) {
        return new Matrix(math.subset(this.arr, math.index(irows, icols), b.arr));
    }
    
    round(digits=0) {
        return new Matrix(math.round(this.arr, digits));
    }
    
    exp() {
        return new Matrix(math.exp(this.arr));
    }
    
    log() {
        return new Matrix(math.log(this.arr));
    }
        
    diag() {
        return new Matrix(math.diag(this.arr));
    }
    
    pow(p) {
        return new Matrix(math.dotPow(this.arr, p));
    }
    
    sqrt() {
        return new Matrix(math.sqrt(this.arr));
    }
    
    cos() {
        return new Matrix(math.cos(this.arr));
    }
    
    sin() {
        return new Matrix(math.sin(this.arr));
    }
    
    det() {
        return math.det(this.arr);
    }
    
    sum() {
        return math.sum(this.arr);
    }
    
    q(prob) {
        return math.quantileSeq(this.arr, prob);
    }
    
    mean() {
        return math.mean(this.arr);
    }
    
    std() {
        return math.std(this.arr);
    }
    
    min() {
        return math.min(this.arr);
    }
    
    max() {
        return math.max(this.arr);
    }
    
    toCC() {
        return this.mult(0.01).exp().minus(1).mult(100);
    }
    
    toSimp() {
        return this.mult(0.01).plus(1).log().mult(100);
    }
    
    //for summetric positively defined matrices only
    chol() {
        let n = this.nrow();
        let l = Matrix.zeros(n).arr;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j <= i; j++) {
                let s = 0;
                for (let k = 0; k < j; k++) s += l[i][k] * l[j][k];
                if (i === j) l[i][j] = math.sqrt(this.arr[i][i] - s);
                else l[i][j] = (this.arr[i][j] - s) / l[j][j];
            }
        }
        return new Matrix(l);
    }
    
    //less cross of index i
    cross(i) {
        let c = this.arr.slice(0);
        if (i >= 0) {
            c.splice(i, 1);
            c = math.transpose(c);
            c.splice(i, 1);
            c = math.transpose(c);
        }
        return new Matrix(c);
    }
    
    fiof(vals, irow=0) {
        let indices = [];
        if (Array.isArray(vals)) {
            for (let v of vals) {
                indices.push(this.arr[irow].indexOf(v));
            }
        } else {
            indices.push(this.arr[irow].indexOf(vals));
        }
        return indices;
    }
    
    vof(indices, irow=0) {
        let vals = [];
        indices.forEach(i => {
            if (i >=0) vals.push(this.arr[irow][i]);
        });
        return new Matrix(vals);
    }
    
    aiof(val, irow=0) {
        let indices = [];
        for(let i = 0; i < this.ncol(); i++)
            if (this.arr[irow][i] === val)
                indices.push(i);
        return indices;
    }
    
    roundw(digits, icol=0) {
        let r = this.cols(icol).t().round(digits);
        r.arr[0][r.arr[0].indexOf(r.max())] += math.round(1 - r.sum(), digits);
        return this.replace(r.t(), icol);
    }
    
    
    
}


