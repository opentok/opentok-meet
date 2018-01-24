/*jshint unused:false*/
require('./h264/add-regeneration-capability.js');

window.$ = window.jQuery = require('jquery');

var angular = require('angular');
var errorReporting = require('./lib/error-reporting.js');
errorReporting(angular);

require('opentok-angular');
require('opentok-whiteboard');
require('opentok-whiteboard/opentok-whiteboard.css');
require('opentok-editor');
require('opentok-editor/opentok-editor.css');
require('opentok-textchat');
require('opentok-textchat/opentok-textchat.css');
require('ng-debounce/dist/ng-debounce.js');

angular.module('opentok-meet', ['ngRaven', 'opentok', 'opentok-whiteboard',
  'opentok-editor', 'opentok-textchat', 'debounce']);

require('./directives.js');
require('./sync-click.js');
require('./subscriber-stats.js');
require('./subscriber-report.js');
require('./publisher-stats.js');
require('./controllers.js');
require('./services.js');
require('./screen/directive.js');
require('./simulcast-service.js');
require('./audio-acquisition-problem.js');
require('./notifications.js');
require('./ot-errors.js');
require('./filtered-publisher.js');

require('./safari-electron-redirect.js');
