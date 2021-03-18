const request = require('request');

module.exports = (app, config, redis, ot) => {

  app.post('/:room/startWebViewComposing', (req, res) => {
    let body = {
      "url": req.body.url,
      "opentok": {
        "api_key": req.body.apiKey,
        "session_id": req.body.sessionId,
        "token": req.body.token
      }
    };

    console.log(body);

    request({
      method: 'POST',
      uri: `${config.webviewcomposerUrl}/gr/riders`,
      json: true,
      body,
    }, (errPost, resPost) => {
      console.log(errPost, resPost.statusCode, resPost.body);
      if (resPost !== undefined
        && resPost.statusCode == 200
        && resPost.body.id !== undefined)
      {
        console.log(resPost);
        let rider_id = resPost.body.id;
        request({
          method: 'PUT',
          uri: `${config.webviewcomposerUrl}/gr/riders/${rider_id}`,
          json: true,
          body: { "status": "start" },
        }, (errPut, resPut) => {
          console.log(errPut, resPut);
          if (resPut !== undefined
            && resPut.statusCode == 200)
          {
            res.send(200);
          } else {
            res.send(500);
          }
        });
      } else {
        res.send(500);
      }
    });
  });
};
