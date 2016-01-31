var express = require('express');
var path = require('path');
var fs = require('fs');

var router = express.Router();

/* GET home page. */
router.get('*', function(req, res, next) {
	var dir = path.join(global.config['document-path'], req.path);

	fs.stat(dir, (err, stat) => {
		if(err){
			next(err);
			return;
		}

		if(stat.isFile()){
			res.download(dir);
			return;
		}
		fs.readdir(dir, (err, data) => {
			if(err){
				if(err.code === 'ENOENT') err.status = 404;

				next(err);
				return;
			}

			var dirs = [];
			var files = [];

			data.forEach((file) => {
				var stat = fs.statSync(path.join(dir, file));

				stat.isFile() ? files.push(file) : dirs.push(file);
			});

			files.sort();
			dirs.sort();

			res.render('index', {
				title: global.translation['common']['title'],
				path: path,
				dir: req.path,
				files: files,
				dirs: dirs
			});
		});
	});
});

module.exports = router;
