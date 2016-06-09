var config = require("./config"); // Nab our settings file (make sure you make one based off of config-sample.js)
var sphero = require("sphero"); // Get the main Sphero SDK module
var notifier = require("node-notifier"); // Tie into desktop notifications
var path = require('path');
var exec = require('child_process').exec
var request = require('request-json');
var client = request.createClient('http://localhost:8888/');

var bb8 = sphero(config.BLE); // Configure your BB-8's BLE address in the config.js file

var circleInterval = 5000;

notify("Hello there!");

// Check Circle every few seconds for recent build statuses
setInterval(function() {
    checkCircle();
}, circleInterval);

console.log("Looking for BB-8...");

var headPower = 7;
var moveChance = 0.25;

bb8.connect(function() {
    console.log("Found BB-8!");

    // Flash BB-8's light so we know he's listening
    bb8.color("purple");

    setInterval(function() {
        bb8.color("black"); // Blank BB-8's light
    }, 1000);

    // Every so often, there's a certain chance he'll move his head
    setInterval(function() {
        if (Math.random() <= moveChance) {
            // Pick a random direction
            var direction = Math.floor(Math.random() * 360);
            bb8.roll(headPower, direction);
        }
    }, 25000);
});

function checkCircle() {
    client.get("https://circleci.com/api/v1/recent-builds?circle-token=" + config.CircleToken, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var cutoffTime = new Date();
            cutoffTime.setSeconds(cutoffTime.getSeconds() - circleInterval / 1000);

            for (var i = 0; i < body.length; i++) {
                var compareTime = new Date(body[i].stop_time);

                if (compareTime > cutoffTime) {
                    console.log("Recent build found");

                    if (body[i].failed) {
                        notify(body[i].reponame + "'s build failed!", body[i].build_url);
                    } else {
                        notify(body[i].reponame + "'s build succeeded!", body[i].build_url);
                    }
                }
            }
        }
    });
}

function notify(message, url) {
    notifier.notify({
        title: "BB-8",
        message: message,
        open: url, // URL to open on click
        sender: " ",
        icon: path.join(__dirname, "images/icon.png"),
        sound: false,
        wait: false // Wait with callback, until user action is taken against notification
    }, function(err, response) { // Response is the response from the notification
        if (response == "activate" && url) {
            exec("/usr/bin/open -a '/Applications/Google Chrome.app' '" + url + "'", function(err) { // This is supposed to be a native feature of node-notifier, but I couldn't get it working
                if (err) {
                    console.log(err);
                }
            });
        }
    });
}
