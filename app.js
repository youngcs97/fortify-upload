const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');



var app = express();
app.use(require('compression')());
// view engine setup
app.engine('ejs', require('ejs-locals'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
//app.use(require('cookie-parser')());
app.use(require('express-fileupload')());




// routes
app.use('/', require('./routes/index'));
app.use('/test', require('./routes/test'));
app.use('/upload', require('./routes/upload'));
app.use('/status', require('./routes/status'));
app.use('/sast', require('./routes/sast'));
app.use('/sast/report', require('./routes/report'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
