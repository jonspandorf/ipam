const { Schema, model } = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const recycleSchema = new Schema ({
    ipAddress: { type: String, required: true, unique: true },
    ipBuffered: { type: Object, unique: true },
    nextAddress: { type: Schema.Types.ObjectId, required: false },

})

recycleSchema.plugin(uniqueValidator)
module.exports = model('Recycle', recycleSchema, 'recycle')