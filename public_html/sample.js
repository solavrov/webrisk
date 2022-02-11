
export {resample, setSampleRefresh};

function resample(glob, forEmpty) {
    if (forEmpty || glob.table.port.matrix.length > 1) {
        glob.html.resampButton.disabled = true;
        glob.html.sampPick.forEach((elem) => elem.disabled = true);
        glob.html.thinker2.style.visibility = "visible";
        glob.html.thinker3.style.visibility = "visible";
        window.setTimeout(function() {
            for (let c of glob.curList) {
                glob.data.sample[c] = glob.data.covcc[c].sample(glob.sampleSize).mult(0.01).exp();
            };
            glob.table.port.refreshSummary();
            glob.html.thinker2.style.visibility = "hidden";
            glob.html.thinker3.style.visibility = "hidden";
            glob.html.resampButton.disabled = false;
            glob.html.sampPick.forEach((elem) => elem.disabled = false);
        }, 1);
    }
}

function setSampleRefresh(glob) {
    glob.html.resampButton.addEventListener("click", function() {
        resample(glob, false);
    });
}
