
/* global google */

export {buildDistChart};

function buildDistChart(glob) {
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
    google.charts.setOnLoadCallback(initDist);
    function initDist() {
        let options = {               
            legend: { position: 'none' },
            width: 600,
            height: 360,
            chartArea: {width: 500, height: 300},
            animation: {
                duration: 300,
                startup: true
            },
            bar: { 
               groupWidth: '100%'
            },
            hAxis: {
                title: 'returns',
                baselineColor: 'none',
                titleTextStyle: {
                    italic: false
                }
            },
            vAxis: {
                title: 'outcomes',
                titleTextStyle: {
                    italic: false
                },
                minValue: 0,
                maxValue: 1
            }                
        };
        let chart = new google.visualization.ColumnChart(glob.html.distChart);
        function draw() {
            let maxVal = 200;
            let step = 5;
            if (glob.hor > 1) {
                maxVal = 1000;
                step = 20;
            }
            let data = makeHistogramData(glob.data.portSample.arr[0], -100, maxVal, step);
            let dataTable = new google.visualization.DataTable();
            dataTable.addColumn('number', 'x');
            dataTable.addColumn('number', 'y');
            dataTable.addColumn({type: 'string', role: 'tooltip'});
            dataTable.addColumn({type: 'string', role: 'style'});
            dataTable.addRows(data);
            chart.draw(dataTable, options);
        }
        draw();
        let title = document.createElement('div');
        title.className = 'chartTitle';
        title.innerHTML = 'Distribution of returns';
        glob.html.distChart.childNodes[0].childNodes[0].append(title);
        document.addEventListener("summarized", draw);
    }
}

