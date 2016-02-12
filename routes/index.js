var express = require('express');
var router = express.Router();
var fs = require('fs');
var multer = require('multer');
var subscription = require('../lib/subscription.js');

var upload = multer({ dest: 'uploads/csvs/' });

router.post('/upload', upload.single('sampleFile'), function(req, res) {
  var sampleFile;
 
  if (!req.file) {
    res.send('No files were uploaded.');
    return;
  }
  sampleFile = req.file;
  subscription.upload(sampleFile.path);
  res.send('File uploaded!');
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: "Build your company with information"});
});
router.get('/our_work', function(req, res){
  res.render('csv', {title: "Upload CSV"})
})

module.exports = router;
