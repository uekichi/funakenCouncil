var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var helmet = require('helmet');
//OAuth認証　passport-twitter
var session = require('express-session');
var passport = require('passport');

//モデルの読み込み
var User = require('./models/user');
var Title = require('./models/title');
var Aruaru = require('./models/aruaru');
var Strategy = require('./models/strategy');
var Comment = require('./models/comment');

User.sync().then(() => {
  Title.belongsTo(User, {foreignKey: 'createdBy'});
  Title.sync();
  Comment.belongsTo(User, {foreignKey: 'userId'});
  Comment.sync();
  Aruaru.belongsTo(User, {foreignKey: 'userId'});
  Strategy.sync().then(() => {
    Aruaru.belongsTo(Strategy, {foreignKey: 'strategyId'});
    Aruaru.sync();
  });
});

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
    User.upsert({
      userId: profile.id,
      username: profile.username
    }).then(() => {
      done(null, profile);
    });
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
    passport.authenticate('twitter', { failureRedirect: '/login' }), //失敗したら
    function(req, res) {
      res.redirect('/');
    });

// ルーター登録
var indexRouter = require('./routes/index');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var titlesRouter = require('./routes/titles');
var aruarusRouter = require('./routes/aruarus');
var commentsRouter = require('./routes/comments');


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
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/titles', titlesRouter);
app.use('/titles', aruarusRouter);
app.use('/titles', commentsRouter);


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
