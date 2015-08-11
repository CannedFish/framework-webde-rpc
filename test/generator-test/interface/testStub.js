// This file is auto generated based on user-defined interface.
// Please make sure that you have checked all TODOs in this file.
// TODO: please replace types with peramters' name you wanted of any functions
// TODO: please replace $ipcType with one of dbus, binder, websocket and socket

var initObj = {
  "address": "nodejs.webde.test",
  "path": "/nodejs/webde/test",
  "name": "nodejs.webde.test",
  "type": "dbus",
  "service": true,
  "interface": [
    {
      "name": "setVal",
      "in": [
        "String"
      ]
    },
    {
      "name": "getVal",
      "in": []
    }
  ],
  "serviceObj": {
    setVal: function(String, callback) {/* TODO: Implement your service. Make sure that call the callback at the end of this function whose parameter is the return of this service.*/},
    getVal: function(callback) {/* TODO: Implement your service. Make sure that call the callback at the end of this function whose parameter is the return of this service.*/}
  }
}

function Stub() {
  // this._ipc = require('webde-rpc').getIPC(initObj);
}

Stub.prototype.notify = function(event) {
  this._ipc.notify.apply(this._ipc, arguments);
};

var stub = null,
    cd = null;
exports.getStub = function(proxyAddr) {
  if(stub == null) {
    if(typeof proxyAddr === 'undefined')
      throw 'The path of proxy\'s module file we need!';
    // TODO: replace $cdProxy to the path of commdaemonProxy
    cd = require('$cdProxy').getProxy();
    cd.register(initObj.name, proxyAddr, function(ret) {
      if(ret.err) {
        return console.log(ret.err
          , 'This service cannot be accessed from other devices since failed to register on CD');
      }
    });
    stub = new Stub();
  }
  return stub;
}
