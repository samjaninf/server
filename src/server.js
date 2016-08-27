import express from 'express';
let app = express();
app.set('view engine', 'ejs');
app.use(express.static('build'));

import whoami from 'controllers/whoami';
import * as links from 'controllers/links';
import {checkRepo} from 'controllers/checkRepo';

// ----------------------------------------------------------------------------
// Mongo stuff
// ----------------------------------------------------------------------------
import mongoose from 'mongoose';
mongoose.connect(process.env.MONGO_URI);
import User from 'models/User';
import Link from 'models/Link';

// ----------------------------------------------------------------------------
// Set up session store
// ----------------------------------------------------------------------------
const MongoStore = require('connect-mongo')(session),
mongoStore = new MongoStore({mongooseConnection: mongoose.connection});

// ----------------------------------------------------------------------------
// Passport stuff
// ----------------------------------------------------------------------------
import passport from 'passport';
import session from 'express-session';
import strategy from 'auth/strategy';
import serialize from 'auth/serialize';
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: mongoStore,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(strategy(User));
serialize(User, passport);

import bodyParser from 'body-parser';
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

import morgan from 'morgan';
app.use(morgan('tiny'));

// Disable cors (for now, while in development)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Authenticate a user
app.get('/setup/login', passport.authenticate('github', {
  successRedirect: '/',
  failureRedirect: '/setup/login',
  scope: ["repo", "write:repo_hook", "user:email"],
}));

app.get("/auth/github/callback", passport.authenticate("github", {
  failureRedirect: '/login',
  failureFlash: true,
}), (req, res) => {
  res.redirect('/'); // on success
});

// identify the currently logged in user
app.get('/api/v1/whoami', whoami);

// get all links
app.get('/api/v1/links', links.index.bind(null, Link));

// GET a given link
app.get('/api/v1/links/:id', links.get.bind(null, Link));

// return the branches for a given repo
app.get('/api/v1/repos/:provider/:user/:repo', checkRepo);

// create a new link
app.post('/api/v1/links', links.create.bind(null, Link));

// POST link updates
app.post('/api/v1/links/:linkId', links.update.bind(null, Link));

// enable or disable a repository
app.post('/api/v1/link/:linkId/enable', links.enable.bind(null, Link));

// the old webhook route
// app.route("/ping/github/:user/:repo").get((req, res) => {
//   res.redirect(`https://github.com/${req.params.user}/${req.params.repo}`);
// }).post(webhook);

// the webhook route
// app.route("/").get((req, res) => {
//   res.redirect(`https://github.com/1egoman/backstroke`);
// }).post(webhook);

let port = process.env.PORT || 8001;
app.listen(port);
console.log("Listening on port", port, "...");