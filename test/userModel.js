const mongoose = require('mongoose');
const apiSystem = require('../index');
const options = require('../options')

const userSchema = new mongoose.Schema({})

userSchema.plugin(apiSystem, options);

module.exports = mongoose.model('User', userSchema)