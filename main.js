var config = require("./config"); // Nab our settings file (make sure you make one based off of config-sample.js)
var sphero = require("sphero"); // Get the main Sphero SDK module
var notifier = require("node-notifier"); // Tie into desktop notifications
var path = require("path");
var exec = require("child_process").exec
var request = require("request-json");
var player = require("play-sound")(opts = {}); // opts is important
var client = request.createClient("http://localhost:8888/");

var bb8 = sphero(config.BLE); // Configure your BB-8's BLE address in the config.js file

var direction;
var moveChance = 0.25;
var circleInterval = 5000;

notify("hello", "Hello there!");
player.play("sounds/beep-beep.mp3");

// Check Circle every few seconds for recent build statuses
setInterval(function() {
    checkCircle();
}, circleInterval);

console.log("Looking for BB-8...");

bb8.connect(function() {
    console.log("Found BB-8!");
    flash("blue", 1000); // Flash BB-8's light so we know he's listening

    // Every so often, there's a certain chance he'll move his head
    setInterval(function() {
        if (Math.random() <= moveChance) {
            // Pick a random direction
            direction = Math.floor(Math.random() * 360);
            bb8.roll(25, direction);

            setTimeout(function() {
                bb8.roll(0, direction); // Stop rolling after moving head
            }, 350);
        }
    }, 3000);
});

function flash(color, duration) {
    if (!duration) {
        duration = 5000;
    }

    bb8.color(color);

    setInterval(function() {
        bb8.color("black"); // Blank BB-8's light
    }, duration);
}

function headShake() {
    var timeSpacing = 250;
    var lowerBound = 45;
    var upperBound = 315;

    bb8.roll(motorPower, lowerBound);
    setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing);
    setTimeout(function() {
        bb8.roll(0, lowerBound);
    }, timeSpacing * 2);
    setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing * 3);
    setTimeout(function() {
        bb8.roll(0, lowerBound);
    }, timeSpacing * 4);
    setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing * 5);
    setTimeout(function() {
        bb8.roll(0, 0); // Stop rolling and rotating
    }, timeSpacing * 6);
}

function headNod() {
    var timeSpacing = 200;
    var motorPower = 90;

    bb8.setRawMotors({
        lmode: 2,
        lpower: motorPower,
        rmode: 2,
        rpower: motorPower
    });

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing);

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 2,
            lpower: motorPower,
            rmode: 2,
            rpower: motorPower
        });
    }, timeSpacing * 2);

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing * 3);

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 2,
            lpower: motorPower,
            rmode: 2,
            rpower: motorPower
        });
    }, timeSpacing * 4);

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing * 5);

    setTimeout(function() {
        bb8.setRawMotors({
            lmode: 0,
            lpower: 0,
            rmode: 0,
            rpower: 0
        });

        bb8.setStabilization(1); // Turn stabilization back on in case BB-8 isn't in his dock
    }, timeSpacing * 6);
}

function buildFailed() {
    headShake();
    flash("red");
    player.play("sounds/uh-oh.mp3");
}

function buildSuceeded() {
    headNod();
    flash("green");
    player.play("sounds/he-he.mp3");
}

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
                        buildFailed();
                        notify("failure", body[i].reponame + "'s build of the " + body[i].branch + " branch failed!", body[i].build_url);
                    } else {
                        buildSuceeded();
                        notify("success", body[i].reponame + "'s build of the " + body[i].branch + " branch succeeded!", body[i].build_url);
                    }
                }
            }
        }
    });
}

function notify(status, message, url) {
    var icon = "images/icon.png";

    if (status == "hello") {
        icon = "images/icon-success.png";
    } else if (status == "success") {
        icon = "images/icon-success.png";
    } else if (status == "failure") {
        icon = "images/icon-failure.png";
    }

    notifier.notify({
        title: "BB-8",
        message: message,
        open: url, // URL to open on click
        sender: " ",
        icon: path.join(__dirname, icon),
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
