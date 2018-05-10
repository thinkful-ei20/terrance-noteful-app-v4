'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

const seedUsers = require('../db/seed/users');

chai.use(chaiHttp);

describe.only('Noteful API - Users', function () {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullName = 'Example User';

  before(function () {
    return mongoose.connect(TEST_MONGODB_URI)
      .then(() => mongoose.connection.db.dropDatabase());
  });

  beforeEach(function () {
    return User.insertMany(seedUsers)
      .then(() => User.createIndexes());
  });

  afterEach(function () {
    return mongoose.connection.db.dropDatabase();
  });

  after(function () {
    return mongoose.disconnect();
  });
  
  describe('/api/users', function () {
    describe('POST', function () {
      it('Should create a new user', function () {
        const testUser = { username, password, fullName };

        let res;
        return chai
          .request(app)
          .post('/api/users')
          .send(testUser)
          .then(_res => {
            res = _res;
            expect(res).to.have.status(201);
            expect(res.body).to.be.an('object');
            expect(res.body).to.have.keys('id', 'username', 'fullName');

            expect(res.body.id).to.exist;
            expect(res.body.username).to.equal(testUser.username);
            expect(res.body.fullName).to.equal(testUser.fullName);

            return User.findOne({ username });
          })
          .then(user => {
            expect(user).to.exist;
            expect(user.id).to.equal(res.body.id);
            expect(user.fullName).to.equal(testUser.fullName);
            return user.validatePassword(password);
          })
          .then(isValid => {
            expect(isValid).to.be.true;
          });
      });
      it('Should reject users with missing username', function () {
        const testUser = { password, fullName };
        return chai.request(app).post('/api/users').send(testUser)
          .then((res) => {
          //   expect.fail(null, null, 'Request should not succeed')
          // )
          // .catch(err => {
          //   console.log('Err is caught then assertions will run');
          //   if (err instanceof chai.AssertionError) {
          //     throw err;
          //   }
            
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Missing \'username\' in request body');
            expect(res.body.location).to.equal('username');
          });
      });

      /**
       * COMPLETE ALL THE FOLLOWING TESTS
       */
      it('Should reject users with missing password', function() {
        return chai.request(app).post('/api/users')
          .send({
            username,
            fullName
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Missing \'password\' in request body');
            expect(res.body.location).to.equal('password');
          });
      });

      it('Should reject users with non-string username', function() {
        return chai
          .request(app).post('/api/users')
          .send({
            username: 12341234,
            password,
            fullName
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Incorrect field type: expected string');
            expect(res.body.location).to.equal('username');
          });
      });

      it('Should reject users with non-string password', function() {
        return chai.request(app).post('/api/users')
          .send({
            username,
            password: 1234,
            fullName
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Incorrect field type: expected string');
            expect(res.body.location).to.equal('password');
          });
      });

      it('Should reject users with non-trimmed username', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: '  blah',
            password: 'blahblah',
            fullName: 'bladdy blah'
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
          });
      });

      it('Should reject users with non-trimmed password', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: 'testingname',
            password: '  wrongggg',
            fullName: 'thismy nameyo'
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('Cannot start or end with whitespace');
          });
      });

      it('Should reject users with empty username', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: '',
            password: 'testtest',
            fullName: 'testing testing'
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('username must be at least 1 character(s)');
          });
      });

      it('Should reject users with password less than 8 characters', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: 'hello',
            password: 'blah',
            fullName: 'blah blah'
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password must be at least 8 character(s)');
          });
      });
      it('Should reject users with password greater than 72 characters', function () {
        return chai.request(app).post('/api/users')
          .send({
            username: 'myuser name',
            password: 'jfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjfjffjfjfjfjfjfjfjfjfjfjfjfjffjfjfjfj',
            fullName: 'full name'
          })
          .then((res) => {
            expect(res).to.have.status(422);
            expect(res.body.reason).to.equal('ValidationError');
            expect(res.body.message).to.equal('password cannot be greater than 72 characters');
          });
      });
      it('Should reject users with duplicate username', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: 'user0',
            password: 'password',
            fullName: 'User Zero'
          })
          .then((res) => {
            expect(res).to.have.status(400);
          });
      });

      it('Should trim fullName', function() {
        return chai.request(app).post('/api/users')
          .send({
            username: 'username',
            password: 'password',
            fullName: '  thisbe myname  '
          })
          .then((res) => {
            expect(res).to.have.status(201);
            expect(res.body.fullName).to.equal('thisbe myname');
          });
      });
    });

    // describe('GET', function () {
    //   it('Should return an empty array initially', function () {
    //     return chai.request(app).get('/api/users')
    //       .then(res => {
    //         expect(res).to.have.status(200);
    //         expect(res.body).to.be.an('array');
    //         expect(res.body).to.have.length(0);
    //       });
    //   });
    //   it('Should return an array of users', function () {
    //     const testUser0 = {
    //       username: `${username}`,
    //       password: `${password}`,
    //       fullName: ` ${fullName} `
    //     };
    //     const testUser1 = {
    //       username: `${username}1`,
    //       password: `${password}1`,
    //       fullName: `${fullName}1`
    //     };
    //     const testUser2 = {
    //       username: `${username}2`,
    //       password: `${password}2`,
    //       fullName: `${fullName}2`
    //     };

    //     /**
    //      * CREATE THE REQUEST AND MAKE ASSERTIONS
    //      */
    //   });
    // });
  });
});