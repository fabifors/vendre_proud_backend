// Import express and request modules
var express = require('express')
var request = require('request')
var bodyParser = require('body-parser')
var cors = require('cors')

const { WebClient } = require('@slack/web-api')

// Store our app's ID and Secret. These we got from Step 1.
// For this tutorial, we'll keep your API credentials right here. But for an actual app, you'll want to  store them securely in environment variables.
var clientId = '230513850368.604545361031'
var clientSecret = 'ece45a81b8946cf3b95e53250315a152'

// Instantiates Express and assigns our app variable to it
var app = express()
app.use(bodyParser.json())
app.use(cors())

var globalToken = null

// Again, we define a port we want to listen to
const PORT = 4390

// Lets start our server
app.listen(PORT, function() {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Example app listening on port ' + PORT)
})

// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function(req, res) {
  res.send(
    'Ngrok is working! Path Hit: '
    // '<a href="https://slack.com/oauth/authorize?scope=incoming-webhook&client_id=230513850368.604545361031"><img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>'
  )
})

// This route handles get request to a /oauth endpoint. We'll use this endpoint for handling the logic of the Slack oAuth process behind our app.
app.get('/oauth', function(req, res) {
  // When a user authorizes an app, a code query parameter is passed on the oAuth endpoint. If that code is not there, we respond with an error message
  if (!req.query.code) {
    res.status(500)
    res.send({ Error: "Looks like we're not getting code." })
    console.log("Looks like we're not getting code.")
  } else {
    // If it's there...

    // We'll do a GET call to Slack's `oauth.access` endpoint, passing our app's client ID, client secret, and the code we just got as query parameters.
    request(
      {
        url: 'https://slack.com/api/oauth.access', //URL to hit
        qs: {
          code: req.query.code,
          client_id: clientId,
          client_secret: clientSecret
        }, //Query string data
        method: 'GET' //Specify the method
      },
      function(error, response, body) {
        if (error) {
          console.log(error)
        } else {
          console.log(
            'accesstoken: ' +
              body.access_token +
              ' userid_ ' +
              body.user_id +
              ' full body: ' +
              body
          )
          var newBody = JSON.parse(body)
          globalToken = newBody.access_token
          globalUser = newBody.user_id
          res.redirect(
            'http://localhost:8080/#/home?access_token=' +
              newBody.access_token +
              '&user_id=' +
              newBody.user_id
          )
          //res.json(body)
        }
      }
    )
  }
})

// Route the endpoint that our slash command will point to and send back a simple response to indicate that ngrok is working
app.post('/command', function(req, res) {
  res.send('Your ngrok tunnel is up and running!')
})

app.post('/sendMessage', function(req, res) {
  console.log(req.body)
  //const token = process.env.SLACK_TOKEN
  if (req.body.token) {
    console.log('globaltoken exist: ' + req.body.token)
    globalToken = req.body.token
  } else {
    console.log('no global token')
    console.log(req.body.token)
  }
  const web = new WebClient(globalToken)

  // This argument can be a channel ID, a DM ID, a MPDM ID, or a group ID
  const conversationId = 'GHGLPKJRF' // default convo ID

  ;(async () => {
    // See: https://api.slack.com/methods/chat.postMessage
    if (!!globalToken) {
      const result = await web.chat
        .postMessage({
          channel: conversationId,
          text: req.body.text
        })
        .catch(err => {
          res.send({ success: false, error: err })
        })
      //console.log('Message sent: ', res.ts)
      res.send({ success: true, data: result })
    } else {
      res.send({ success: false, error: 'Please authorize and try again' })
    }
    // `res` contains information about the posted message
  })()
})
