
import {Matrix} from "./Matrix.js";

export {getDataFromFB};

function getDataFromFB(snapshot, glob) {
    glob.html.updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
    glob.data.tickers = new Matrix(snapshot.child("tickers").val());
    glob.data.types = new Matrix(snapshot.child("types").val());
    glob.data.names = new Matrix(snapshot.child("names").val());
    for (let c of glob.curList) {
        glob.data.ercc0[c] = new Matrix(snapshot.child("ercc_" + c).val());
        glob.data.covcc0[c] = new Matrix(snapshot.child("covcc_" + c).val());
        glob.data.er0[c] = new Matrix(snapshot.child("er_" + c).val()).round(glob.accEr);
    }
    calcData(glob);
}

function calcData(glob) {
    for (let c of glob.curList) {
        glob.data.covcc[c] = glob.data.covcc0[c].mult(glob.hor);
        glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();      
        glob.data.sigmacc[c] = glob.data.covcc[c].diag().t().sqrt();
        let ercc = glob.data.ercc0[c].mult(glob.hor);
        let er = glob.data.er0[c].mult(0.01).plus(1).pow(glob.hor).minus(1).mult(100).round(glob.accEr);
        let var95 = glob.data.sigmacc[c].mult(glob.alfa95).plus(ercc).toSimp().round(glob.accQ);
        let up95 = glob.data.sigmacc[c].mult(-glob.alfa95).plus(ercc).toSimp().round(glob.accQ);
        glob.data.assetMatrices[c] = glob.data.tickers.
                insrow(glob.data.names).
                insrow(var95).
                insrow(up95).
                insrow(er).t();
    }
}
