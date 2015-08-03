exports.config = {
  allScriptsTimeout: 11000,

  specs: [
    'e2e/*.js'
  ],

  capabilities: {
    'browserstack.user' : process.env.BROWSERSTACK_USERNAME,
    'browserstack.key' : process.env.BROWSERSTACK_KEY,
    'browserstack.local' : 'true',
    'browserName': 'chrome',
    'chromeOptions': {
      'args': ['use-fake-device-for-media-stream', 'use-fake-ui-for-media-stream']
    }
  },
  
  seleniumAddress: 'http://hub.browserstack.com/wd/hub',

  baseUrl: 'http://localhost:5000/',

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 60000
  }
};
