# passport-slack-oauth2

[Passport](https://github.com/jaredhanson/passport) strategy for authenticating
with [Slack](https://slack.com) using the OAuth 2.0 API.

Updated to support Sign in with Slack by default.

[![Sign in with Slack](https://a.slack-edge.com/accd8/img/sign_in_with_slack.png)](https://api.slack.com/docs/sign-in-with-slack#identify_users_and_their_teams)

## Install
```shell
$ npm install passport-slack-oauth2
```

## Sample Profile
```json
{
    "provider": "slack",
    "id": "U123XXXXX",
    "displayName": "John Agan",
    "user": {
        "name": "John Agan",
        "id": "U123XXXXX",
        "email": "johnagan@testing.com",
        "image_24": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=24&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0000-24.png",
        "image_32": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=32&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0000-32.png",
        "image_48": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=48&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0000-48.png",
        "image_72": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0000-72.png",
        "image_192": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=192&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0000-192.png",
        "image_512": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0000-512.png"
        "image_1024": "https://secure.gravatar.com/avatar/123abcd123bc12b3c.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0000-1024.png"
    },
    "team": {
        "id": "T123XXXX",
        "name": "My Awesome Team",
        "domain": "my-awesome-team",
        "image_34": "https://a.slack-edge.com/0000/img/avatars-teams/ava_0000-00.png",
        "image_44": "https://a.slack-edge.com/00a0/img/avatars-teams/ava_0000-00.png",
        "image_68": "https://a.slack-edge.com/00a0/img/avatars-teams/ava_0000-00.png",
        "image_88": "https://a.slack-edge.com/00a0/img/avatars-teams/ava_0000-00.png",
        "image_102": "https://a.slack-edge.com/00a0/img/avatars-teams/ava_0000-000.png",
        "image_132": "https://a.slack-edge.com/00a0/img/avatars-teams/ava_0000-000.png",
        "image_230": "https://a.slack-edge.com/0a0a0/img/avatars-teams/ava_0000-000.png",
        "image_default": true
    }
}
```

## Usage

### Configure Strategy

The Slack authentication strategy authenticates users using a Slack
account and OAuth 2.0 tokens.  The strategy requires a `verify` callback, which
accepts these credentials and calls `done` providing a user, as well as
`options` specifying a client ID, client secret, and callback URL.

```js
passport.use(new SlackStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    skipUserProfile: false, // default
    scope: ['users:read'] // default, bot token scope
    scope: ['identity.basic', 'identity.email', 'identity.avatar', 'identity.team'] // default, user token scope
  },
  (accessToken, refreshToken, profile, done) => {
    // optionally persist user data into a database
    done(null, profile);
  }
));
```

In order to access multiple tokens within the OAuth2 Token Response, provide a verify callback with 5 parameters.

```js
passport.use(new SlackStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    skipUserProfile: false, // default
    scope: ['users:read'] // bot token scope, default
    scope: ['identity.basic', 'identity.email', 'identity.avatar', 'identity.team'] // user token scope, default
  },
  (accessToken, refreshToken, params, profile, done) => { // 5 parameters
    // optionally persist user data into a database
    done(null, profile);
  }
));
```

## Sample Parsed Token Responses

### User & Bot
```json
{
    "id": "U123XXXXX",
    "scope": "user-scope-1,user-scope-2",
    "token_type": "user",
    "access_token": "user-access-token",
    "refresh_token": "user-refresh-token",
    "authed_user": {
        "id": "U123XXXXX",
        "scope": "user-scope-1,user-scope-2",
        "access_token": "user-access-token",
        "token_type": "user"
    },
    "authed_bot": {
        "id": "U987XXXXX",
        "scope": "bot-scope-1,bot-scope-2",
        "token_type": "bot",
        "access_token": "bot-access-token",
        "refresh_token": "bot-refresh-token"
    }
}
```

### User only
```json
{
    "id": "U123XXXXX",
    "scope": "user-scope-1,user-scope-2",
    "token_type": "user",
    "access_token": "user-access-token",
    "refresh_token": "user-refresh-token",
    "authed_user": {
        "id": "U123XXXXX",
        "scope": "user-scope-1,user-scope-2",
        "access_token": "user-access-token",
        "token_type": "user"
    },
    "authed_bot": {
    }
}
```

### Bot only
```json
{
    "id": "U987XXXXX",
    "scope": "bot-scope-1,bot-scope-2",
    "token_type": "bot",
    "access_token": "bot-access-token",
    "refresh_token": "bot-refresh-token",
    "authed_user": {
        "id": "U123XXXXX",
    },
    "authed_bot": {
        "id": "U987XXXXX",
        "scope": "bot-scope-1,bot-scope-2",
        "token_type": "bot",
        "access_token": "bot-access-token",
        "refresh_token": "bot-refresh-token",
    }
}
```

### Authenticate Requests

Use `passport.authenticate()` (or `passport.authorize()` if you want to authenticate with Slack and **NOT** affect `req.user` and user session), specifying the `'slack'` strategy, to
authenticate requests.

For example, as route middleware in an [Express](http://expressjs.com/)
application:

```js
app.get('/auth/slack', passport.authorize('slack'));

app.get('/auth/slack/callback',
  passport.authenticate('slack', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/') // Successful authentication, redirect home.
);
```

### Custom User Scopes
By default passport-slack strategy will try to retrieve [all user identity](https://api.slack.com/methods/users.identity) from Slack using the default scopes of `identity.basic`, `identity.email`, `identity.avatar`, and `identity.team`. To override these, set the `user_scope` parameter to an array of [user scopes](https://api.slack.com/scopes?filter=user).

```js
passport.use(new SlackStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  scope: [],                      // no (bot) 'scope' defined, no bot tokens issued
  user_scope: [
    "identity.basic",
    "channels:read",
    "chat:write:user"
  ]
}, () => { });
```

### Custom Bot Scopes
By default passport-slack strategy will try to retrieve [bot info](https://api.slack.com/methods/users.info) from Slack using the default scopes of `users:read`. To override these, set the `scope` parameter to an array of [bot scopes](https://api.slack.com/scopes?filter=granular_bot).

```js
passport.use(new SlackStrategy({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  scope: [
    "users:read"
  ],
  user_scope: []                  // no 'user_scope' defined, no user tokens issued
}, () => { });
```

### Ignore Profile Info
If you just need an access token and not user profile data, you can avoid getting profile info by setting `skipUserProfile` to true.
```js
passport.use(new SlackStrategy({
	clientID: CLIENT_ID,
	clientSecret: CLIENT_SECRET,
	scope: ['incoming-webhook'],
	user_scope: ['incoming-webhook'],
	skipUserProfile: true
}, () => { });
```

## License

[The MIT License](http://opensource.org/licenses/MIT)