/* global math, google */

export {Port};

class Port {
    
    constructor(cov, r, rho) {
        this.cov = cov;
        this.r = r;
        this.n = cov.length;
        this.reset(rho);
    }
    
    reset(rho) {
        //rho
        let rMin = math.min(this.r);
        let rMax = math.max(this.r);
        if (rho < rMin) this.rho = rMin;
        else if (rho > rMax) this.rho = rMax;
        else this.rho = rho;
        
        //w
        let r = math.transpose(this.r)[0];
        let w = new Array(this.n).fill(0);
        if (rMax !== rMin) {
            w[r.indexOf(rMin)] = (rMax - this.rho) / (rMax - rMin);
            w[r.indexOf(rMax)] = (this.rho - rMin) / (rMax - rMin);
        } else {
//            let sigma = math.diag(this.cov);
//            w[sigma.indexOf(math.min(sigma))] = 1;
            w[0] = 1;
        }
        this.w = math.transpose([w]);
        
        //abEq
        this.abEq = [];
        this.abEq.push(new Array(this.n + 1).fill(1));
        let k = [];
        if (rMax !== rMin) {
            r.push(this.rho);
            this.abEq.push(r);
            k = Port.whichNotZero(r);
        }
        
        //abIneq
        let wLows = math.transpose([new Array(this.n).fill(0)]);
        let wHighs = math.transpose([new Array(this.n).fill(1)]);
        let id1 = math.multiply(-1, math.identity(this.n)._data);
        let id2 = math.identity(this.n)._data;
        this.abIneq = math.concat(math.concat(id1, wLows), math.concat(id2, wHighs), 0);
        if (k.length === 1) {
            this.abIneq.splice(k[0], 1);
            this.abIneq.splice(k[0] + this.n - 1, 1);
        }
        
        //act-inact
        this.abAct = this.abEq.slice(0);
        this.abInact = this.abIneq.slice(0);
    }
    
    static whichNotZero(arr) {
        let k = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== 0) k.push(i);
        }
        return k;
    }
    
    static getA(ab) {
        let a = math.subset(ab, math.index(math.range(0, math.size(ab)[0]), math.range(0, math.size(ab)[1] - 1)));
        return a;
    }

    static getB(ab) {
        return math.column(ab, math.size(ab)[1] - 1);
    }
    
    static getIndices(arr, val) {
        var indices = [], i = -1;
        while ((i = arr.indexOf(val, i+1)) !== -1){
            indices.push(i);
        }
        return indices;
    }

    static moveRows(matrixFrom, matrixTo, indices) {
        indices.sort(function(a,b){return a-b;});
        while(indices.length) {
            let i = indices.pop();
            matrixTo.push(matrixFrom[i]);
            matrixFrom.splice(i, 1);
        }
    }

    getAlfas(d) {
        let b = Port.getB(this.abInact);
        let a = Port.getA(this.abInact);
        let x = math.multiply(a, d);
        let y = math.subtract(b, math.multiply(a, this.w));
        let alfas = new Array(x.length).fill(math.Infinity);
        for (let i = 0; i < x.length; i++) {
            if (x[i][0] > 0) {
                if (y[i][0] > 0) alfas[i] = y[i][0] / x[i][0];
                else alfas[i] = 0;
            }
        }
        return alfas;
    }

    getAlfaOptim(d, alfaMax) {
        let a = math.multiply(math.transpose(d), this.cov, d)[0][0];
        let b = math.multiply(math.transpose(this.w), this.cov, d)[0][0] + 
                math.multiply(math.transpose(d), this.cov, this.w)[0][0];
        let alfaOptim = -b/2/a;
        if (alfaOptim < 0) alfaOptim = 0;
        if (alfaOptim > alfaMax) alfaOptim = alfaMax;
        return alfaOptim;
    }
    
    checkAbEq() {
        let aEq = Port.getA(this.abEq);
        let g = math.multiply(aEq, math.transpose(aEq));
        return this.n > this.abEq.length && math.det(g) !== 0;
    }
    
    calcDir() {
        let aError = false;
        let l, p, grad, d, lambdas, dAbs, dError = null;
        let id = math.identity(this.n)._data;
        let a = Port.getA(this.abAct);
        if (math.size(a)[0] > math.size(a)[1]) aError = true;
        else {
            l = math.multiply(math.inv(math.multiply(a, math.transpose(a))), a);
            p = math.subtract(id, math.multiply(math.transpose(a), l));
            grad = math.multiply(2, this.cov, this.w);
            d = math.multiply(-1, p, grad);
            dAbs = math.sum(math.abs(d));
            dError = math.multiply(math.transpose(grad), d)[0][0] > 0;
            lambdas = math.multiply(-1, l, grad);
        }
        return {aError: aError, p: p, grad: grad, d: d, dAbs: dAbs, dError: dError, lambdas: lambdas};
    }
    
    getW(digits=4) {
        let w = math.round(this.w, digits);
        let w2 = math.transpose(w)[0];
        let wMax = math.max(w2);
        let iMax = w2.indexOf(wMax);
        w[iMax][0] = 1 - math.sum(w2) + wMax;
        return w;
    }
    
    optimize(dZero=0.01, innerHopsMax=100, hopsMax=1000) {
        if (this.checkAbEq()) {
            let hops, innerHops = 0;
            while(true) {
                hops++;
                let dir = this.calcDir();
                if (dir.aError) {
                    console.log('OPTIM WARNING: too many constraints');
                    break;
                }
                if (hops === 1 || (dir.dAbs > dZero && !dir.dError && innerHops <= innerHopsMax)) {
                    innerHops++;
                    let alfas = this.getAlfas(dir.d);
                    let alfaOptim = this.getAlfaOptim(dir.d, math.min(alfas));
                    let indicesToInclude = Port.getIndices(alfas, alfaOptim);
                    Port.moveRows(this.abInact, this.abAct, indicesToInclude);
                    this.w = math.add(this.w, math.multiply(alfaOptim, dir.d));
                } else {
                    if (this.abAct.length > this.abEq.length) {
                        innerHops = 0;
                        let lambdas = math.transpose(dir.lambdas)[0];
                        lambdas.splice(0, this.abEq.length);
                        let lambdaMin = math.min(lambdas);
                        if (lambdaMin < 0) {
                            let indexToExclude = lambdas.indexOf(lambdaMin) + this.abEq.length;
                            Port.moveRows(this.abAct, this.abInact, [indexToExclude]);
                        } else break;
                    } else break;
                }
                if (hops > hopsMax) {
                    console.log('OPTIM WARNING: too long loop');
                    break;
                }
            }
        }
    }
    
    getVol() {
        return math.sqrt(math.multiply(math.transpose(this.w), this.cov, this.w)[0][0]);
    }
    
    makeCurve(numOfPoints) {
        let rMin = math.min(this.r);
        let rMax = math.max(this.r);
        let rhos = math.range(rMin, rMax, (rMax - rMin) / (numOfPoints - 1))._data;
        rhos.push(rMax);
        let vols = [];
        for (let rho of rhos) {
            this.reset(rho);
            this.optimize();
            vols.push(this.getVol());
        }
        return {rhos: rhos, vols:vols};
    }

}

