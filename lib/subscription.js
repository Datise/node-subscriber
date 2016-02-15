var csv_parse = require('csv-parse');
var fs = require("fs");
var request = require('request');
var Parse = require('parse/node');

var SUBJECTS = ['RE: UBC | Websites, designs, SEO, apps', 
	'RE: UBC | Websites, graphic design, SEO, mobile apps',
	'RE: UBC | Website development, graphic design, SEO, mobile apps',
	'RE: UBC websites, designs, SEO, apps'];

exports.remaining = 0;

exports.upload = function(file) {
	upload(file, 0);
}

function upload(file, i){
	Parse.initialize("30dr49P9Bs9XqGPeouaF73DD5KozS3G4U4snANSf", 
		"mL4Rn4HpcaHSUeki5Kf060qjo5cUqbeck81SZ5CO");
	fs.readFile(file, function(err, data){
		csv_parse(data, {comment : '#'}, function(err, data){
			load_filters(function(filters){
				var email = data[i][0];
				var filter_passed = check_passed(filters, email);
				if (!filter_passed){
					console.log("Filter not passed for index : " + i);
					if (data.length > i + 1) {
						for (var j = i+1; j < data.length; j++){
							var email = data[j][0];
							var filter_passed = check_passed(filters, email);
							if (filter_passed){
								timeOut(file, j);
								exports.remaining = data.length - i - 1;
								return;
							}
						}
					}
				}
				email = email.toLowerCase();
				var Email = Parse.Object.extend("Email");
				var query = new Parse.Query(Email);
				query.equalTo("email", email);
				query.find({
					success: function(result){
						if (result.length == 0){
							send_email(email, function(){
								var email_object = new Email();
								email_object.save({
									email: email
								});
								for (var j = i+1; j < data.length; j++){
									var email = data[j][0];
									var filter_passed = check_passed(filters, email);
									if (filter_passed){
										if (data.length > j + 1){
											timeOut(file, j);
											exports.remaining = data.length - j - 1;
										} else {
											fs.unlink(file);
											exports.remaining = 0;
										}
										break;
									}
								}
							});
						} else {
							if (data.length > i + 1){
								timeOut(file, i);
								exports.remaining = data.length - i - 1;
							} else {
								fs.unlink(file);
								exports.remaining = 0;
							}
						}
					},
					error: function(err){
					}
				});
			});
		});
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
		callback();
	});
}

function timeOut(file, i){
	console.log('Timeout For index : ' + i);
	setTimeout( function(){upload(file, i+1)}, (Math.floor(Math.random()*150) + 60) * 1000);
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