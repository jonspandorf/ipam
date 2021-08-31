const { createAddressRange, validateConsecutive, populateListOfOwners, checkIsLoggedIn, addToRecycle, deleteFromRecycle, findSmallestIP, isAvailableFromRecycle, isNotAlive, findBiggestIP } = require("../utils/ipam-functions");
const Address = require('../models/ipam');
const User = require ('../models/user')

const MockAddress = require('../models/address');
const { address } = require("ip");
const Recycle = require("../models/recycle");
const { validationResult  } = require('express-validator');

// View controller functions

const showIpList = async (req, res, next) => {
  const isLogged = checkIsLoggedIn(req.session.isLoggedIn)  
  if (!isLogged) return res.redirect('/login')   
  const user = await User.findById(req.session.user)
  let addresses;
   if (user.role === 'admin') {
    addresses = await Address.find({isHead: true})

   } else {
        addresses = await Address.find({$and:[{ownerId: req.session.user}, {isHead: true}]})
   }
    res.render('../views/user/ipam-list', {
            list: addresses,
            pageTitle: 'Your IP addresses',
            path: '/list',
            isAuthenticated: req.session.isLoggedIn,
            user: user
        })
}

const showInfo = async (req, res, next) => {
    const Id = req.params.Id
    const address = await Address.findById(Id);
    if (address) {
        res.render('../views/user/head-info', {
            address,
            pageTitle: 'IP Range info',
            path:`api/${Id}`,
            isAuthenticated: req.session.isLoggedIn,
        })
    } 
}

const showAddressForm = async (req, res, next) => {
    const isLogged = checkIsLoggedIn(req.session.isLoggedIn)  
    if (!isLogged) return res.redirect('/login')
    const owners = await populateListOfOwners();
    res.render('../views/user/address-form', {
        pageTitle: 'Add new address',
        path:'/form',
        owners: owners,
        isAuthenticated: req.session.isLoggedIn,
        errors: []
    })
}

const showErrorPage = async (req, res, next) => {

    res.render('../views/user/error', {
        pageTitle: 'Error!',
        path:'/error',
        message,
    })
}

const searchForAddress = (req, res, next) => {
    const searchedAddress = req.query.ipAddress
    try {
        const address = ipList.find(ip => ip.ipAddress === searchedAddress)
        res.send({ address });
    } catch(err) {
        next(err)
    }
}


// API functions


const createNewAddressRange = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log(errors)
        const owners = await populateListOfOwners();
        return res.status(422).render('../views/user/address-form', {
            pageTitle: 'Add new address',
            path:'/form',
            owners: owners,
            isAuthenticated: req.session.isLoggedIn,
            errors: errors.array(),
        })
    }
    
    let { ipAddress, numOfAddrs } = req.body 



    if (ipAddress) {
        const checkIfNotAlive = await isNotAlive(ipAddress, parseInt(numOfAddrs))
        console.log(checkIfNotAlive)
        if (!checkIfNotAlive) {
            const error = new Error ('some of the addresses are in use', 422)
            return next(error);
        }
    }
    const poolFromRecycle = [];
    let availableInRecycle;

    if (ipAddress.length === 0) {
        availableInRecycle = await isAvailableFromRecycle(numOfAddrs);
        if (availableInRecycle.length >= numOfAddrs) {
            for (let address of availableInRecycle) {
                poolFromRecycle.push(address.ipAddress);
            }
        }
    }


    let lastIp; 
    if (ipAddress.length === 0 && poolFromRecycle.length === 0) {
        lastIp = await Address.findOne({ isLast: true })
        if (!lastIp) lastIp = await findBiggestIP();
        if (lastIp) {
            lastIp.isLast = false;
            lastIp.save();
        }
    }

    const raw = req.body;

    // If ipAddress.length is 0 AND numOfAddress available in recycle from top of list - assign them to to addressRange

    const addressRange = createAddressRange(raw, lastIp, poolFromRecycle);
    console.log(addressRange)
    try {
        const insertSuccess = await Address.insertMany(addressRange);
        if (!insertSuccess) {
            const max = await Address.find().sort({ ipBuffered: -1 }).limit(1);
            res.send({message: `try again with the following address of ${max[0]}`})
        }
        if (availableInRecycle) deleteFromRecycle(availableInRecycle);
        res.redirect('/')

    } catch (error) {
        next(error)
    }

    // assign range to user
    // return the range to the client
}

const deleteAddressRange = async (req, res, next) => {

    const { Id } = req.params;
    const headAddress = await Address.findOne({ _id: Id});
    const range = [];
    const recycledIps = [];
    let flag = true;
    let isInit = true;
    let nextAddress;
    while (flag) {
        if (isInit) {
            range.push(headAddress._id)
            recycledIps.push( headAddress.ipAddress)
            nextAddress = await Address.findOne({_id: headAddress.nextAddress})
            if (nextAddress === null) break;
            isInit = false;
        } else {
            range.push(nextAddress._id);
            recycledIps.push(nextAddress.ipAddress)
            nextAddress = await Address.findOne({_id: nextAddress.nextAddress})
        }
        if (!nextAddress || !nextAddress.nextAddress) flag = false;
        if (nextAddress && nextAddress.nextAddress === null) {
            range.push(nextAddress._id);
            recycledIps.push(nextAddress.ipAddress)
        }

    }
    try {
        const recycleList = await addToRecycle(recycledIps);
        
        await Recycle.insertMany(recycleList);
        await Address.deleteMany({_id: { $in: range }})

        res.redirect('/');

    } catch (err) {
        next (err)
    }
}


exports.showAddressForm = showAddressForm
exports.showIpList = showIpList
exports.showInfo = showInfo
exports.searchForAddress = searchForAddress
exports.createNewAddressRange = createNewAddressRange;
exports.deleteAddressRange = deleteAddressRange