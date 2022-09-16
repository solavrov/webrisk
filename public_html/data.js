
import {Matrix} from "./Matrix.js";

export {getDataFromFB, calcData};

function getDataFromFB(snapshot, glob) {
    glob.html.updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
    glob.data.tickers = new Matrix(snapshot.child("tickers").val());
    glob.data.types = new Matrix(snapshot.child("types").val());
    glob.data.names = new Matrix(snapshot.child("names").val());
    for (let c of glob.curList) {
        glob.data.ercc1[c] = new Matrix(snapshot.child("ercc_" + c).val());
        glob.data.covcc1[c] = new Matrix(snapshot.child("covcc_" + c).val());
        glob.data.er1[c] = new Matrix(snapshot.child("er_" + c).val()).round(glob.accEr);
        glob.data.ercc10[c] = new Matrix(snapshot.child("ercc_" + c + "_10").val());
        glob.data.covcc10[c] = new Matrix(snapshot.child("covcc_" + c + "_10").val());
        glob.data.er10[c] = new Matrix(snapshot.child("er_" + c + "_10").val()).round(glob.accEr);
    }
    calcData(glob);
}

function calcData(glob) {
    for (let c of glob.curList) {
        let ercc;
        let er;
        if (glob.hor === 1) {
            glob.data.covcc[c] = glob.data.covcc1[c];
            ercc = glob.data.ercc1[c];
            er = glob.data.er1[c];
        } else if (glob.hor === 10) {
            glob.data.covcc[c] = glob.data.covcc10[c];
            ercc = glob.data.ercc10[c];
            er = glob.data.er10[c];
        }
        glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
        glob.data.sigmacc[c] = glob.data.covcc[c].diag().t().sqrt();
        let var95 = glob.data.sigmacc[c].mult(glob.alfa95).plus(ercc).toSimp().round(glob.accQ);
        let up95 = glob.data.sigmacc[c].mult(-glob.alfa95).plus(ercc).toSimp().round(glob.accQ);
        glob.data.assetMatrices[c] = glob.data.tickers.
                insrow(glob.data.names).
                insrow(var95).
                insrow(up95).
                insrow(er).t();
    }
}
