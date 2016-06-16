var config = require("./config"); // Nab our settings file (make sure you make one based off of config-sample.js)
var sphero = require("sphero"); // Get the main Sphero SDK module
var notifier = require("node-notifier"); // Tie into desktop notifications
var path = require("path"); // Allow access to files on the local filesystem
var exec = require("child_process").exec; // Used to open Chrome on notification click
var player = require("play-sound")(opts = {}); // `opts` is important
var request = require("request-json"); // Checks Circle via the Circl API
var client = request.createClient("http://localhost:8888/"); // Actually checks Circle

var bb8 = sphero(config.BLE); // Configure your BB-8's BLE address in the config.js file

var direction;
var lookChance = 0.25; // The percentage chance that BB-8 will look somewhere new
var lookInterval = 1000; // How often to look around
var circleInterval = 5000; // How often to check Circle for new builds
var babbleChance = 0.1;
var babbleInterval = 10000; // How often to possibly say a random phrase

var quotes = [{
    quote: "Boh boh boh buh bee-beep!",
    sound: "sounds/beep-beep.mp3"
}, {
    quote: "Beo-beo!",
    sound: "sounds/beo-beo.mp3"
}, {
    quote: "Boh-bu bobo",
    sound: "sounds/boh-bubobo.mp3"
}, {
    quote: "He he!",
    sound: "sounds/he-he.mp3"
}, {
    quote: "Uh oh...",
    sound: "sounds/uh-oh.mp3"
}];

notify("hello", quotes[0].quote); // Say hello on start
player.play(quotes[0].sound); // Play a happy sound

// Check Circle every few seconds for recent build statuses
var circleTimer = setInterval(function() {
    checkCircle();
}, circleInterval);

var babbleTimer = setInterval(function() {
    babble();
}, babbleInterval);

console.log("Looking for BB-8...");

bb8.connect(function() {
    console.log("Found BB-8!");
    flash("blue", 1000); // Flash BB-8's light so we know he's listening

    // Every so often, there's a certain chance BB-8 will move his head
    var lookTimer = setInterval(function() {
        if (Math.random() <= lookChance) {
            // Pick a random direction
            direction = Math.floor(Math.random() * 360);
            bb8.roll(25, direction);

            var lookStopTimer = setTimeout(function() {
                bb8.roll(0, direction); // Stop rolling after moving head
            }, 350);
        }
    }, lookInterval);
});

function babble() {
    if (Math.random() <= babbleChance) {
        var random = Math.floor(Math.random() * quotes.length);

        notify("hello", quotes[random].quote);
        player.play(quotes[random].sound);
    }
}

function flash(color, duration) {
    if (!duration) {
        duration = 5000;
    }

    bb8.color(color);

    var lightTimer = setInterval(function() {
        bb8.color("black"); // Blank BB-8's light
    }, duration);
}

function headShake() {
    var timeSpacing = 250;
    var lowerBound = 45;
    var upperBound = 315;

    bb8.roll(motorPower, lowerBound);

    var shakeTimer1 = setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing);

    var shakeTimer2 = setTimeout(function() {
        bb8.roll(0, lowerBound);
    }, timeSpacing * 2);

    var shakeTimer3 = setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing * 3);

    var shakeTimer4 = setTimeout(function() {
        bb8.roll(0, lowerBound);
    }, timeSpacing * 4);

    var shakeTimer5 = setTimeout(function() {
        bb8.roll(0, upperBound);
    }, timeSpacing * 5);

    var shakeTimer6 = setTimeout(function() {
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

    var nodTimer1 = setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing);

    var nodTimer2 = setTimeout(function() {
        bb8.setRawMotors({
            lmode: 2,
            lpower: motorPower,
            rmode: 2,
            rpower: motorPower
        });
    }, timeSpacing * 2);

    var nodTimer3 = setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing * 3);

    var nodTimer4 = setTimeout(function() {
        bb8.setRawMotors({
            lmode: 2,
            lpower: motorPower,
            rmode: 2,
            rpower: motorPower
        });
    }, timeSpacing * 4);

    var nodTimer5 = setTimeout(function() {
        bb8.setRawMotors({
            lmode: 1,
            lpower: motorPower,
            rmode: 1,
            rpower: motorPower
        });
    }, timeSpacing * 5);

    var nodTimer6 = setTimeout(function() {
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
