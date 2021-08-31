const express = require('express');
const { showIpList, searchForAddress, showAddressForm, createNewAddressRange, showInfo, deleteAddressRange } = require('../controllers/ipam');
const { check, body } = require('express-validator');

const router = express.Router();

// views routes
router.get('/', showIpList)

router.get('/form', showAddressForm)

router.get('/api/:Id', showInfo)

// functional routes
router.get('/api/search', searchForAddress)

router.post('/api/create-range' , 
    // body('ipAddress').isIP(), 
    body('numOfAddrs').isNumeric(),
    body('description').isString().isLength({ min: 10 }),
    body('deviceName').isString().isLength({ min: 3 }),
    body('devicePlatform').isString().isLength({ min: 3 }),
createNewAddressRange)


router.get('/api/delete/:Id', deleteAddressRange)

module.exports = router