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

router.get('/remaining', function(req, res){
  subscription.get_remaining_count(() => {
    res.json({remaining : subscription.remaining});
  });
});

router.get('/js', function(req, res){
  subscription.low_rate = true;
  res.json({remaining : subscription.remaining});
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: "Build your company with information"});
});
router.get('/our_work', function(req, res){
  res.render('csv', {title: "Upload CSV", remaining : subscription.remaining});
})

module.exports = router;
