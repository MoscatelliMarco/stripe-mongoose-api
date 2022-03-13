const mongoose = require('mongoose');
const apiSystem = require('stripe-mongoose-api');
const options = require('../options')

const userSchema = new mongoose.Schema({})

userSchema.plugin(apiSystem, options);

module.exports = mongoose.model('User', userSchema)
