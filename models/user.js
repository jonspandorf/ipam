const { Schema, model } = require('mongoose');
const mongooseUniqueValidator = require('mongoose-unique-validator');

const userSchema = new Schema({
    username: { type: String, required: false },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true }
})

userSchema.plugin(mongooseUniqueValidator)

module.exports = model('User', userSchema, 'users')