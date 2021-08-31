const ip = require('ip');
const mongoose = require('mongoose');
const Address = require('../models/ipam');
const { findById } = require('../models/user');
const User = require('../models/user')
const Recycle = require('../models/recycle');
const ping = require('ping')


const createAddressRange = (req, lastIp, pool) => {

    const { ipAddress, numOfAddrs, deviceName, devicePlatform, description, ownerId, hostIp } = req

    console.log(pool)

    let unknownAddress;
    let currentAddr;
    if (pool.length > 0) {
        currentAddr = pool[0]
        console.log(currentAddr)
    } else {
        if (ipAddress.length > 0) {
            currentAddr = ipAddress;
        } else {
            if  (!lastIp)  {
               unknownAddress = '10.0.0.1';
               currentAddr = unknownAddress;
            } else {
                unknownAddress = generateOriginalFirstIp(lastIp.ipAddress)
                currentAddr = unknownAddress;
            }
        }
    }

    const isExhausted =  isIpListExhausted(currentAddr);

    if (isExhausted) {
        const error = new Error('Static IP list is at its edges. Please contact 10.175.xx.xx Administrator')
        error.httpStatusCode = 410
        return error;
    }

    let range = [];
    let formerAddress;
    let isInit = true;


    for (let i = 0; i < numOfAddrs; i++) { 

        const createdAddress = {
            _id: mongoose.Types.ObjectId(),
            ipAddress: currentAddr,
            subnet: 16,
            ipBuffered: ip.toBuffer(currentAddr),
            isHead: isInit ? true : false,
            nextAddress: null,
            totalAddressNumber: numOfAddrs,
            deviceName,
            devicePlatform,
            description,
            // ownerOfRange: User.findById(ownerId),
            ownerId,
            hostIp,
            isLast: i=== numOfAddrs-1 && ipAddress.length === 0 && pool.length > 0 ? true : false,
            hostIpBuffered: ip.toBuffer(hostIp),
            createdByEmpId: req.user
        }
        if (isInit) isInit = false; 

        if (i > 0 && i < numOfAddrs) {
            formerAddress.nextAddress = createdAddress._id
        }

        formerAddress = createdAddress; 

        ping.sys.probe(createdAddress.ipAddress, (isAlive) => {
            if (isAlive) {
                const error =  new Error('One of the created hosts is alive. Please contact Lab administrator', 422)
                return next(error);
            }
        })

        range.push(createdAddress);

        if (pool && i < pool.length -1) {
            currentAddr = pool[i +1];
        } else {
            currentAddr = handleAddressLogic(currentAddr)
        }   

    }

    return range;

}

const handleAddressLogic = (currentAddr) => {

    let newAddr = currentAddr.split('.')
    let lastOctet = +newAddr[newAddr.length -1] + 1;
    let thirdOctet;
    if (lastOctet === 254) {

        lastOctet = 1;
        // HANDLE THIRD OCTET LOGIC
        thirdOctet = +newAddr[2] + 1;
    }
    if (thirdOctet) {
        newAddr = [currentAddr[0], currentAddr[1], thirdOctet.toString(), lastOctet.toString()]
    } else {
        newAddr.splice(3, 1, lastOctet.toString());
    }
    currentAddr = newAddr.join('.');
    return currentAddr;
}

const generateOriginalFirstIp = (ip) => {
    let newIp = ip.split('.')
    let lastOctet = +newIp[newIp.length - 1];
    if (lastOctet > 254) {
        let thirdOctet = +newIp[2];
        thirdOctet++; 
        lastOctet = 1;
        newIp = [currentAddr[0], currentAddr[1], thirdOctet.toString(), lastOctet.toString()]
    } else {
        lastOctet++;
        newIp.splice(3, 1, lastOctet.toString());
    }
    const ipToReturn = newIp.join('.');
    return ipToReturn
}

const isIpListExhausted = (ip) => {
    console.log(ip)
    const octets = ip.split('.');
    if (+octets[2] === 254 && +octets[3] > 200) {
       return true;
    } else {
        return false;
    }
}


const validateConsecutive = (range) => {
    let isFirst = true;
    let formerOctet;

    for (let address of range) {
        let currentOctet = address.split('.');
        currentOctet = +currentOctet[currentOctet.length - 1];
        if (isFirst) {
            formerOctet = currentOctet;
        } else {
            if (currentOctet - formerOctet > 1) throw new Error('Addresses are not consecutive', 422)
            else {
                formerOctet = currentOctet;
            }
        }
    }

    return true;
}

const addToRecycle = async (list) => {
    const recycleRange = [];
    let prevAddress;
    let lastAddress;
    const compareToSmallestIP = await isAvailableFromRecycle('1')
    console.log(compareToSmallestIP)
    if (compareToSmallestIP.length > 0 ) {
        if (compareToSmallestIP[0].ipBuffered > ip.toBuffer(list[list.length - 1])) {
            lastAddress = compareToSmallestIP[0];

        } else {
            lastAddress = await Recycle.findOne({ nextAddress: null });

        }
    } 


    for (let i = 0; i < list.length; i++) {
        const address = {
            _id: mongoose.Types.ObjectId(),
            ipAddress: list[i],
            ipBuffered: ip.toBuffer(list[i]),
            nextAddress: null,
        }
        if (i=== 0 && lastAddress) {
            if (lastAddress.ipBuffered < address.ipBuffered) {
                lastAddress.nextAddress = address._id;
                lastAddress.save();
            }
        }

        if (i > 0 && i < list.length) {
            prevAddress.nextAddress = address._id
        }
        if (i === list.length - 1 && lastAddress) {
            if ( lastAddress.ipBuffered > address.ipBuffered)
            {
                address.nextAddress = lastAddress._id
            }

        }

        prevAddress = address;

        recycleRange.push(address);
    }
    return recycleRange
}

const isAvailableFromRecycle = async (numOfAddresses) => {
    console.log(numOfAddresses)

    const pool = await Recycle.find().sort({ ipBuffered: 1}).limit(+numOfAddresses);
    return pool;

}

const populateListOfOwners = async () => {
    const users = User.find({}).select('username')
    users.exec((err, value) => {
        if (err) return err
        else {
           return value;
        }
    });
    return users
}

const checkIsLoggedIn = (status) => {
    if (!status) return false
    else return true;
}

const deleteFromRecycle = async (pool) => {

    let address = pool[0];
    let flag = true;
    let next;
    while (flag) {
        if (address && !address.nextAddress) flag = false;
        if (flag) next = await Recycle.findById(address.nextAddress)
        await Recycle.deleteOne({_id: address._id});
        if (flag) address = next;
    }

}

const isNotAlive = async (givenHost, numOfAddress) => {

    const hosts = [];
    let currentHost = givenHost;
    for (let i = 0; i < numOfAddress; i++) {
        hosts.push(currentHost);
        currentHost = generateOriginalFirstIp(currentHost)
    }
    let flag = true;

     hosts.forEach(host => {
        ping.sys.probe(host, (isAlive) => {
            console.log(host)
            if (isAlive) {
                flag = false;
                const error =  new Error(`${host} is in use!`)
                return next(error);
            } 
        })
        return flag;
    })

}

const findBiggestIP = async () => {

    const max = await Address.find().sort({ ipBuffered: -1 }).limit(1);
    return max[0];
}
exports.findBiggestIP = findBiggestIP;
exports.isNotAlive = isNotAlive
exports.isAvailableFromRecycle = isAvailableFromRecycle;
exports.deleteFromRecycle = deleteFromRecycle;
exports.checkIsLoggedIn = checkIsLoggedIn
exports.populateListOfOwners = populateListOfOwners
exports.createAddressRange = createAddressRange
exports.validateConsecutive = validateConsecutive
exports.addToRecycle = addToRecycle