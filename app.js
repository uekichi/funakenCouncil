var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
//OAuth認証　passport-twitter
var session = require('express-session');
var passport = require('passport');
var TwitterStrategy = require('passport-twitter');
require('dotenv').config();


passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

//Twitter OAuth認証
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: "http://localhost:8000/auth/twitter/callback"
},
function (accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    return done(null, profile);
  });
}
));

var app = express();

app.use(session({ secret: process.env.SESSION_ID, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

//ツイッター認証
app.get('/auth/twitter',
    passport.authenticate('twitter'));
//認証の成否分岐
app.get('/auth/twitter/callback',
    passport.authenticate('twitter', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/');
});

//ログインURLでログイン画面の表示
app.get('/login', function(req, res) {
  res.render('login');
});
//ログアウトURLでログアウト設定
app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet());
app.use('/', indexRouter);
app.use('/users', ensureAuthenticated, usersRouter);

//認証されていなければログイン画面に戻される関数
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

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
