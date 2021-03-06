/**
 * IMAP mail listener
 *
 * Listens for mail that comes in and stores its contents
 */

console.log("===============================================");
console.log("=========== Starting Mail Listener ============");
console.log("===============================================");

var config = require('./config');
var requestify = require('requestify');
var MailListener = require("mail-listener2");
var sys = require('sys');
var exec = require('child_process').exec;

var connectedToMail = false;

var child;
var logMemory = function(){
	child = exec("ps -u " + config.userRunsProcess + " -o rss,command | grep -v peruser | awk '{sum+=$1} END {print sum/1024}'", function (error, stdout, stderr) {
		console.log('Memory Usage: ' + stdout);
	});
};


var getMailListener = function(){

	var mailListener = new MailListener({
		username: config.mailUsername,
		password: config.mailPassword,
		host: config.mailHost,
		port: config.mailPort,
		tls: true,
		mailbox: "INBOX", // mailbox to monitor
		markSeen: true, // all fetched email willbe marked as seen and not fetched next time
		fetchUnreadOnStart: true // use it only if you want to get all unread email on lib start. Default is `false`
	});

	mailListener.on("server:connected", function(){
		console.log("IMAP Listener Connected");
		logMemory();
		connectedToMail = true;
		timedDisconnect(this);
	});

	mailListener.on("server:disconnected", function(){
		console.log("IMAP Listener Disconnected");
		logMemory();
		mailListener.stop();
		connectedToMail = false;
		mailListenerConnect();
	});

	mailListener.on("error", function(err){
		console.log(err);
	});

	mailListener.on("mail", function(mail){
		console.log("INCOMING!");

		var from = mail.from[0].address;
		var subject = mail.subject;
		var text = mail.text;
		var html = mail.html;

		requestify.request(config.endpoint, {
			method: 'POST',
			body: {
				email: from,
				subject: subject,
				text: text,
				html: html
			},
			dataType: 'form-url-encoded'
		}).then(function(response){
			console.log(response);
		});

		console.log("Saved item from " + from + ": " + subject);
	});

	return mailListener;
};



var mailListenerConnect = function(){

	if (!connectedToMail){
		mailListener = getMailListener();

		console.log(new Date());
		console.log("Attempting to connect to IMAP listener...");

		logMemory();
		mailListener.start(); // start listening

		var t = setTimeout(function(){
			mailListenerConnect();
		}, 30000);
	}
};

mailListenerConnect();


var timedDisconnect = function(mailListener){
	if (connectedToMail){
		var dt = setTimeout(function(){
			console.log("Timed Disconnect...");
			mailListener.stop();
		}, 300000); // 300000 = 5 minutes
	}
};
