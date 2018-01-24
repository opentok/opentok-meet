require('../css/subscriber-stats.css');
var subscriberStatsHTML = require('../templates/subscriber-stats.html');

// StatsService runs on a particular interval and updates the stats for all
// of the subscribers
function SubscriberStats(subscriber, onStats) {
  this.subscriber = subscriber;
  this.onStats = onStats;
  this.lastStats; // The previous getStats result
  this.lastLastStats; // The getStats result before that
}

angular.module('opentok-meet').factory('StatsService', ['$http', '$interval', 'baseURL', 'room',
  function($http, $interval, baseURL, room) {
    var interval,
      subscribers = {}; // A collection of SubscriberStats objects keyed by subscriber.id

    var updateSubscriberStats = function(subscriberStats) {
      var subscriber = subscriberStats.subscriber,
          lastStats = subscriberStats.lastStats,
          lastLastStats = subscriberStats.lastLastStats;

      subscriber.getStats(function(err, stats) {
        if (err) {
          console.error(err);
          return;
        }
        var currStats = {
          width: subscriber.videoWidth(),
          height: subscriber.videoHeight(),
          timestamp: stats.timestamp
        };
        var secondsElapsed;
        if (lastStats) {
          secondsElapsed = (stats.timestamp - lastStats.timestamp) / 1000;
        }
        var setCurrStats = function(type) {
          currStats[type] = stats[type];
          if (stats[type].packetsReceived > 0) {
            currStats[type + 'PacketLoss'] = ((stats[type].packetsLost /
                                               stats[type].packetsReceived) * 100).toFixed(2);
          }
          if (lastStats) {
            if (lastLastStats && lastLastStats[type] && lastLastStats[type].packetsReceived &&
                (stats[type].packetsReceived - lastLastStats[type].packetsReceived > 0)) {
              currStats[type + 'PacketLoss'] =
                (((stats[type].packetsLost - lastLastStats[type].packetsLost)/
                  (stats[type].packetsReceived - lastLastStats[type].packetsReceived)))
                .toFixed(2);
            }
            var bitsReceived = (stats[type].bytesReceived -
                                (lastStats[type] ? lastStats[type].bytesReceived : 0)) * 8;
            currStats[type + 'Bitrate'] = ((bitsReceived / secondsElapsed)/1000).toFixed(0);
          } else {
            currStats[type + 'Bitrate'] = '0';
          }
        };
        if (stats.audio) {
          setCurrStats('audio');
        }
        if (stats.video) {
          setCurrStats('video');
        }


        subscriberStats.lastLastStats = subscriberStats.lastStats;
        subscriberStats.lastStats = currStats;

        if (subscriberStats.lastLastStats &&
            subscriberStats.lastLastStats.info) {
          // info must be retrieved only once since it does not change
          // for the lifetime of a subscriber.
          var info = subscriberStats.lastLastStats.info;
          subscriberStats.lastStats.info = {
            originServer: info.originServer,
            edgeServer: info.edgeServer
          };
        }

        if (subscriberStats.audioCodec && subscriberStats.videoCodec) {
          currStats.videoCodec = subscriberStats.videoCodec;
          currStats.audioCodec = subscriberStats.audioCodec;
        }

        subscriberStats.onStats(currStats);

        if (subscriberStats.lastStats.info) {
          return;
        }

        var widgetId = subscriberStats.subscriber.widgetId;
        $http.get(baseURL + room + '/subscriber/' + widgetId)
          .then(function(res) {
            if (res && res.data && res.data.info) {
              currStats.info = res.data.info;
            } else {
              console.info('received error response  ', res);
            }
          })
          .catch(function(err) {
            console.trace('failed to retrieve susbcriber info ', err);
          });

        // Listen to internal qos events to figure out the audio and video codecs
        var qosHandler = function(qos) {
          if (qos.videoCodec && qos.audioCodec) {
            subscriberStats.videoCodec = qos.videoCodec;
            subscriberStats.audioCodec = qos.audioCodec;
            subscriber.off('qos', qosHandler);
          }
        };
        subscriber.on('qos', qosHandler);
      });
    };

    var updateStats = function () {
      Object.keys(subscribers).forEach(function(subscriberId) {
        updateSubscriberStats(subscribers[subscriberId]);
      });
    };

    return {
      addSubscriber: function(subscriber, onStats) {
        var stats = new SubscriberStats(subscriber, onStats);
        subscribers[subscriber.id] = stats;
        if (!interval) {
          interval = $interval(updateStats, 2000);
          updateSubscriberStats(stats);
        }
      },

      removeSubscriber: function(subscriberId) {
        delete subscribers[subscriberId];
        if (Object.keys(subscribers).length === 0) {
          $interval.cancel(interval);
          interval = null;
        }
      }
    };
  }
]);

angular.module('opentok-meet').directive('subscriberStats', ['OTSession', 'StatsService',
  '$timeout', function(OTSession, StatsService, $timeout) {
    return {
      restrict: 'E',
      scope: {
        stream: '='
      },
      template: subscriberStatsHTML,
      link: function(scope, element) {
        var subscriber, subscriberId;
        var timeout = $timeout(function () {
          // subscribe hasn't been called yet so we wait a few milliseconds
          subscriber = OTSession.session.getSubscribersForStream(scope.stream)[0];
          subscriber.on('connected', function() {
            subscriberId = subscriber.id;

            StatsService.addSubscriber(subscriber, function (stats) {
              scope.stats = stats;
              scope.$apply();
            });
          });
        }, 100);

        angular.element(element).find('button').on('click', function() {
          scope.showStats = !scope.showStats;
          subscriber.setStyle({
            buttonDisplayMode: scope.showStats ? 'on' : 'auto'
          });
          scope.$apply();
        });
        scope.$on('$destroy', function() {
          if (subscriberId) {
            StatsService.removeSubscriber(subscriberId);
          }
          $timeout.cancel(timeout);
        });
      }
    };
  }
]);
