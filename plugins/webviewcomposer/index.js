const request = require('request');
const qs = require('qs');

module.exports = (app, config, redis, ot) => {

  app.post('/:room/startWebViewComposing', (req, res) => {

    let body = {
      "url": req.body.url,
      "projectId": req.body.apiKey,
      "sessionId": req.body.sessionId,
      "token": req.body.token
    };

    let postURL = `${config.webviewcomposerUrl}/render`;
    console.log(`Sending POST to ${postURL} with body`, body);

    request({
      method: 'POST',
      uri: postURL,
      json: true,
      body
    }, (errPost, resPost) => {
      if (resPost !== undefined
        && resPost.statusCode == 202
        && resPost.body.id !== undefined)
      {
        let rider_id = resPost.body.id;
        console.log(`Rider created with id: ${rider_id}`);
        res.status(200).send({id: rider_id});
      } else {
        console.log(`Failed to create the rider: ${errPost}`);
        res.send(400);
      }
    });
  });

  app.post('/:room/stopWebViewComposing', (req, res) => {
    let rider_id = req.body.id;
    let body = {
      "id": rider_id
    };
    let deleteURL = `${config.webviewcomposerUrl}/render`;
    console.log(`Stopping rider: ${deleteURL}`);
    request({
      method: 'DELETE',
      uri: deleteURL,
      json: true,
      body
    }, (errDelete, resDelete) => {
      console.log(errDelete, resDelete.statusCode, resDelete.body);
      if (resDelete !== undefined
           && resDelete.statusCode == 200)
      {
        res.send(200);
      } else {
        res.send(400);
      }
    });
  });
};
