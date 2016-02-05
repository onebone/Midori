var async = require('async');
var express = require('express');
var path = require('path');
var fs = require('fs');

var router = express.Router();

function isRestricted(dir, callback){
	fs.readFile('./restricted.json', (err, data) => {
		if(err){
			next(err);
			return;
		}
		data = JSON.parse(data);

		var realpath = fs.realpathSync(dir);

		var found = false;
		async.forEachOf(data, (value, key, cb) => {
			if(found){
				cb();
				return;
			}

			try{
				var file = fs.realpathSync(path.join(global.config['document-path'], key));
				if(realpath.indexOf(file) === 0){
					found = true;
					callback(null, value);
				}
			}catch(e){
				cb(e);
				return;
			}

			cb();
		}, (err) => {
			if(err){
				callback(err);
			}else if(!found){
				callback(null, null);
			}
		});
	});
}

function renderPage(stat, dir, res, req, next){
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
}

router.post('*', function(req, res, next){
	var dir = path.join(global.config['document-path'], req.path);
	fs.stat(dir, (err, stat) => {
		if(err){
			if(err.code === 'ENOENT') err.status = 404;

			next(err);
			return;
		}
		if(req.body.username && req.body.password){
			isRestricted(dir, (err, value) => {
				if(err){
					console.log(err);

					next(err);
					return;
				}

				if(Date.now() - req.session[dir] >= global.config['session-expiration'] * 1000){
					res.status(403);
					res.render('restricted', {
						wrong: false
					});
					return;
				}

				for(var key in value){
					if(key === req.body.username && value[key] === req.body.password){
						req.session[dir] = Date.now();

						renderPage(stat, dir, res, req, next);
						return;
					}
				}
				res.status(403);
				res.render('restricted', {
					wrong: true
				});
			});
		}else{
			res.status(403);
			res.render('restricted', {
				wrong: true
			});
		}
	});
});

/* GET home page. */
router.get('*', function(req, res, next) {
	var dir = path.join(global.config['document-path'], req.path);

	fs.stat(dir, (err, stat) => {
		if(err){
			if(err.code === 'ENOENT') err.status = 404;

			next(err);
			return;
		}
		isRestricted(fs.realpathSync(dir), (err, result) => {
			if(err){
				next(err);
				return;
			}

			if(Date.now() - req.session[dir] < global.config['session-expiration'] * 1000){
				req.session[dir] = Date.now();

				renderPage(stat, dir, res, req, next);
				return;
			}

			if(result){
				res.status(403);
				res.render('restricted', {
					wrong: false
				});
				return;
			}else{
				renderPage(stat, dir, res, req, next);
			}
		});
	});
});

module.exports = router;
