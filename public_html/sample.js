
export {resample, setSampleRefresh};

function resample(glob, forEmpty) {
    if (forEmpty || glob.table.port.matrix.length > 1) {
        glob.html.resampButton.disabled = true;
        glob.html.thinker2.style.visibility = "visible";
        window.setTimeout(function() {
            for (let c of glob.curList) {
                glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
            };
            glob.table.port.refreshSummary();
            glob.html.thinker2.style.visibility = "hidden";
            glob.html.resampButton.disabled = false;
        }, 50);
    }
}

function setSampleRefresh(glob) {
    glob.html.resampButton.addEventListener("click", function() {
        resample(glob, false);
    });
}
