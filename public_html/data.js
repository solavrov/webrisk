
import {Matrix} from "./Matrix.js";

export {getDataFromFB};

function getDataFromFB(snapshot, glob) {
    glob.html.updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
    glob.data.tickers = new Matrix(snapshot.child("tickers").val());
    glob.data.types = new Matrix(snapshot.child("types").val());
    glob.data.names = new Matrix(snapshot.child("names").val());

    for (let c of glob.curList) {
        glob.data.er[c] = new Matrix(snapshot.child("er_" + c).val()).round(glob.accEr);
        glob.data.cov[c] = new Matrix(snapshot.child("cov_" + c).val());
        glob.data.ercc[c] = new Matrix(snapshot.child("ercc_" + c).val()).round(glob.accEr);
        glob.data.covcc[c] = new Matrix(snapshot.child("covcc_" + c).val());
        glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
        glob.data.sigma[c] = glob.data.cov[c].diag().t().sqrt().round(glob.accQ);            
        glob.data.sigmacc[c] = glob.data.covcc[c].diag().t().sqrt();            
        glob.data.var95[c] = glob.data.sigmacc[c].mult(glob.alfa95).plus(glob.data.ercc[c]).toSimp().round(glob.accQ);
        glob.data.var99[c] = glob.data.sigmacc[c].mult(glob.alfa99).plus(glob.data.ercc[c]).toSimp().round(glob.accQ);
        glob.data.assetMatrices[c] = glob.data.tickers.
                insrow(glob.data.names).
                insrow(glob.data.sigma[c]).
                insrow(glob.data.var95[c]).
                insrow(glob.data.var99[c]).
                insrow(glob.data.er[c]).t();
    }
}


