/*
 * JBoss, Home of Professional Open Source
 * Copyright 2016, Red Hat, Inc. and/or its affiliates, and individual
 * contributors by the @authors tag. See the copyright.txt in the
 * distribution for a full listing of individual contributors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var PhaseTwo = require('phasetwo-nodejs');
var cors = require('cors');

var app = express();
app.use(bodyParser.json());

// Enable CORS support
app.use(cors());

// Create a session-store to be used by both the express-session
// middleware and the PhaseTwo middleware.
var memoryStore = new session.MemoryStore();

app.use(
  session({
    secret: 'some secret',
    resave: false,
    saveUninitialized: true,
    store: memoryStore,
  }),
);

// Provide the session store to PhaseTwo so that sessions
// can be invalidated from the PhaseTwo console callback.
//
// Additional configuration is read from keycloak.json file
// installed from the Keycloak web console.
var phasetwo = new PhaseTwo({
  store: memoryStore,
  secretOption: 'hello',
});

app.use(
  phasetwo.middleware({
    logout: '/logout',
    admin: '/',
  }),
);

app.get('/service/public', function (req, res) {
  res.json({ message: 'public' });
});

app.get('/service/secured', phasetwo.protect('realm:user'), function (req, res) {
  res.json({ message: 'secured' });
});

app.get('/service/admin', phasetwo.protect('realm:admin'), function (req, res) {
  res.json({ message: 'admin' });
});

/*
 * Makes a request to the PhaseTwo account API to obtain information
 * about the currently authenticated user
 */
app.get('/service/account', phasetwo.checkSso(), async function (req, res) {
  let token = req.headers.authorization;
  const bearer = 'Bearer ';
  if (token && token.substring(0, bearer.length) === bearer) {
    token = token.substring(bearer.length);
  }
  const ret = await phasetwo.accountApi().get(token);

  res.json({ message: ret });
});

app.use('*', function (req, res) {
  res.send('Not found!');
});

const port = 3000;

app.listen(port, function () {
  console.log(`Started at port ${port}`);
});
