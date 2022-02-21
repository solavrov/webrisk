
/* global google, math */

import {Matrix} from "./Matrix.js";

export {buildPathChart};

function buildPathChart(glob) {
    google.charts.setOnLoadCallback(initPath);
    function initPath() {
        let chart = new google.visualization.ComboChart(glob.html.pathChart);
        let options0 = {
            hAxis: {    
                title: 'days',
                titleTextStyle: { italic: false },
                viewWindow: { 
                    min: 0, 
                    max: glob.chart.path.tPoints.mult(glob.hor * 1.01).last() 
                }
            },
            vAxis: {
                title: 'return',
                titleTextStyle: { italic: false },
                minValue: -1,
                maxValue: 1
            },
            series: {
                0: { type: 'line', color: 'blue', pointShape: 'circle', pointSize: 5 },
                1: { type: 'area'}
            },
            lineWidth: 2,
            width: 600,
            height: 360,
            chartArea: {width: 500, height: 300},
            legend: { position: 'none' },
            intervals: { 
                style: 'bars',
                barWidth: 0.2,
                lineWidth: 2
            },
            animation: {
                duration: 300,
                startup: true
            }
        };
        let options = {...options0};
        options.intervals = { 
            style: 'bars',
            barWidth: glob.chart.path.numSteps / 25 * 1.2,
            lineWidth: 2
        };
        delete options.animation;
        function makeData(isPath) {
            let d = [];
            let tPoints = glob.chart.path.tPoints.mult(glob.hor);
            if (glob.table.port.matrix.length > 1) {
                let matrix = new Matrix(glob.table.port.matrix).decap();
                let er = matrix.cols(5).mult(0.01); //!!!
                let money = matrix.cols(1); //!!!
                let w = money.mult(1 / money.sum());
                let qcc5 = math.log(1 + glob.data.portSample.q(0.05) / 100);
                let qcc95 = math.log(1 + glob.data.portSample.q(0.95) / 100);
                let indices = glob.data.tickers.fiof(matrix.cols(0));
                let sigmacc = glob.data.sigmacc[glob.cur].t().rows(indices).mult(0.01);
                let ercc = er.plus(1).log().minus(sigmacc.sq().mult(0.5));
                let erccAvg = ercc.t().mult(w).val();
                let times = tPoints.mult(1 / glob.daysYear / glob.hor);
                d = [
                    tPoints.arr[0],
                    w.t().mult(er.plus(1).pow(times)).minus(1).mult(100).round(glob.chart.path.accEr).arr[0],
                    times.mult(erccAvg).plus(times.sqrt().mult(qcc5-erccAvg)).exp().minus(1).mult(100).round(glob.chart.path.accQ).arr[0],
                    times.mult(erccAvg).plus(times.sqrt().mult(qcc95-erccAvg)).exp().minus(1).mult(100).round(glob.chart.path.accQ).arr[0]
                ];
                let tips = [];
                for (let i = 0; i < tPoints.ncol(); i++) {
                    tips.push("expected return " + d[1][i] + "\n90% in [" + d[2][i] + ", " + d[3][i] + "]");
                }
                d.push(tips);
                let nullArr = new Array(tPoints.ncol()).fill(null);
                d.splice(d.length, 0, nullArr, nullArr);
                d = math.transpose(d);
                if (isPath) {
                    let covcc = glob.data.covcc[glob.cur].sub(indices).mult(0.0001);
                    let n = glob.chart.path.numSteps;
                    let r = w.t().mult(covcc.sample(n).mult(math.sqrt(1/n)).plus(ercc.mult(1/n)).cumsum().exp().minus(1).mult(100)).arr[0];
                    let t = Matrix.zeros(1, n).plus(tPoints.last() / n).cumsum().arr[0];                        
                    d.push([0, null, null, null, null, 0, 'color: green']);
                    for (let i = 0; i < r.length; i++) {
                        if (r[i] >= 0) d.push([t[i], null, null, null, null, r[i], 'color: green']);
                        if (r[i] < 0) d.push([t[i], null, null, null, null, r[i], 'color: red']);
                    }
                }
            }             
            return d;
        }
        function makeChartData() {
            let data = new google.visualization.DataTable();
            data.addColumn('number', 'time');
            data.addColumn('number', 'mean');
            data.addColumn({type:'number', role:'interval'});
            data.addColumn({type:'number', role:'interval'});
            data.addColumn({type:'string', role:'tooltip'});
            data.addColumn('number', 'return');
            data.addColumn({type: 'string', role: 'style'});
            return data;
        }
        function draw0() {
            let d = makeData(false);
            let data = makeChartData();
            data.addRows(d);
            chart.draw(data, options0);
        }
        function draw() {
            if (glob.table.port.matrix.length > 1) {
                glob.html.pathButton.disabled = true;
                let d = makeData(true);
                let data = makeChartData();
                for (let i = 0; i < glob.chart.path.tPoints.ncol(); i++) data.addRows([d[i]]);
                function go(j, k) {
                    if (k > d.length) k = d.length;
                    for (let i = j; i < k; i++) data.addRows([d[i]]);
                    chart.draw(data, options);
                    setTimeout(function() {    
                        if (k < d.length) go(k, k + glob.chart.path.animStep);
                        else glob.html.pathButton.disabled = false;
                    }, glob.chart.path.animDelay);
                }
                go(glob.chart.path.tPoints.ncol(), glob.chart.path.tPoints.ncol() + glob.chart.path.animStep);
            }
        }
        draw0();
        let title = document.createElement('div');
        title.className = 'chartTitle';
        title.innerHTML = 'Portfolio path';
        glob.html.pathChart.childNodes[0].childNodes[0].append(title);
        document.addEventListener("summarized", draw0);
        glob.html.pathButton.addEventListener("click", draw);
    }
}
