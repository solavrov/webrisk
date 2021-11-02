/* global firebase, math */

import {SideTable} from "./SideTable.js";
import {CentralTable} from "./CentralTable.js";
import {indexOf, getCol, insert} from "./funs.js";

const DAYS_IN_YEAR = 250;
const ALFA_95 = -1.645;
const ALFA_99 = -2.326;
const ACCURACY = 1;
const CURRENCIES = ['rub', 'usd', 'eur'];

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
let curPick = document.getElementsByName("curPick");

dbRef.child("data").get().then((snapshot) => {
  
    if (snapshot.exists()) {
        loader.style.visibility = "hidden";
        body.style.visibility = "visible";

        //getting data
        updateInfo.innerHTML = "<b>Last update:</b> " + snapshot.child("refresh_time").val();
        let tickers = snapshot.child("tickers").val();
        let er = {};
        let cov = {};
        let sigma = {};
        let var95 = {};
        let var99 = {};
        let assetMatrices = {};
        for (let c of CURRENCIES) {
            er[c] = math.round(snapshot.child("er_" + c).val(), ACCURACY);
            cov[c] = math.multiply(snapshot.child("cov_" + c).val(), DAYS_IN_YEAR);
            sigma[c] = math.round(math.sqrt(math.diag(cov[c])), ACCURACY);
            var95[c] = math.round(math.add(er[c], math.multiply(sigma[c], ALFA_95)), ACCURACY);
            var95[c] = math.dotMultiply(math.isNegative(var95[c]), var95[c]);
            var99[c] = math.round(math.add(er[c], math.multiply(sigma[c], ALFA_99)), ACCURACY);
            var99[c] = math.dotMultiply(math.isNegative(var99[c]), var99[c]);
            assetMatrices[c] = math.transpose([tickers, sigma[c], var95[c], var99[c], er[c]]);
        }
        let cur = 'rub';
        
        //building asset table
        let assetHeader = ["Ticker", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let assetAligns = ["center", "right", "right", "right", "right", "right"];
        let assetTable = new SideTable(assetHeader, "st", "linked", assetAligns, "Assets");
        assetTable.appendMatrix(assetMatrices[cur]);
        
        //building port table
        let portHeader = ["Ticker", "Money", "Share", "Volatility", "VaR_95%", "VaR_99%", "Expected return"];
        let portAligns = ["center", "right", "right", "right", "right", "right", "right"];
        let portTable = new CentralTable(portHeader, "linked", "port", portAligns, "Portfolio");
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
                let subcov = math.subset(cov[cur], math.index(i, i));
                s3 = math.sum(math.round(math.sqrt(math.multiply(math.transpose(w), subcov, w)), 1));
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
        
        //linking tables
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
            r.push(sigma[cur][i]);
            r.push(var95[cur][i]);
            r.push(var99[cur][i]);
            r.push(er[cur][i]);
            return r;
        };
        portTable.link(assetTable, portToAsset, assetToPort);
        
        //appending tables to html
        assetBox.appendChild(assetTable.table);
        portBox.appendChild(portTable.table);
        
        //changing currency
        let refreshTableCur = function(table, iTo) {
            let jFrom = indexOf(tickers, getCol(table.matrix, 0));
            jFrom.shift();
            if (jFrom.length > 0) {
                let iFrom = [1, 2, 3, 4];
                let jTo = math.range(1, table.matrix.length);
                table.matrix = insert(assetMatrices[cur], table.matrix, math.index(jFrom, iFrom), math.index(jTo, iTo));
                table.syncTableWithMatrix();
            }
        };

        curPick.forEach((elem) => elem.addEventListener("click", function(event) {
            cur = event.target.value;
            refreshTableCur(assetTable, [1, 2, 3, 4]);
            refreshTableCur(portTable, [3, 4, 5, 6]);
            portTable.refreshSummary();
        }));

        






    } else {
      console.log("No data available");
    }
}).catch((error) => {
  console.error(error);
});
