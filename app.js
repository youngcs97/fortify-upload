// New Line for John Simpson

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const logger = require('morgan');


const app = express();
app.use(require('helmet')())
app.use(require('compression')());

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
app.use('/tokens', require('./routes/tokens'));
app.use('/sast', require('./routes/sast/index'));
app.use('/sast/report', require('./routes/sast/report'));
app.use('/sast/issues', require('./routes/sast/issues'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  const m = err.message;
  const e = req.app.get('env') === 'development' ? err : {};
  const s = err.status||500
  res.status(s);
  if (req.accepts('json')&&(!req.accepts('html'))) {  
    res.json({ success: false, status: s, path: req.path, messages: [m] });
  } else {
    res.render('error',{message: m, status: s, error: e});
  }
});

module.exports = app;
