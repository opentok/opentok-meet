const request = require('request');

module.exports = (app, config) => {
  app.post('/:room/start-web-view-composing', (req, res) => {
    const body = {
      'url': req.body.url,
      'projectId': req.body.apiKey,
      'sessionId': req.body.sessionId,
      'token': req.body.token,
    };

    const postURL = `${config.webViewComposerUrl}/render`;
    console.log(`Sending POST to ${postURL} with body`, body);

    request({
      method: 'POST',
      uri: postURL,
      json: true,
      body,
    }, (errPost, resPost) => {
      if (resPost && resPost.statusCode === 202 && resPost.body.id) {
        const riderId = resPost.body.id;
        console.log(`Rider created with id: ${riderId}`);
        res.status(200).send({ id: riderId });
      } else {
        console.log(`Failed to create the rider: ${errPost}`);
        res.send(400);
      }
    });
  });

  app.post('/:room/stop-web-view-composing', (req, res) => {
    const riderId = req.body.id;
    const body = {
      id: riderId,
    };
    const deleteURL = `${config.webViewComposerUrl}/render`;
    console.log(`Stopping rider: ${deleteURL}`);
    request({
      method: 'DELETE',
      uri: deleteURL,
      json: true,
      body,
    }, (errDelete, resDelete) => {
      console.log(errDelete, resDelete.statusCode, resDelete.body);
      if (resDelete && resDelete.statusCode === 200) {
        res.send(200);
      } else {
        res.send(400);
      }
    });
  });
};
