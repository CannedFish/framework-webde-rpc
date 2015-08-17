#!/usr/bin/env node
// generate Proxy and Stub automatically base on user defined interface
//
if(process.argv.length < 3)
  return console.log('Usage: generator.js -i ${Your_Interface_File} -t [ipc type] '
      + '-o $[proxy+stub+index](choose one or more separated by "+", will generate all by default)\n'
      + 'e.g. generator.js -i testIface -o proxy+index');

var fs = require('fs'),
    util = require('util'),
    events = require('events'),
    os = require('os'),
    utils = require('utils'),
    json4line = utils.Json4line(),
    param = {
      out: {
        proxy: true,
        stub: true,
        index: true
      }
    };

for(var i = 2; i < process.argv.length; ++i) {
  var prop = process.argv[i];
  switch(prop) {
    case '-i':
      param.file = process.argv[++i];
      break;
    case '-t':
      param.ipcType = process.argv[++i];
      break;
    case '-o':
      var out = process.argv[++i].split('+');
      param.out = {};
      for(var j = 0; j < out.length; ++j) {
        param.out[out[j]] = true;
      }
      break;
    default:
      console.log('Unknown parameter:', prop);
      break;
  }
}

if(param.file) {
  json4line.readJSONFile(param.file, function(err, interfaces) {
    if(err) return console.log('Interface File error:', err);
    builder(interfaces);
  });
} else {
  throw 'No input interface file';
}

function builder(ifaces) {
  if(typeof ifaces.service === 'undefined')
    return console.log('Service\'s name not found');
  // add 'type' and 'remote' field to interface file to determine features of proxy and stub
  //  will be generated.
  var remote = ifaces.remote || 'false',
      pkgName = ifaces.package || 'nodejs.webde',
      addr = ifaces.address || pkgName + '.' + ifaces.service,
      path = ifaces.path || '/' + addr.replace(/\./g, '/'),
      initObj = {
        address: addr,
        path: path,
        name: path.replace(/\//g, '.').substr(1),
        type: '$ipcType'
      };

  if(param.ipcType == 'dbus') {
    initObj.type = 'dbus';
  } else if(param.ipcType == 'binder') {
    initObj.type = 'binder';
  } else {
    var sys = os.type();
    if(sys == 'Linux') {
      initObj.type = 'dbus';
    } else if(sys == 'Android') {
      initObj.type = 'binder';
    }
  }

  if(param.out.proxy) {
    buildProxy('proxy.js', initObj, ifaces.interfaces, false);
  }
  if(param.out.stub) {
    buildStub('stub.js', initObj, ifaces.interfaces,
        (remote == 'true' ? true : false));
  }
  if(remote == 'true' && param.out.proxy) {
    delete initObj.interface;
    delete initObj.serviceObj;
    buildProxy('proxyremote.js', initObj, ifaces.interfaces, true)
  }
  if(param.out.index) {
    buildIndex('../index.js', addr, (remote == 'true'));
  }
}
exports.builder = builder;

var NOTICE = "// This file is auto generated based on user-defined interface.\n"
            + "// Please make sure that you have checked all TODOs in this file.\n"
            + "// TODO: please replace types with peramters' name you wanted of any functions\n"
            + "// TODO: please replace $ipcType with one of dbus, binder, websocket and socket\n";
var GETIPC = "  this._ipc = require('webde-rpc').getIPC(initObj);\n";

function buildStub(filename, initObj, ifaces, remote) {
  var outputFile = [],
      serviceObj = {},
      TODO = '/* TODO: Implement your service. Make sure that call the callback at the end of this function whose parameter is the return of this service.*/';
  initObj.interface = ifaces;
  initObj.service = true;
  initObj.serviceObj = {};
  // construct service object
  for(var i = 0; i < ifaces.length; ++i) {
    serviceObj[ifaces[i].name] = 'function(' + ifaces[i].in.join(', ')
        + (ifaces[i].in.length == 0 ? '' : ', ') + 'callback) {' + TODO + '}';
  }

  try {
    outputFile.push(NOTICE);
    var svrObjStr = JSON.stringify(serviceObj, null, 2).replace(/\"/g, ''),
        lines = svrObjStr.split('\n');
    for(var i = 1; i < lines.length; ++i) {
      lines[i] = '  ' + lines[i];
    }
    var initObjStr = JSON.stringify(initObj, null, 2).replace(/\{\}/, lines.join('\n'));
    outputFile.push("var initObj = " + initObjStr + "\n");
    // the string to get ipc object
    outputFile.push('function Stub() {\n'
      // the string to get ipc object
      + GETIPC
      // TODO: register proxy to server-deamon, if this service will serve for other devices
      + '}\n');
    outputFile.push("Stub.prototype.notify = function(event) {\n"
        + "  this._ipc.notify.apply(this._ipc, arguments);\n"
        + "};\n");
    // interface to get proxy object
    var arg = (remote ? 'proxyAddr' : '');
    outputFile.push("var stub = null"
        + (remote ? ",\n    cd = null;\n" : ";\n")
        + "exports.getStub = function(" + arg + ") {\n"
        + "  if(stub == null) {\n"
        + "    stub = new Stub();\n"
        + "  }\n"
        + "  return stub;\n"
        + "}\n")

    fs.writeFile(filename, outputFile.join('\n'), function(err) {
      if(err) return err;
    });
  } catch(e) {
    return console.log(e);
  }
}

var EVENTHANDLER = "  // TODO: choose to implement interfaces of ipc\n"
        + "  /* handle message send from service\n"
        + "  this._ipc.onMsg = function(msg) {\n"
        + "    // TODO: your handler\n"
        + "  }*/\n\n"
        + "  /* handle the event emitted when connected succeffuly\n"
        + "  this._ipc.onConnect = function() {\n"
        + "    // TODO: your handler\n"
        + "  }*/\n\n"
        + "  /* handle the event emitted when connection has been closed\n"
        + "  this._ipc.onClose = function() {\n"
        + "    // TODO: your handler\n"
        + "  }*/\n\n"
        + "  /* handle the event emitted when error occured\n"
        + "  this._ipc.onError = function(err) {\n"
        + "    // TODO: your handler\n"
        + "  }*/\n",
    COMMENTS = "/**\n"
        + " * @description\n"
        + " *    some brief introduction of this interface\n"
        + " * @param\n"
        + " *    parameter list. e.g. param1: description -> value type\n"
        + " * @return\n"
        + " *    what will return from this interface\n"
        + " */\n";

function buildProxy(filename, initObj, ifaces, remote) {
  var outputFile = [];
  initObj.service = false;
  try {
    outputFile.push(NOTICE);
    if(!remote) {
      var initObjStr = JSON.stringify(initObj, null, 2);
      outputFile.push("var initObj = " + initObjStr + "\n");
    } else {
      outputFile.push("var __cd = undefined,\n"
          + "    init = false,\n"
          + "    pending = [];\n"
          + "require('webde-rpc').defaultSvcMgr().getService('nodejs.webde.commdaemon', function(ret) {\n"
          + "  if(ret.err) return console.log(ret.err);\n"
          + "  __cd = ret.ret;\n"
          + "  init = true;\n"
          + "  __emit();\n"
          + "});\n");
      outputFile.push("function __emit() {\n"
          + "  for(var key in pending) {\n"
          + "    for(var i = 0; i < pending[key].length; ++i) {\n"
          + "      var p = pending[key][i];\n"
          + "      clearTimeout(p[1]);\n"
          + "      proxy[key].apply(proxy, p[0]);\n"
          + "    }\n"
          + "  }\n"
          + "  pending = [];\n"
          + "}\n");
      outputFile.push("function __pend(fn, args, cb) {\n"
          + "  if(typeof pending[fn] === 'undefined') {\n"
          + "    pending[fn] = [];\n"
          + "  }\n"
          + "  var to = setTimeout(function() {\n"
          + "    cb({err: 'Can\\'t get commdaemon service'});\n"
          + "  }, 5000);\n"
          + "  pending[fn].push([args, to]);\n"
          + "}\n")
    }
    var argus = (remote ? 'ip' : ''), 
        initS = (remote ? '  if(typeof ip !== \'undefined\') {\n'
                  + '    this.ip = ip;\n'
                  + '  } else {\n'
                  + '    return console.log(\'The remote IP is required\');\n'
                  + '  }\n\n' : ''); 
    outputFile.push('function Proxy(' + argus +  ') {\n'
      + initS
      // the string to get ipc or cdProxy object
      // + (remote ? "  // TODO: replace $cdProxy to the real path\n"
      // + "  this._cd = require('$cdProxy').getProxy();\n" : GETIPC)
      + (remote ? "" : GETIPC)
      + "  this._token = 0;\n\n"
      // the string to implement event handler user-own
      + (remote ? "" : EVENTHANDLER)
      + '}\n');
    for(var i = 0; i < ifaces.length; ++i) {
      if((ifaces[i].show == 'l' && remote) || (ifaces[i].show == 'r' && !remote))
        continue;
      outputFile.push(COMMENTS
          + "Proxy.prototype." + ifaces[i].name + " = function(" 
          + ifaces[i].in.join(', ')
          + (ifaces[i].in.length == 0 ? "" : ", ") + "callback) {\n"
          + (remote ? ("  if(!init) {\n"
          + "    __pend('" + ifaces[i].name + "', arguments, callback);\n"
          + "    return ;\n"
          + "  }\n") : "")
          + "  var l = arguments.length,\n"
          + "      args = Array.prototype.slice.call(arguments, 0"
          + ", (typeof callback === 'undefined' ? l : l - 1));\n"
          + (remote ? ("  var argv = {\n"
          + "      action: 0,\n"
          + "      svr: '" + initObj.name + "',\n"
          + "      func: '" + ifaces[i].name + "',\n"
          + "      args: args\n"
          + "    };\n"
          + "  __cd.send(this.ip, argv, callback);\n") : ("  this._ipc.invoke({\n"
          + "    token: this._token++,\n"
          + "    name: '" + ifaces[i].name + "',\n"
          + "    in: args,\n"
          + "    callback: callback\n"
          + "  });\n"))
          + "};\n");
    }
    // add on/off interface
    outputFile.push("/**\n"
        + " * @description\n"
        + " *    add listener for ...\n"
        + " * @param\n"
        + " *    param1: event to listen -> String\n"
        + " *    param2: a listener function -> Function\n"
        + " *      @description\n"
        + " *        a callback function called when events happened\n"
        + " *      @param\n"
        + " *        param1: description of this parameter -> type\n"
        + " * @return\n"
        + " *    itself of this instance\n"
        + " */\n"
        + "Proxy.prototype.on = function(event, handler) {\n"
        // send on request to remote peer
        + (remote ? ("  if(!init) {\n"
        + "    __pend('on', arguments, function(){});\n"
        + "    return ;\n"
        + "  }\n"
        + "  __cd.on(event, handler);\n"
        + "  var argvs = {\n"
        + "    'action': 0,\n"
        + "    'svr': '" + initObj.name + "',\n"
        + "    'func': 'on',\n"
        + "    'args': [event]\n"
        + "  };\n"
        + "  __cd.send(this.ip, argvs);\n")
        : "  this._ipc.on(event, handler);\n")
        + "  return this;\n"
        + "};\n\n"
        + "/**\n"
        + " * @description\n"
        + " *    remove listener from ...\n"
        + " * @param\n"
        + " *    param1: event to listen -> String\n"
        + " *    param2: a listener function -> Function\n"
        + " *      @description\n"
        + " *        a callback function called when events happened\n"
        + " *      @param\n"
        + " *        param1: description of this parameter -> type\n"
        + " * @return\n"
        + " *    itself of this instance\n"
        + " */\n"
        + "Proxy.prototype.off = function(event, handler) {\n"
        // send off request to remote peer
        + (remote ? ("  if(!init) {\n"
        + "    __pend('off', arguments, function(){});\n"
        + "    return ;\n"
        + "  }\n"
        + "  __cd.off(event, handler);\n"
        + "  var argvs = {\n"
        + "    'action': 0,\n"
        + "    'svr': '" + initObj.name + "',\n"
        + "    'func': 'off',\n"
        + "    'args': [event]\n"
        + "  };\n"
        + "  __cd.send(this.ip, argvs);\n")
        : "  this._ipc.removeListener(event, handler);\n")
        + "  return this;\n"
        + "};\n");
    // interface to get proxy object
    outputFile.push("var proxy = null;\n"
        + "exports.getProxy = function(" + argus + ") {\n"
        + "  if(proxy == null) {\n"
        + "    proxy = new Proxy(" + argus +  ");\n"
        + "  }\n"
        + "  return proxy;\n"
        + "};\n");

    fs.writeFile(filename, outputFile.join('\n'), function(err) {
      if(err) return err;
    });
  } catch(e) {
    return console.log(e);
  }
}

// build an index.js to initialize some events listened on parent's process(a.k.a svcmgr)
//
function buildIndex(filename, svcName, remote) {
  try {
    var outputFile = [];
    outputFile.push("// Main function of this service\n"
        + "function onStart() {\n"
        + "  // TODO: your code to start up this service\n"
        + "  //   ... ...\n"
        + "}\n");
    outputFile.push("// Do not modify codes below!!\n");
    outputFile.push("if(process.argv[2] == 'start') {\n"
        + "  onStart();\n"
        + "  // initialize some event handler\n"
        + "  process.on('SIGTERM', function() {\n"
        + "    console.log('SIGTERM recived');\n"
        + "    process.exit(0);\n"
        + "  }).on('SIGINT', function() {\n"
        + "    console.log('SIGINT recived');\n"
        + "    process.exit(0);\n"
        + "  });\n"
        + "} else {\n"
        + "  var svcmgr = require('webde-rpc').defaultSvcMgr();\n"
        + "  svcmgr.addService('" + svcName + "', {\n"
        + "    path: __dirname,\n"
        + "    args: ['start'],\n"
        + (remote ? "    remote: true\n" : "    remote: false\n")
        + "  }, function(ret) {\n"
        + "    if(ret.err) {\n"
        + "      console.log(ret.err);\n"
        + "      process.exit(1);\n"
        + "    }\n"
        + "    process.exit(0);\n"
        + "  });\n"
        + "}\n");
    fs.writeFile(filename, outputFile.join('\n'), function(err) {
      if(err) return err;
    });
  } catch(e) {
    return console.log(e);
  }
}

// TODO: build a HTML document to describ interfaces
//

