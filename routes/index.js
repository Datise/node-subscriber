var express = require('express');
var router = express.Router();

router.post('/upload', function(req, res) {
  var sampleFile;
 
  if (!req.files) {
    res.send('No files were uploaded.');
    return;
  }
  sampleFile = req.files.sampleFile;
  sampleFile.mv('./uploads/csvs/', function(err) {
    if (err) {
      res.status(500).send(err);
    }
    else {
      res.send('File uploaded!');
    }
  });
});

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: "Build your company with information"});
});
router.get('/our_work', function(req, res){
  res.render('csv', {title: "Upload CSV"})
})

module.exports = router;
