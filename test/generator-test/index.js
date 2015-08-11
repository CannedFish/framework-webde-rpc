// Main function of this service
function onStart() {
  // TODO: your code to start up this service
  //   ... ...

}

// Do not modify codes below!!
function parser(msg) {
}

if(process.argv[2] == 'start') {
  onStart();
  // initialize some event handler
  process.on('message', function(msg) {
    parser(msg);
  });
} else {
  var svcmgr = require('webde-rpc').defaultSvcMgr();
  svcmgr.addService(false, {
    path: __dirname,
    args: ['start']
  }, function(ret) {
    if(ret.err) {
      console.log(ret.err);
      process.exit(1);
    }
    process.exit(0);
  });
}
