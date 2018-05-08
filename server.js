'use strict';

require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

const {
  PORT,
  MONGODB_URI
} = require('./config');

const notesRouter = require('./routes/notes');
const foldersRouter = require('./routes/folders');
const tagsRouter = require('./routes/tags');
const usersRouter = require('./routes/users');

// Create an Express application
const app = express();

const passport = require('passport');
const localStrategy = require('./passport/local');
const jwtStrategy = require('./passport/jwt');

// Other statements removed for brevity
const authRouter = require('./routes/auth');

// Log all requests. Skip logging during
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'common', {
  skip: () => process.env.NODE_ENV === 'test'
}));

// Create a static webserver
app.use(express.static('public'));

// Parse request body
app.use(express.json());

// Utilize the strategy
passport.use(localStrategy);

// Utilize the jwt strategy
passport.use(jwtStrategy);

// Mount routers
app.use('/api', authRouter);
app.use('/api/notes', notesRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/users', usersRouter);

// Catch-all 404
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Catch-all Error handler
// Add NODE_ENV check to prevent stacktrace leak
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: app.get('env') === 'development' ? err : {}
  });
});

// Listen for incoming connections
if (require.main === module) {
  mongoose.connect(MONGODB_URI)
    .then(instance => {
      const conn = instance.connections[0];
      console.info(`Connected to: mongodb://${conn.host}:${conn.port}/${conn.name}`);
    })
    .catch(err => {
      console.error(`ERROR: ${err.message}`);
      console.error('\n === Did you remember to start `mongod`? === \n');
      console.error(err);
    });

  app.listen(PORT, function () {
    console.info(`Server listening on ${this.address().port}`);
  }).on('error', err => {
    console.error(err);
  });
}

module.exports = app; // Export for testing