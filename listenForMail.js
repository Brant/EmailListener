/**
 * IMAP mail listener
 *
 * Listens for mail that comes in and stores its contents
 */
var config = require('./config');
var requestify = require('requestify');
var MailListener = require("mail-listener2");
var mailListener;
var connectedToMail = false;

var mailListenerConnect = function(){
	if (!connectedToMail){
		mailListener = new MailListener({
			username: config.mailUsername,
			password: config.mailPassword,
			host: config.mailHost,
			port: config.mailPort,
			tls: true,
			mailbox: "INBOX", // mailbox to monitor
			markSeen: true, // all fetched email willbe marked as seen and not fetched next time
			fetchUnreadOnStart: true // use it only if you want to get all unread email on lib start. Default is `false`
		});

		console.log("Attempting to connect to IMAP listener...");
		mailListener.start(); // start listening

		var t = setTimeout(function(){
			mailListenerConnect();
		}, 10000);
	}
};
mailListenerConnect();

mailListener.on("server:connected", function(){
	console.log("IMAP Listener Connected");
	connectedToMail = true;
});

mailListener.on("server:disconnected", function(){
	console.log("IMAP Listener Disconnected");
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
			html: html,

		},
		dataType: 'form-url-encoded'
	}).then(function(response){
		console.log(response);
	});

	console.log("Saved item from " + from);
});


//mailListener.stop(); // stop listening
