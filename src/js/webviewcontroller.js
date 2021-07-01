angular.module('opentok-meet').controller('WebViewComposerAppCtrl', ['$scope', '$http', '$window', '$document',
  '$timeout', 'OTSession', 'RoomService', 'baseURL', 'SimulcastService', 'NotificationService',
  function WebViewComposerAppCtrl(
    $scope, $http, $window, $document, $timeout, OTSession, RoomService, baseURL, SimulcastService
  ) {
    $scope.streams = OTSession.streams;
    $scope.connections = OTSession.connections;
    $scope.isAndroid = /Android/g.test(navigator.userAgent);
    $scope.connected = false;
    $scope.reconnecting = false;
    $scope.editorUnread = false;
    $scope.leaving = false;
    $scope.zoomed = true;
    $scope.bigZoomed = false;
    $scope.layoutProps = {
      animate: false,
      bigFixedRatio: !$scope.bigZoomed,
      fixedRatio: !$scope.zoomed,
    };
    $scope.filter = 'none';

    $scope.notMine = stream =>
      stream.connection.connectionId !== $scope.session.connection.connectionId;

    $scope.getPublisher = id => OTSession.publishers.filter(x => x.id === id)[0];

    // Fetch the room info
    RoomService.getRoom().then((roomData) => {
      if ($scope.session) {
        $scope.session.disconnect();
      }
      $scope.p2p = roomData.p2p;
      $scope.room = roomData.room;
      $scope.shareURL = baseURL === '/' ? $window.location.href : baseURL + roomData.room;

      OTSession.init(roomData.apiKey, roomData.sessionId, roomData.token, (err, session) => {
        if (err) {
          $scope.$broadcast('otError', { message: err.message });
          return;
        }
        $scope.session = session;
        const connectDisconnect = (connected) => {
          $scope.$apply(() => {
            $scope.connected = connected;
            $scope.reconnecting = false;
            if (!connected) {
              $scope.publishing = false;
            }
          });
        };
        const reconnecting = (isReconnecting) => {
          $scope.$apply(() => {
            $scope.reconnecting = isReconnecting;
          });
        };
        if ((session.is && session.is('connected')) || session.connected) {
          connectDisconnect(true);
        }
        $scope.session.on('sessionConnected', connectDisconnect.bind($scope.session, true));
        $scope.session.on('sessionDisconnected', connectDisconnect.bind($scope.session, false));
        SimulcastService.init($scope.streams, $scope.session);
        $scope.session.on('sessionReconnecting', reconnecting.bind($scope.session, true));
        $scope.session.on('sessionReconnected', reconnecting.bind($scope.session, false));
      });
    });

    $scope.$on('changeZoom', (event, expanded) => {
      if (expanded) {
        $scope.bigZoomed = !$scope.bigZoomed;
      } else {
        $scope.zoomed = !$scope.zoomed;
      }
      $scope.layoutProps = {
        animate: false,
        bigFixedRatio: !$scope.bigZoomed,
        fixedRatio: !$scope.zoomed,
      };
      $scope.$broadcast('otLayout');
    });

    $document.context.body.addEventListener('orientationchange', () => {
      $scope.$broadcast('otLayout');
    });

    $scope.$on('$destroy', () => {
      if ($scope.session && $scope.connected) {
        $scope.session.disconnect();
        $scope.connected = false;
      }
      $scope.session = null;
    });
  }]);
