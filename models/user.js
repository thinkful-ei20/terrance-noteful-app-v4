'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  fullname: String,
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

userSchema.set('toObject', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
  }
});

userSchema.methods.validatePassword = function (password) {
  return password === this.password;
};

module.exports = mongoose.model('user', userSchema);
