/**
 * Module dependencies.
 */
var util = require('util')
  , OAuth2Strategy = require('passport-oauth2').Strategy;

var providerName = 'slack';

/**
 * `Strategy` constructor.
 *
 * The Slack authentication strategy authenticates requests by delegating
 * to Slack using the OAuth 2.0 protocol.
 *
 * Applications must supply a `verify` callback which accepts an `accessToken`,
 * `refreshToken` and service-specific `profile`, and then calls the `done`
 * callback supplying a `user`, which should be set to `false` if the
 * credentials are not valid.  If an exception occured, `err` should be set.
 *
 * Options:
 *   - `clientID`               your Slack application's client id
 *   - `clientSecret`           your Slack application's client secret
 *   - `callbackURL`            URL to which Slack will redirect the user after granting authorization
 *   - `scope`                  array of permission scopes to request bot access
 *                              ['identity.basic', 'identity.email', 'identity.avatar', 'identity.team']
 *                              full set of scopes: https://api.slack.com/docs/oauth-scopes
 *
 * Examples:
 *
 *     passport.use(new SlackStrategy({
 *         clientID: '123-456-789',
 *         clientSecret: 'shhh-its-a-secret'
 *         callbackURL: 'https://www.example.net/auth/slack/callback',
 *         scope: ['identity.basic', 'channels:read', 'chat:write:user', 'client', 'admin']
 *       },
 *       function(accessToken, refreshToken, profile, done) {
 *         User.findOrCreate(..., function (err, user) {
 *           done(err, user);
 *         });
 *       }
 *     ));
 *
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
  options = options || {};
  options.clientID = options.clientID || options.clientId;
  options.tokenURL = options.tokenURL || options.tokenUrl || 'https://slack.com/api/oauth.v2.access';
  options.authorizationURL = options.authorizationURL || options.authorizationUrl || 'https://slack.com/oauth/v2/authorize';

  // bot scope
  options.scope = options.scope || ['users:read'];
  // user scope
  options.user_scope = options.user_scope || ['identity.basic', 'identity.email', 'identity.team', 'identity.avatar'];

  this._team = options.team || options.teamId;

  var defaultProfileUrl = 'https://slack.com/api/users.identity';
  this.profileUrl = options.profileURL || options.profileUrl || defaultProfileUrl;

  //'https://slack.com/api/auth.test'          // info about the owner of a token
  //'https://slack.com/api/users.info'         // info about a user
  //'https://slack.com/api/bots.info?bot=1234' // info about a bot

  OAuth2Strategy.call(this, options, verify);
  this.name = options.name || providerName;

  // warn is not enough scope
  // Details on Slack's identity scope - https://api.slack.com/methods/users.identity
  //if(!this._skipUserProfile && this.profileUrl === defaultProfileUrl && this._scope.indexOf('identity.basic') === -1){
    //console.warn("Scope 'identity.basic' is required to retrieve Slack user profile");
  //}
}

/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);

/**
 * Retrieve user profile from Slack.
 *
 * This function constructs a normalized profile, with the following properties:
 *
 *   - `provider`         always set to `Slack`
 *   - `id`               the user's ID
 *   - `displayName`      the user's full name
 *
 * @param {String} accessToken
 * @param {Function} done
 * @api protected
 */
Strategy.prototype.userProfile = function(accessToken, done) {
  var header = {
    Authorization: 'Bearer ' + accessToken
  };

  this.get(this.profileUrl, header, function (err, body, res) {
    if (err) {
      return done(err);
    } else {
      try {
        var profile = JSON.parse(body);

        if (!profile.ok) {
          done(body);
        } else {
          delete profile.ok;

          profile.provider = providerName;
          profile.id = profile.user.id;
          profile.displayName = profile.user.name;

          done(null, profile);
        }
      } catch(e) {
        done(e);
      }
    }
  });
}

/** The default oauth2 strategy puts the access_token into Authorization: header AND query string
 * which is a violation of the RFC so lets override and not add the header and supply only the token for qs.
 */
Strategy.prototype.get = function(url, header, callback) {
  this._oauth2._request("GET", url, header, "", "", callback );
};

/**
 * Passport's goal is User Authentication.
 * Slack's OAuth2 v2 implementation supports simultaneous bot & user
 * authentication. Slack's OAuth2 v2 token response can return multiple tokens
 * within a single response. OAuth2 does not support issues multiple tokens
 * as a set or array of responses. Therefore, in order for Slack to achieve
 * multiple token responses, the user token response is nested inside of the
 * bot token response.
 * In order to align with Passport's User Authentication Goal, Slack's
 * OAuth2 v2 token response needs to be reformatted to life the user token
 * and nest the bot token. See https://github.com/nmaves/passport-slack-oauth2/issues/9#issuecomment-1544231819
 *
 * @param {String:null} accessToken
 * @param {String:null} refreshToken
 * @param {Object} params
 * @return {Object}
 */
Strategy.prototype.handleOAuthAccessTokenResponse = function (accessToken, refreshToken, params, next) {
  try {

    // deep copy
    var tokenResponse = JSON.parse(JSON.stringify(params));
    delete tokenResponse.bot_user_id;
    tokenResponse.authed_bot = {};

    if (params.token_type === 'bot') {
      // copy bot profile & tokens to authed_bot
      tokenResponse.authed_bot.id = params.bot_user_id;
      tokenResponse.authed_bot.scope = params.scope;
      tokenResponse.authed_bot.token_type = params.token_type;
      tokenResponse.authed_bot.access_token = params.access_token;
      tokenResponse.authed_bot.refresh_token = params.refresh_token;
    }

    if (params.authed_user.token_type === 'user') {
      // copy the authed_user tokens
      accessToken = params.authed_user.access_token;
      refreshToken = params.authed_user.refresh_token;

      // copy the authed_user profile & tokens to root
      tokenResponse.id = params.authed_user.id;
      tokenResponse.scope = params.authed_user.scope;
      tokenResponse.token_type = params.authed_user.token_type;
      tokenResponse.access_token = params.authed_user.access_token;
      tokenResponse.refresh_token = params.authed_user.refresh_token;
    } else {
      // normalize id
      tokenResponse.id = params.bot_user_id;
    }

    next(null, accessToken, refreshToken, tokenResponse);
  } catch (ex) {
    return next(ex);
  }
};



/**
 * Return extra Slack parameters to be included in the authorization
 * request.
 *
 * @param {Object} options
 * @return {Object}
 */
Strategy.prototype.authorizationParams = function (options) {
  var params = {};

  var team = options.team || this._team;
  if (team) {
    params.team = team;
  }

  var user_scope = options.user_scope || this._user_scope;
  if (user_scope) {
    if (Array.isArray(user_scope)) { user_scope = user_scope.join(this._scopeSeparator); }
    params.user_scope = user_scope;
  }

  return params;
};



/**
 * Expose `Strategy`.
 */
module.exports = Strategy;
