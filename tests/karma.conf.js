var webpack = require('webpack');
var GitRevisionPlugin = require('git-revision-webpack-plugin');
var gitRevisionPlugin = new GitRevisionPlugin();

module.exports = function(config) {
  var sauceLaunchers = {
    'Ie': {
      base: 'SauceLabs',
      browserName: 'internet explorer',
      platform: process.env.BVER === '10' ? 'Windows 8' : 'Windows 8.1',
      version: process.env.BVER,
      prerun: {
        executable: 'http://localhost:5000/SauceLabsInstaller.exe',
        background: false
      }
    },
    Safari: {
      base: 'SafariTechPreview'
    }
  };
  var browser = process.env.BROWSER || 'chrome';
  config.set({

    basePath: '../',

    files: [
      'https://tbdev.tokbox.com/v2/js/opentok.js',
      'tests/unit/**/index.js'
    ],

    exclude: [
      'public/js/opentok.js'
    ],

    autoWatch: true,

    frameworks: ['jasmine'],

    customLaunchers: sauceLaunchers,

    browsers: [browser[0].toUpperCase() + browser.substr(1)],

    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-coverage',
      'karma-sauce-launcher',
      'karma-webpack',
      'karma-sourcemap-loader',
      'karma-safaritechpreview-launcher'
    ],

    junitReporter: {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    },

    preprocessors: {
      'src/js/**/*.js': ['sourcemap', 'coverage'],
      'tests/unit/**/index.js': ['webpack', 'sourcemap']
    },

    sauceLabs: {
      startConnect: false,
      tunnelIdentifier: process.env.TRAVIS_JOB_NUMBER
    },

    client: {
      clearContext: true
    },

    webpack: {
      module: {
          loaders: [
              { test: /\.css$/, loader: 'style!css' },
              { test: /\.html$/, loader: 'raw' },
              {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules(?!\/opentok-textchat)/,
                query: {
                  presets: ['babel-preset-env'].map(require.resolve)
                }
              }
          ]
      },
      devtool: 'inline-source-map',
      plugins: [
        new webpack.DefinePlugin({
            VERSION: JSON.stringify(gitRevisionPlugin.version()),
            COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
        }),
      ],
    },

    webpackMiddleware: {
      noInfo: true
    },

    reporters: ['progress', 'saucelabs', 'coverage'],

    coverageReporter: {
      type: 'lcov',
      dir: 'coverage/'
    }

  });
};
