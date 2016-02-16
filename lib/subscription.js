var csv_parse = require('csv-parse');
var fs = require("fs");
var request = require('request');
var Parse = require('parse/node');

var SUBJECTS = ['RE: UBC | Websites, designs, SEO, apps', 
	'RE: UBC | Websites, graphic design, SEO, mobile apps',
	'RE: UBC | Website development, graphic design, SEO, mobile apps',
	'RE: UBC websites, designs, SEO, apps'];

remaining = 0;
exports.remaining = 0;
Parse.initialize("30dr49P9Bs9XqGPeouaF73DD5KozS3G4U4snANSf", 
		"mL4Rn4HpcaHSUeki5Kf060qjo5cUqbeck81SZ5CO");

exports.upload = function(file) {
	filter_emails(file);
}

function filter_emails(file){
	load_filters(function(filters){
		fs.readFile(file, function(err, data){
			csv_parse(data, {comment : '#'}, function(err, data){
				console.log("Got file start parsing");
				upload_emails(filters, data, 0);
				fs.unlink(file);
			});
		});
	});
}

function upload_emails(filters, emails, i){
	var email = emails[i][0];
	var email = email.toLowerCase();
	var filter_passed = check_passed(filters, email);
	var validated = validateEmail(email);
	if (filter_passed && validated){
		var Email = Parse.Object.extend("Email");
		var query = new Parse.Query(Email);
		query.equalTo("email", email);
		query.find({
			success: function(result){
				if (result.length == 0){
					var email_object = new Email();
					email_object.save({
						email: email,
						sent : false
					});
					if (emails.length == i + 1){
						console.log("Parsing Done start sending");
						remaining++;
						exports.remaining = remaining;
						send_next_email();
					} else {
						remaining++;
						setTimeout(function(){upload_emails(filters, emails, i+1)}, 100);
					}
				} else {
					if (emails.length == i + 1){
						console.log("Parsing Done start sending");
						send_next_email();
					} else {
						exports.remaining = exports.remaining + 1;
						setTimeout(function(){upload_emails(filters, emails, i+1)}, 100);
					}
				}
			},
			error: function(err){
				setTimeout(function(){upload_emails(filters, emails, i)}, 100);
				console.log('Email Query Error : ' + err);
			}
		});
	} else {
		if (emails.length == i + 1){
			console.log("Parsing Done start sending");
			send_next_email(i);
		} else {
			upload_emails(filters, emails, i+1);
		}
	}
}

function send_next_email(){
	var Email = Parse.Object.extend("Email");
	var query = new Parse.Query(Email);
	query.equalTo("sent", false);
	query.limit(1);
	query.find({
		success: function(result){
			if (result.length == 0){
				console.log("Sent All Emails");
				remaining = 0;
				exports.remaining = 0;
			} else {
				var email_object = result[0];
				var email = email_object.get("email");
				send_email(email, function(){
					email_object.save({
						sent : true
					});
					remaining--;
					if (remaining < 0){
						remaining = 0;
						get_remaining_count();
					}
					exports.remaining = remaining;
					setTimeout(send_next_email, (Math.floor(Math.random()*150) + 60) * 1000);
				});
			}
		},
		error : function(err){
			setTimeout(send_next_email, (Math.floor(Math.random()*150) + 60) * 1000);
			console.log('Email Query Error : ' + err);
		}
	});
}

exports.send_email = function(){
	get_remaining_count();
	send_next_email();
};

function get_remaining_count(){
	var Email = Parse.Object.extend("Email");
	var query = new Parse.Query(Email);
	query.equalTo("sent", false);
	query.limit(1000);
	query.find({
		success: function(result){
			remaining = result.length;
			exports.remaining = result.length;
		},
		error : function(err){
			remaining = 0;
			exports.remaining = result.length;
			console.log('Queued Email count Error : ' + err);	
		}
	});
}

function check_passed(filters, email){
	var filter_passed = true;
	for (var j = 0; j < filters.length; j++){
		if (email.indexOf(filters[j]) > -1){
			filter_passed = false;
			break;
		}
	}
	return filter_passed;
}

function send_email(email, callback) {
	var subject = SUBJECTS[Math.floor(Math.random()*4)];
	request.post({
		url :'https://mandrillapp.com/api/1.0/messages/send-template.json', 
		form : {
			key : '26iYcI5fJFzbvQare-j_5Q',
			template_name : 'Analysis Letter',
			template_content: [{
				name: "name",
				content: "content"
			}],
			message : {
				subject : subject,
				from_email : 'justin@jchanportfolio.com',
				from_name: "Justin Chan",
				important : true,
				track_opens : true,
				track_clicks : true,
				auto_text: null,
				auto_html: null,
				inline_css: null,
				url_strip_qs: null,
				to: [{
					email: email,
					type: "to"
				}],
				preserve_recipients: null,
				view_content_link: null,
				tracking_domain: null,
				signing_domain: null,
				return_path_domain: null,
				merge: true,
				merge_language: "mailchimp",
			},
			async: false,
			ip_pool: "Main Pool"
		}
	}, function(err, response, body){
		console.log('Send Email Error : ' + err);
		console.log('Send Email Body : ' + body);
		if (body[0].status === 'queued'){
			var now = new Date();
			var hour = now.getHour();
			now.setHours(hour+1, 0, 0, 0);
			setTimeout(callback, Math.abs(now - new Date()));
		} else {
			callback();
		}
	});
}

function load_filters(callback){
	var Filter = Parse.Object.extend("Filter");
	var query = new Parse.Query(Filter);
	var filters = [];
	query.limit(1000);
	query.find({
		success: function(result){
			if (result.length != 0){
				for (var i = 0; i < result.length; i++){
					filter = result[i].get("filter");
					filters.push(filter);
				}
				callback(filters);
			} else {
				callback(filters);
			}
		},
		error: function(error){
		}
	});
}

function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}