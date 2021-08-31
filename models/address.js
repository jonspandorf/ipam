const fs = require('fs');
const path = require('path');
const { uuid } = require('uuidv4');

let firstId = 0;
let secondId = 0;
let thirdId = 0; 

const p = path.join(
    path.dirname(require.main.filename),
    'data',
    'addressList.json'
  );


  const getAddressesFromFile = cb => {
    fs.readFile(p, (err, fileContent) => {
      if (err) {
        cb([]);
      } else {
        cb(JSON.parse(fileContent));
      }
    });
  };

module.exports = class Address {
    constructor(ipAddress, owner, deviceName) {
        this.ipAddress = ipAddress;
        this.subnet= 16;
        this.deviceName = deviceName;
        this.devicePlatform = devicePlatform;
        this.description = description;
        this.ownerOfRange = owner;
        this.hostIp = hostIp
    }

    save() {
        this._id = uuid();
        getAddressesFromFile(addresses => {
            addresses.push(this)
            fs.writeFile(p, JSON.stringify(addresses), err => {
                console.log(err);
            });
        });
        return this
    }

    static fetchAll(cb) {
        getAddressesFromFile(cb)
    }

    static fetchLast(cb) {
      const list = getAddressesFromFile(addreess => {
        
      })
      console.log(list)
      // const result = list.find(address => address.isLast === true);
      // return result;
    }

}