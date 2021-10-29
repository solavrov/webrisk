/* global firebase, math */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {indexOf, getCol} from "./funs.js";

const DAYS_IN_YEAR = 250;
const ALFA_95 = -1.645;
const ALFA_99 = -2.326;
const ACCURACY = 1;

// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDA2rvK4pmbmstno1_ixUsM954Z9xSIa0E",
    authDomain: "risk-ffdb5.firebaseapp.com",
    databaseURL: "https://risk-ffdb5-default-rtdb.firebaseio.com",
    projectId: "risk-ffdb5",
    storageBucket: "risk-ffdb5.appspot.com",
    messagingSenderId: "845497685508",
    appId: "1:845497685508:web:4b6d56013c72ec89188751",
    measurementId: "G-KE20BBK7DT"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
//firebase.analytics();
// Get database reference
const dbRef = firebase.database().ref();

let body  = document.getElementById("body");
let loader = document.getElementById("loader");
let updateInfo  = document.getElementById("updateInfo");
let assetBox = document.getElementById("assetBox");
let portBox = document.getElementById("portBox");

dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        loader.style.visibility = "hidden";
        body.style.visibility = "visible";

        //getting data
        updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
        let tickers = snapshot.child("tickers").val();
        let erRub = math.round(snapshot.child("er_rub").val(), ACCURACY);
        let covRub = math.multiply(snapshot.child("cov_rub").val(), DAYS_IN_YEAR);
        let sigmaRub = math.round(math.sqrt(math.diag(covRub)), ACCURACY);
        let var95Rub = math.round(math.add(erRub, math.multiply(sigmaRub, ALFA_95)), ACCURACY);
        var95Rub = math.dotMultiply(math.isNegative(var95Rub), var95Rub);
        let var99Rub = math.round(math.add(erRub, math.multiply(sigmaRub, ALFA_99)), ACCURACY);
        var99Rub = math.dotMultiply(math.isNegative(var99Rub), var99Rub);
        let assetMatrix = math.transpose([tickers, sigmaRub, var95Rub, var99Rub, erRub]);

        //building linked tables
        let assetHeader = ["Ticker", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let assetAligns = ["center", "right", "right", "right", "right", "right"];
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];

        let assetTable = new SideTable(assetHeader, "st", "linked", assetAligns, "Assets");
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");

        let assetToPort = function(row) {
            let r = [];
            r.push(row[0]);
            r.push(100);
            r.push(0);
            r.push(row[1]);
            r.push(row[2]);
            r.push(row[3]);
            r.push(row[4]);
            return r;
        };

        let portToAsset = function(row) {
            let i = tickers.indexOf(row[0]);
            let r = [];
            r.push(tickers[i]);
            r.push(sigmaRub[i]);
            r.push(var95Rub[i]);
            r.push(var99Rub[i]);
            r.push(erRub[i]);
            return r;
        };
        
        portTable.link(assetTable, portToAsset, assetToPort);

        let recalculator = function(m) {
            if (m.length > 1) {
                let c = math.subset(m, math.index(math.range(1, m.length), 1));
                let c2 = math.round(math.multiply(c, 1 / math.sum(c)), 3);
                m = math.subset(m, math.index(math.range(1, m.length), 2), c2);
            }
            return m;
        };
        
        portTable.addRecalculator(recalculator);

        let summarizer = function(m) {
            //["Ticker", "Money", "Share", "Volatility", "VaR_95%", "VaR_99%", "Expected return"]
            let s1 = 0;
            let s2 = 0;
            let s3 = 0;
            let s4 = 0;
            let s5 = 0;
            let s6 = 0;
            if (m.length > 1) {
                m.shift();
                s1 = math.sum(math.column(m, 1));
                let w = math.column(m, 2);
                s2 = math.round(math.sum(w), 1);
                let i = indexOf(tickers, getCol(m, 0));
                let cov = math.subset(covRub, math.index(i, i));
                s3 = math.sum(math.round(math.sqrt(math.multiply(math.transpose(w), cov, w)), 1));
                s6 = math.sum(math.round(math.multiply(math.transpose(w), math.column(m, 6)), 1));
                s4 = math.round(ALFA_95 * s3 + s6, 1);
                s4 = (s4 < 0) * s4;
                s5 = math.round(ALFA_99 * s3 + s6, 1);
                s5 = (s5 < 0) * s5;
            }
            return ["TOTAL", s1, s2, s3, s4, s5, s6];
        };
        
        portTable.addSummary(summarizer);

        portTable.addInput(1);

        assetTable.appendMatrix(assetMatrix);

        assetBox.appendChild(assetTable.table);
        portBox.appendChild(portTable.table);








    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
