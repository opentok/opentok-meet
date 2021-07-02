angular.module('opentok-meet').controller('RoomCtrl', ['$scope', '$http', '$window', '$document',
  '$timeout', 'OTSession', 'RoomService', 'baseURL', 'SimulcastService', 'NotificationService',
  function RoomCtrl(
    $scope, $http, $window, $document, $timeout, OTSession, RoomService, baseURL, SimulcastService,
    NotificationService
  ) {
    $scope.streams = OTSession.streams;
    $scope.connections = OTSession.connections;
    $scope.publishing = false;
    $scope.archiveId = null;
    $scope.archiving = false;
    $scope.isAndroid = /Android/g.test(navigator.userAgent);
    $scope.connected = false;
    $scope.reconnecting = false;
    $scope.mouseMove = false;
    $scope.showWhiteboard = false;
    $scope.whiteboardUnread = false;
    $scope.showEditor = false;
    $scope.editorUnread = false;
    $scope.showTextchat = false;
    $scope.textChatUnread = false;
    $scope.leaving = false;
    $scope.zoomed = true;
    $scope.bigZoomed = false;
    $scope.layoutProps = {
      animate: false,
      bigFixedRatio: !$scope.bigZoomed,
      fixedRatio: !$scope.zoomed,
    };
    $scope.filter = 'none';
    $scope.webviewComposerRequestInflight = false;
    $scope.webviewComposerId = null;
    $scope.startingWebviewComposing = false;

    const facePublisherPropsHD = {
      name: 'face',
      width: '100%',
      height: '100%',
      style: {
        nameDisplayMode: 'off',
      },
      usePreviousDeviceSelection: true,
      resolution: '1280x720',
      frameRate: 30,
      _allowSafariSimulcast: true,
    };
    const facePublisherPropsSD = {
      name: 'face',
      width: '100%',
      height: '100%',
      style: {
        nameDisplayMode: 'off',
      },
      _allowSafariSimulcast: true,
    };
    $scope.facePublisherProps = facePublisherPropsHD;

    $scope.notMine = stream =>
      stream.connection.connectionId !== $scope.session.connection.connectionId;

    $scope.getPublisher = id => OTSession.publishers.filter(x => x.id === id)[0];

    $scope.togglePublish = (publishHD) => {
      if (!$scope.publishing) {
        // If they unpublish and publish again then prompt them to change their devices
        facePublisherPropsHD.usePreviousDeviceSelection = false;
        $scope.facePublisherProps = publishHD ? facePublisherPropsHD : facePublisherPropsSD;
      }
      $scope.publishing = !$scope.publishing;
    };

    $scope.forceMuteAll = () => {
      $scope.session.forceMuteAll().then(() => {
        console.log('forceMuteAll complete');
      }).catch((error) => {
        console.error('forceMuteAll failed', error);
      });
    };

    $scope.forceMuteAllExcludingPublisherStream = () => {
      const streamId = (OT.publishers.find() || {}).streamId;
      const streams = (OT.sessions.find() || {}).streams;
      const stream = streams ? streams.get(streamId) : undefined;
      $scope.session.forceMuteAll([stream]).then(() => {
        console.log('forceMuteAllExcludingPublisherStream complete');
      }).catch((error) => {
        console.error('forceMuteAllExcludingPublisherStream failed', error);
      });
    };

    const startArchiving = () => {
      $scope.archiving = true;
      $http.post(`${baseURL + $scope.room}/startArchive`).then((response) => {
        if (response.data.error) {
          $scope.archiving = false;
          console.error('Failed to start archive', response.data.error);
        } else {
          $scope.archiveId = response.data.archiveId;
        }
      }).catch((response) => {
        console.error('Failed to start archiving', response);
        $scope.archiving = false;
      });
    };

    const stopArchiving = () => {
      $scope.archiving = false;
      $http.post(`${baseURL + $scope.room}/stopArchive`, {
        archiveId: $scope.archiveId,
      }).then((response) => {
        if (response.data.error) {
          console.error('Failed to stop archiving', response.data.error);
          $scope.archiving = true;
        } else {
          $scope.archiveId = response.data.archiveId;
        }
      }).catch((response) => {
        console.error('Failed to stop archiving', response);
        $scope.archiving = true;
      });
    };

    $scope.reportIssue = () => {
      let url = `mailto:broken@tokbox.com?subject=Meet%20Issue%20Report&body=room: ${$scope.room}  p2p: ${$scope.p2p}`;
      if ($scope.session) {
        url += ` sessionId: ${$scope.session.sessionId} connectionId: ${($scope.session.connection ? $scope.session.connection.connectionId : 'none')}`;
      }
      OT.publishers.forEach((publisher) => {
        if (publisher.stream) {
          url += ` publisher streamId: ${publisher.stream.streamId} publisher stream type: ${publisher.stream.videoType}`;
        }
      });
      OT.subscribers.forEach((subscriber) => {
        if (subscriber.stream) {
          url += ` subscriber streamId: ${subscriber.stream.streamId} 
            subscriber stream type: ${subscriber.stream.videoType} subscriber id: ${subscriber.id}`;
        }
      });
      $window.open(url);
      return false;
    };

    $scope.toggleArchiving = () => {
      if ($scope.archiving) {
        stopArchiving();
      } else {
        startArchiving();
      }
    };

    $scope.toggleWhiteboard = () => {
      $scope.showWhiteboard = !$scope.showWhiteboard;
      $scope.whiteboardUnread = false;
      setTimeout(() => {
        $scope.$broadcast('otLayout');
      }, 10);
    };

    $scope.toggleEditor = () => {
      $scope.showEditor = !$scope.showEditor;
      $scope.editorUnread = false;
      setTimeout(() => {
        $scope.$broadcast('otLayout');
        $scope.$broadcast('otEditorRefresh');
      }, 10);
    };

    $scope.toggleTextchat = () => {
      $scope.showTextchat = !$scope.showTextchat;
      $scope.textChatUnread = false;
    };

    const webViewComposerSignals = {
      INFLIGHT_STOP: 'inflightStop',
      INFLIGHT_START: 'inflightStart',
      RIDER_STARTED: 'riderStarted',
      RIDER_STOPPED: 'riderStopped',
      QUERY_RIDER: 'queryRider',
    };

    const webViewComposerInflightAction = {
      START: 'START',
      STOP: 'STOP',
    };

    const reportInflighStart = () => {
      $scope.webviewComposerRequestInflight = true;
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.INFLIGHT_START,
          action: $scope.webviewComposerRequestAction,
        },
      });
    };

    const reportInflighStop = () => {
      $scope.webviewComposerRequestInflight = false;
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.INFLIGHT_STOP,
        },
      });
    };

    const reportRiderStarted = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.RIDER_STARTED,
          id: $scope.webviewComposerId,
        },
      });
    };

    const reportRiderStopped = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.RIDER_STOPPED,
        },
      });
    };

    const queryRider = () => {
      $scope.session.signal({
        type: 'wvc',
        data: {
          msg: webViewComposerSignals.QUERY_RIDER,
        },
      });
    };

    $scope.toggleWebcomposing = () => {
      if ($scope.webviewComposerRequestInflight) { return; }
      $scope.webviewComposerRequestAction = $scope.webviewComposerId ?
        webViewComposerInflightAction.STOP : webViewComposerInflightAction.START;
      reportInflighStart();
      if ($scope.webviewComposerId) {
        const postData = { id: $scope.webviewComposerId };
        $http.post(`${baseURL + $scope.room}/stop-web-view-composing`, postData)
          .then(() => {
            reportInflighStop();
            reportRiderStopped();
            $scope.webviewComposerId = null;
          }, (error) => {
            reportInflighStop();
            console.log('Failed to stop webview composer', error);
            $timeout(() => $scope.$broadcast('otError', { message: `Failed to stop webview composer: ${error.statusText}` }));
          });
      } else {
        RoomService.getWebviewComposerRoom().then((roomData) => {
          const postData = roomData;
          postData.url = `${window.location.href}/webview-composer-app`;
          $http.post(`${baseURL + $scope.room}/start-web-view-composing`, postData)
            .then((response) => {
              reportInflighStop();
              if (response.data.id) {
                $scope.webviewComposerId = response.data.id;
                reportRiderStarted($scope.webviewComposerId);
              } else {
                console.log('Wrong answer from server', response.data);
                $timeout(() => $scope.$broadcast('otError', { message: 'Unexpected answer from server' }));
              }
            }, (error) => {
              console.log('Failed to start webview composer: ', error);
              reportInflighStop();
              $timeout(() => $scope.$broadcast('otError', { message: `Failed to start webview composer: ${error.statusText}` }));
            });
        });
      }
    };

    NotificationService.init();

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
        $scope.session.on('archiveStarted archiveStopped', (event) => {
          // event.id is the archiveId
          $scope.$apply(() => {
            $scope.archiveId = event.id;
            $scope.archiving = (event.type === 'archiveStarted');
          });
        });
        SimulcastService.init($scope.streams, $scope.session);
        $scope.session.on('sessionReconnecting', reconnecting.bind($scope.session, true));
        $scope.session.on('sessionReconnected', reconnecting.bind($scope.session, false));

        // webview composer signalling
        $scope.session.on('signal:wvc', (event) => {
          if ($scope.session.connection && event.from.connectionId !== $scope.session.connection.id) {
            if (event.data.msg === webViewComposerSignals.INFLIGHT_START
              && !$scope.webviewComposerRequestInflight) {
              $scope.webviewComposerRequestInflight = true;
              $scope.webviewComposerRequestAction = event.data.action;
            } else if (event.data.msg === webViewComposerSignals.INFLIGHT_STOP
              && $scope.webviewComposerRequestInflight) {
              $scope.webviewComposerRequestInflight = false;
            } else if (event.data.msg === webViewComposerSignals.RIDER_STARTED
              && !$scope.webviewComposerId) {
              console.log('started', event.data.id);
              $scope.webviewComposerId = event.data.id;
            } else if (event.data.msg === webViewComposerSignals.RIDER_STOPPED
              && $scope.webviewComposerId) {
              $scope.webviewComposerId = null;
            } else if (event.data.msg === webViewComposerSignals.QUERY_RIDER) {
              if ($scope.webviewComposerId) {
                reportRiderStarted($scope.webviewComposerId);
              } else if ($scope.webviewComposerRequestInflight) {
                reportInflighStart();
              }
            }
          }
        });

        queryRider();
      });

      const whiteboardUpdated = () => {
        if (!$scope.showWhiteboard && !$scope.whiteboardUnread) {
          // Someone did something to the whiteboard while we weren't looking
          $scope.$apply(() => {
            $scope.whiteboardUnread = true;
            $scope.mouseMove = true; // Show the bottom bar
          });
        }
      };
      const editorUpdated = () => {
        if (!$scope.showEditor && !$scope.editorUnread) {
          // Someone did something to the editor while we weren't looking
          $scope.$apply(() => {
            $scope.editorUnread = true;
            $scope.mouseMove = true; // Show the bottom bar
          });
        }
      };
      const textChatMessage = () => {
        if (!$scope.showTextchat) {
          $scope.textChatUnread = true;
          $scope.mouseMove = true; // Show the bottom bar
          $scope.$apply();
        }
      };
      $scope.$on('otEditorUpdate', editorUpdated);
      $scope.$on('otWhiteboardUpdate', whiteboardUpdated);
      $scope.$on('otTextchatMessage', textChatMessage);

      const params = new URLSearchParams($window.location.search);
      $scope.publishing = (params.get('autoPublish') !== 'false');
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

    $scope.changeRoom = () => {
      if (!$scope.leaving) {
        $scope.leaving = true;
        $scope.session.disconnect();
        $scope.session.on('sessionDisconnected', () => {
          $scope.$apply(() => {
            RoomService.changeRoom();
          });
        });
      }
    };

    $scope.sendEmail = () => {
      $window.location.href = `mailto:?subject=Let's Meet&body=${$scope.shareURL}`;
    };

    let mouseMoveTimeout;
    const mouseMoved = () => {
      if (!$scope.mouseMove) {
        $scope.$apply(() => {
          $scope.mouseMove = true;
        });
      }
      if (mouseMoveTimeout) {
        $timeout.cancel(mouseMoveTimeout);
      }
      mouseMoveTimeout = $timeout(() => {
        $scope.$apply(() => {
          $scope.mouseMove = false;
        });
      }, 5000);
    };
    $window.addEventListener('mousemove', mouseMoved);
    $window.addEventListener('touchstart', mouseMoved);
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
