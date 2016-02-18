var csv_parse = require('csv-parse');
var fs = require("fs");
var request = require('request');
var Parse = require('parse/node');

var SUBJECTS = ['RE: UBC | Websites, designs, SEO, apps', 
	'RE: UBC | Websites, graphic design, SEO, mobile apps',
	'RE: UBC | Website development, graphic design, SEO, mobile apps',
	'RE: UBC websites, designs, SEO, apps'];

var remaining = 0;
exports.remaining = 0;

Parse.initialize("30dr49P9Bs9XqGPeouaF73DD5KozS3G4U4snANSf", 
		"mL4Rn4HpcaHSUeki5Kf060qjo5cUqbeck81SZ5CO");

exports.upload = function(file) {
	filter_emails(file);
}

function filter_emails(file){
	load_filters((filters) => {
		fs.readFile(file, (err, data) => {
			csv_parse(data, {comment : '#'}, (err, data) => {
				console.log("Got file start parsing");
				data = check_filters(filters, data);
				data = remove_duplicate(data);
				upload_emails(data, 0);
				fs.unlink(file);
			});
		});
	});
}

function check_filters(filters, emails){
	return emails.filter((email) => {
		var filter_passed = check_passed(filters, email[0]);
		var validated = validateEmail(email[0]);
		return filter_passed && validated;
	});
}

function remove_duplicate(emails){																																																											
	var duplicate_counter = {};
	var removed = emails.filter((email) => {
		email = email[0];
		var domain = email.split('@')[1].toLowerCase();
		var count = duplicate_counter[domain];
		var is_info = email.indexOf('info@') >= 0;
		if (count == undefined || count < 2 || is_info) {
			if (count == undefined)
				duplicate_counter[domain] = 1;
			else
				duplicate_counter[domain] = count+1;
			return true;
		} else {
			return false;
		}
	}).map((email) => {
		return email[0];
	});
	return removed;
}

function upload_emails(emails, i){
	var email = emails[i];
	var email = email.toLowerCase();
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
					remaining = 0;
					setTimeout(get_remaining_count, 100);
					send_next_email(process.env.MANDRILL_KEY1);
					// send_next_email(process.env.MANDRILL_KEY2);
				} else {
					remaining++;
					setTimeout(function(){upload_emails(emails, i+1)}, 100);
				}
			} else {
				if (emails.length == i + 1){
					remaining = 0;
					setTimeout(get_remaining_count, 100);
					console.log("Parsing Done start sending");
					send_next_email(process.env.MANDRILL_KEY1);
					// send_next_email(process.env.MANDRILL_KEY2);
				} else {
					remaining++;
					exports.remaining = remaining;
					setTimeout(function(){upload_emails(emails, i+1)}, 100);
				}
			}
		},
		error: function(err){
			setTimeout(function(){upload_emails(emails, i)}, 100);
			console.log('Email Query Error : ' + err);
		}
	});
}

function send_next_email(key){
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
				send_email(key, email, function(){
					email_object.save({
						sent : true
					});
					remaining--;
					if (remaining < 0){
						remaining = 0;
						get_remaining_count();
					}
					exports.remaining = remaining;
					setTimeout(function(){send_next_email(key);}, (Math.floor(Math.random()*90) + 60) * 1000);
				});
			}
		},
		error : function(err){
			setTimeout(function(){send_next_email(key);}, (Math.floor(Math.random()*90) + 60) * 1000);
			console.log('Email Query Error : ' + err);
		}
	});
}

exports.send_email = function(){
	ping();
	get_remaining_count();
	send_next_email(process.env.MANDRILL_KEY1);
	// send_next_email(process.env.MANDRILL_KEY2);
};

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

function send_email(key, email, callback) {
	var subject = SUBJECTS[Math.floor(Math.random()*4)];
	var template_name;
	var from_address;
	if (key === process.env.MANDRILL_KEY1){
		template_name = 'Analysis Letter';
		from_address = 'justin@jchanportfolio.com';
	} else {
		template_name = 'Jchan Mail Template';
		from_address = 'justin@justinchanportfolio.com';
	}
	request.post({
		url :'https://mandrillapp.com/api/1.0/messages/send-template.json', 
		form : {
			key : key,
			template_name : template_name,
			template_content: [{
				name: "name",
				content: "content"
			}],
			message : {
				subject : subject,
				from_email : from_address,
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
		console.log('====New Email Sent====');
		console.log('Email Sent with : ' + from_address);
		console.log('Send Email Error : ' + err);
		console.log('Send Email Body : ' + body);
		response = JSON.parse(body);
		if (response.length == 0){
			callback();
		} else {
			if (response[0].status === 'queued'){
				var now = new Date();
				var hour = now.getHours();
				now.setHours(hour+1, 0, 0, 0);
				setTimeout(callback, Math.abs(now - new Date()));
			} else {
				callback();
			}
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

function ping(){
	request({
		url : process.env.PING_URL
	}, function(err, response, body){
		setTimeout(ping, 20*60*1000);
	});
}

function get_remaining_count(callback){
	var Email = Parse.Object.extend("Email");
	var query = new Parse.Query(Email);
	query.equalTo("sent", false);
	query.count({
		success: function(count){
			remaining = count;
			exports.remaining = remaining;
			if (callback)
				callback();	
		},
		error : function(err){
			remaining = 0;
			exports.remaining = result.length;
			console.log('Queued Email count Error : ' + err);	
		}
	});
}
exports.get_remaining_count = function(callback){
	get_remaining_count(callback);
};