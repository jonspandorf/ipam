const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const { Schema } = mongoose;

const addressSchema = new Schema ({
    ipAddress: { type: String, required: true, unique: true },
    subnet: { type: Number, required: true },
    ipBuffered: { type: Object, unique: true },
    isHead: { type: Boolean, required: true },
    nextAddress: { type: Schema.Types.ObjectId, required: false },
    totalAddressNumber: { type: Number, required: true }, 
    deviceName: { type: String, required: true },
    devicePlatform: { type: String, required: true },
    description :{ type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, required: true,  ref: 'users'},
    // ownerOfRange: { type: String, required: true },
    isLast: { type: Boolean, required: true },
    hostIp: { type: String, required: true },
    hostIpBuffered: { type: Object, required: true},
    createdByEmpId: { type: Schema.Types.ObjectId, ref: 'users' },
});

addressSchema.plugin(uniqueValidator)

module.exports = mongoose.model('Address', addressSchema, 'addressList')