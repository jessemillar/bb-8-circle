/*
Note: Even though this code is written with the BB-8 Sphero in mind,
      it should work with all Spheros supported by the JavaScript SDK
*/

var config = require("./config"); // Nab our settings file (make sure you make one based off of config-sample.js)
var sphero = require("sphero"); // Get the main Sphero SDK module
var notifier = require("node-notifier"); // Tie into desktop notifications
var path = require('path');
var request = require('request');

var bb8 = sphero(config.BLE); // Configure your BB-8"s BLE address in the config.js file

// Test the desktop notification function
notifier.notify({
    title: "BB-8",
    message: "Hello, world! You look wonderful today.",
    icon: path.join(__dirname, "images/icon.png"),
    sound: false,
    wait: false // Wait with callback, until user action is taken against notification
}, function(err, response) {
    // Response is response from notification
});

checkCircle();

console.log("Looking for BB-8...");

var headPower = 7;
var moveChance = 0.25;

bb8.connect(function() {
    console.log("Found BB-8!");

    // Flash BB-8"s light so we know he"s listening
    bb8.color("purple");

    setInterval(function() {
        bb8.color("black");
    }, 1000);

    // Every second, there"s a certain chance he"ll move his head
    setInterval(function() {
        if (Math.random() <= moveChance) {
            // Pick a random direction
            var direction = Math.floor(Math.random() * 360);
            bb8.roll(headPower, direction);
        }
    }, 2000);
});

function checkCircle() {
    request("https://circleci.com/api/v1/recent-builds?circle-token=" + config.CircleToken, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    });
}
