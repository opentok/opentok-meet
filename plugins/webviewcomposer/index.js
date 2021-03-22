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

    let postURL = `${config.webviewcomposerUrl}/gr/riders`;
    console.log(`Sending POST to ${postURL} with body`, body);

    request({
      method: 'POST',
      uri: postURL,
      json: true,
      body,
    }, (errPost, resPost) => {
      console.log(errPost, resPost.statusCode, resPost.body);
      if (resPost !== undefined
        && resPost.statusCode == 200
        && resPost.body.id !== undefined)
      {
        let rider_id = resPost.body.id;
        let putURL = `${config.webviewcomposerUrl}/gr/riders/${rider_id}`;
        console.log(`POST OK!, Doing put to ${putURL}`);
        request({
          method: 'PUT',
          uri: putURL,
          json: true,
          body: { "status": "start" },
        }, (errPut, resPut) => {
          if (resPut !== undefined
            && resPut.statusCode == 200)
          {
            res.status(200).send({id: rider_id});
          } else {
            res.send(400);
          }
        });
      } else {
        res.send(400);
      }
    });
  });
};
