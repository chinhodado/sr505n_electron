let Highcharts = require('highcharts');
let cheerio = require('cheerio');
let net = require('net');

function fetchRouterData(callback, series) {
    let socket = net.connect(80, '192.168.1.1', function () {
        let request = 'GET /admin/statswan.cmd HTTP/1.1\n' +
            'Host: 192.168.1.1\n' +
            'Authorization: Basic ' + localStorage.getItem('apiKey');
        let rawResponse = "";
        // send http request:
        socket.end(request);
        // assume utf-8 encoding:
        socket.setEncoding('utf-8');
        // collect raw http message:
        socket.on('data', function (chunk) {
            rawResponse += chunk;
        });
        socket.on('end', function () {
            // console.log(rawResponse);
            let $ = cheerio.load(rawResponse);
            let cells = $('tr').eq(2).find('td');
            let bytesReceived = cells.eq(2).text();
            let bytesSent = cells.eq(6).text();
            callback(+bytesReceived, +bytesSent, series);
        });
    });
}

let allBytesReceived = [];
let allBytesSent = [];

function processData(bytesReceived, bytesSent, series) {
    allBytesReceived.push(bytesReceived);
    allBytesSent.push(bytesSent);
    if (allBytesReceived.length < 2) {
        return;
    }
    let bytesReceivedLastSec = allBytesReceived[allBytesReceived.length - 1] - allBytesReceived[allBytesReceived.length - 2];
    let mbReceivedLastSec = bytesReceivedLastSec / 1024 / 1024;
    console.log("Speed: " + mbReceivedLastSec + "MB/s");

    let x = (new Date()).getTime(); // current time
    series.addPoint([x, mbReceivedLastSec], true, true);
}

function makeRouterGraph() {
    Highcharts.chart('graph-container3', {
        chart: {
            type: 'spline',
            animation: false, // don't animate in old IE
            marginRight: 10,
            events: {
                load: function () {

                    // set up the updating of the chart each second
                    let series = this.series[0];
                    setInterval(function () {
                        fetchRouterData(processData, series)
                    }, 1000);
                }
            }
        },

        time: {
            useUTC: false
        },

        title: {
            text: 'Internet download rate (MB/s)'
        },

        accessibility: {
            announceNewData: {
                enabled: true,
                minAnnounceInterval: 15000,
                announcementFormatter: function (allSeries, newSeries, newPoint) {
                    if (newPoint) {
                        return 'New point added. Value: ' + newPoint.y;
                    }
                    return false;
                }
            }
        },

        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150
        },

        yAxis: {
            title: {
                text: 'Download rate (MB/s)'
            },
            plotLines: [{
                value: 0,
                width: 1,
                color: '#808080'
            }]
        },

        tooltip: {
            headerFormat: '<b>{series.name}</b><br/>',
            pointFormat: '{point.x:%Y-%m-%d %H:%M:%S}<br/>{point.y:.2f}'
        },

        legend: {
            enabled: false
        },

        exporting: {
            enabled: false
        },

        series: [{
            name: 'Download rate',
            data: (function () {
                // generate an array of random data
                let data = [];
                let time = (new Date()).getTime();

                for (let i = -59; i <= 0; i += 1) {
                    data.push({
                        x: time + i * 1000,
                        y: 0
                    });
                }
                return data;
            }())
        }]
    });
}