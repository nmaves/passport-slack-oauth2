const { expect } = require('chai');

const Strategy = require('../lib').Strategy;

describe('monkey patch oauth2.getOAuthAccessToken', function () {
  var options = {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    callbackUrl: '/cb',
  };

  it('copies oauth2.getOAuthAccessToken to oauth._getOAuthAccessToken', function () {
    var strategy = new Strategy(options, () => {});
    expect(strategy._oauth2._getOAuthAccessToken).to.exist;
  });
})

describe('getOAuthAccessTokenAndHandleResponse', function () {
  var options = {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    callbackUrl: '/cb',
  };

  var strategy
    , accessToken
    , refreshToken
    , params
    , actual;

  beforeEach(function() {
    actual = {};
    strategy = null;
    accessToken = 'at';
    refreshToken = 'rt';
    params = { /* define me in test */ };
  });

  context('on failure', function () {
    it('surfaces errors from oauth2._getOAuthAccessToken', function (done) {
      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) { cb(new Error('sww')) }

      strategy.getOAuthAccessTokenAndHandleResponse(null, {}, function (err) {
        expect(err).to.exist;
        done();
      });
    });

    it('surfaces errors from OAuth2 Token Response parsing', function (done) {
      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
        cb(null, 'not', 'a', 'good response')
      }

      strategy.getOAuthAccessTokenAndHandleResponse(null, {}, function (err) {
        expect(err).to.exist;
        done();
      });
    });
  })

  context('shared', function () {
    let property, value;
    beforeEach(function(done) {
      accessToken = 'at';
      refreshToken = 'rt';

      params = {
        ok: true,
        app_id: 'app-id',
        authed_user: { id: 'user-id' },
        team: { id: 'team-id', name: 'team-name' },
        enterprise: null,
        is_enterprise_install: false
      };

      property = Date.now();
      value = Date.now();
      params[property] = value;

      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
        cb(null, accessToken, refreshToken, params)
      }

      strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err, at, rt, p) {
        actual.error = err;
        actual.accessToken = at;
        actual.refreshToken = rt;
        actual.params = p;

        done(err);
      });
    });

    context('params', function () {
      it('passes through the ok property', function () {
        expect(actual.params.ok).to.be.true;
      });

      it('passes through the app_id property', function () {
        expect(actual.params.app_id).to.eql('app-id');
      });

      it('passes through the enterprise property', function () {
        expect(actual.params.enterprise).to.be.null;
      });

      it('passes through the is_enterprise_install property', function () {
        expect(actual.params.is_enterprise_install).to.be.false;
      });

      it('passes through a random property', function () {
        expect(actual.params[property]).to.eql(value);
      });

      context('team property', function () {
        it('passes through the team property', function () {
          expect(actual.params.team).to.be.an('object');
        });

        it('passes through the team id property', function () {
          expect(actual.params.team.id).to.eql('team-id');
        });

        it('passes through the team name property', function () {
          expect(actual.params.team.name).to.eql('team-name');
        });
      });
    });

    context('this.profileUrl', function () {
      context('skipUserProfile == true', function () {
        before(function () {
          options.skipUserProfile = true;
        });

        after(function() {
          delete options.skipUserProfile;
        });

        it('does not change the profileUrl', function (done) {
          strategy = new Strategy(options, () => {});
          strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
            cb(null, accessToken, refreshToken, params)
          }

          accessToken = 'bot-access-token';
          refreshToken = 'bot-refresh-token';

          params = {
            authed_user: { id: 'user-id' },
            bot_user_id: 'bot-user-id',
            scope: 'bot-scope-1,bot-scope-2',
            access_token: 'bot-token',
            token_type: 'bot',
          };

          accessToken = 'bot-token';

          const expectedProfileUrl = strategy.profileUrl;

          strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err) {
            expect(strategy.profileUrl).to.eql(expectedProfileUrl);
            done(err);
          });
        });
      });

      context('custom profileUrl', function () {
        before(function () {
          options.profileUrl = '/custom'
        });

        after(function() {
          delete options.profileUrl;
        });

        it('does not change the profileUrl', function (done) {
          strategy = new Strategy(options, () => {});
          strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
            cb(null, accessToken, refreshToken, params)
          }

          accessToken = 'bot-access-token';
          refreshToken = 'bot-refresh-token';

          params = {
            authed_user: { id: 'user-id' },
            bot_user_id: 'bot-user-id',
            scope: 'bot-scope-1,bot-scope-2',
            access_token: 'bot-token',
            token_type: 'bot',
          };

          accessToken = 'bot-token';

          strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err) {
            expect(strategy.profileUrl).to.eql('/custom');
            done(err);
          });
        });
      });
    });
  });

  context('user auth', function () {
    beforeEach(function(done) {
      accessToken = undefined
      refreshToken = undefined

      params = {
        authed_user: {
          id: 'user-id',
          scope: 'user-scope-1,user-scope-2',
          token_type: 'user',
          access_token: 'user-access-token',
          refresh_token: 'user-refresh-token',
          expires_in: (Math.floor(Math.random() * 39600) + 3600)
        }
      };

      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
        cb(null, accessToken, refreshToken, params)
      }

      expect(strategy.profileUrl).to.not.exist;

      strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err, at, rt, p) {
        actual.error = err;
        actual.accessToken = at;
        actual.refreshToken = rt;
        actual.params = p;

        done(err);
      });
    });

    context('this.profileUrl', function () {
      context('skipUserProfile == false && _hasCustomProfileUrl == false', function () {
        it('sets the profileUrl to users.identity', function () {
          expect(strategy.profileUrl).to.eql('https://slack.com/api/users.identity');
        });
      });
    });

    context('error', function () {
      it('does not return an error', function () {
        expect(actual.error).to.be.null;
      });
    });

    context('tokens', function () {
      it('returns the correct accessToken', function () {
        expect(actual.accessToken).to.eql('user-access-token');
      });

      it('returns the correct refreshToken', function () {
        expect(actual.refreshToken).to.eql('user-refresh-token')
      });
    });

    context('root object', function () {
      it('sets the user id as a root property', function () {
        expect(actual.params.id).to.eql('user-id');
      });

      it('sets the user scope as a root property', function () {
        expect(actual.params.scope).to.eql('user-scope-1,user-scope-2');
      });

      it('sets the user tokentype as a root property', function () {
        expect(actual.params.token_type).to.eql('user');
      });

      it('sets the user access_token as a root property', function () {
        expect(actual.params.access_token).to.eql('user-access-token');
      });

      it('sets the user refresh_token as a root property', function () {
        expect(actual.params.refresh_token).to.eql('user-refresh-token')
      });

      it("sets the user's access_token expires_in as a root property", function () {
        expect(actual.params.expires_in).to.eql(params.authed_user.expires_in)
      });
    });

    context('authed_user', function () {
      it('sets the user id on the authed_user property', function () {
        expect(actual.params.authed_user.id).to.eql('user-id');
      });

      it('sets the user scope on the authed_user property', function () {
        expect(actual.params.authed_user.scope).to.eql('user-scope-1,user-scope-2');
      });

      it('sets the user tokentype on the authed_user property', function () {
        expect(actual.params.authed_user.token_type).to.eql('user');
      });

      it('sets the user access_token on the authed_user property', function () {
        expect(actual.params.authed_user.access_token).to.eql('user-access-token');
      });

      it('sets the user refresh_token on the authed_user property', function () {
        expect(actual.params.authed_user.refresh_token).to.eql('user-refresh-token')
      });

      it("sets the user's access_token's expires_in on the authed_user property", function () {
        expect(actual.params.authed_user.expires_in).to.eql(params.authed_user.expires_in)
      });
    });

    context('authed_bot', function () {
      it('sets an empty object for authed_bot', function () {
        expect(actual.params.authed_bot).to.be.an('object').that.is.empty;
      });
    });
  });

  context('bot auth', function () {
    beforeEach(function(done) {
      accessToken = 'bot-access-token';
      refreshToken = 'bot-refresh-token';

      params = {
        authed_user: { id: 'user-id' },
        bot_user_id: 'bot-user-id',
        scope: 'bot-scope-1,bot-scope-2',
        access_token: 'bot-access-token',
        expires_in: (Math.floor(Math.random() * 39600) + 3600),
        token_type: 'bot',
      };

      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
        cb(null, accessToken, refreshToken, params)
      }

      expect(strategy.profileUrl).to.not.exist;

      strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err, at, rt, p) {
        actual.error = err;
        actual.accessToken = at;
        actual.refreshToken = rt;
        actual.params = p;

        done(err);
      });
    });

    context('this.profileUrl', function () {
      context('skipUserProfile == false && _hasCustomProfileUrl == false', function () {
        it('sets the profileUrl to users.info', function () {
          expect(strategy.profileUrl).to.eql('https://slack.com/api/users.info?user=bot-user-id');
        });
      });
    });

    context('error', function () {
      it('does not return an error', function () {
        expect(actual.error).to.be.null;
      });
    });

    context('tokens', function () {
      it('returns the correct accessToken', function () {
        expect(actual.accessToken).to.eql('bot-access-token');
      });

      it('returns the correct refreshToken', function () {
        expect(actual.refreshToken).to.eql('bot-refresh-token');
      });
    });

    context('root object', function () {
      it('sets the bot id as a root property', function () {
        expect(actual.params.id).to.eql('bot-user-id');
      });

      it('sets the bot scope as a root property', function () {
        expect(actual.params.scope).to.eql('bot-scope-1,bot-scope-2');
      });

      it('sets the bot tokentype as a root property', function () {
        expect(actual.params.token_type).to.eql('bot');
      });

      it('sets the bot access_token as a root property', function () {
        expect(actual.params.access_token).to.eql('bot-access-token');
      });

      it('sets the bot refresh_token as a root property', function () {
        expect(actual.params.refresh_token).to.eql('bot-refresh-token')
      });

      it("sets the bot' access_token's expires_in as a root property", function () {
        expect(actual.params.expires_in).to.eql(params.expires_in)
      });
    });

    context('authed_user', function () {
      it('sets the user id on the authed_user property', function () {
        expect(actual.params.authed_user.id).to.eql('user-id');
      });

      it('does not set any other properties on the authed_user object', function () {
        expect(actual.params.authed_user).to.have.keys('id');
      });
    });

    context('authed_bot', function () {
      it('sets the bot id on the authed_bot property', function () {
        expect(actual.params.authed_bot.id).to.eql('bot-user-id');
      });

      it('sets the bot scope on the authed_bot property', function () {
        expect(actual.params.authed_bot.scope).to.eql('bot-scope-1,bot-scope-2');
      });

      it('sets the bot tokentype on the authed_bot property', function () {
        expect(actual.params.authed_bot.token_type).to.eql('bot');
      });

      it('sets the bot access_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.access_token).to.eql('bot-access-token');
      });

      it('sets the bot refresh_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.refresh_token).to.eql('bot-refresh-token')
      });

      it("sets the bot's access_token's expires_in on the authed_bot property", function () {
        expect(actual.params.authed_bot.expires_in).to.eql(params.expires_in)
      });
    });
  });

  context('user and bot auth', function (done) {
    beforeEach(function(done) {

      accessToken = 'bot-access-token';
      refreshToken = 'bot-refresh-token';

      params = {
        authed_user: {
          id: 'user-id',
          scope: 'user-scope-1,user-scope-2',
          access_token: 'user-access-token',
          refresh_token: 'user-refresh-token',
          token_type: 'user',
          expires_in: (Math.floor(Math.random() * 39600) + 3600),
        },
        bot_user_id: 'bot-user-id',
        scope: 'bot-scope-1,bot-scope-2',
        access_token: 'bot-access-token',
        expires_in: (Math.floor(Math.random() * 39600) + 3600),
        token_type: 'bot',
      };

      strategy = new Strategy(options, () => {});
      strategy._oauth2._getOAuthAccessToken = function (a, b, cb) {
        cb(null, accessToken, refreshToken, params)
      }

      expect(strategy.profileUrl).to.not.exist;

      strategy.getOAuthAccessTokenAndHandleResponse('', {}, function (err, at, rt, p) {
        actual.error = err;
        actual.accessToken = at;
        actual.refreshToken = rt;
        actual.params = p;

        done(err);
      });
    });

    context('this.profileUrl', function () {
      context('skipUserProfile == false && _hasCustomProfileUrl == false', function () {
        it('sets the profileUrl to users.identity', function () {
          expect(strategy.profileUrl).to.eql('https://slack.com/api/users.identity');
        });
      });
    });

    context('error', function () {
      it('does not return an error', function () {
        expect(actual.error).to.be.null;
      });
    });

    context('tokens', function () {
      it('returns the correct accessToken', function () {
        expect(actual.accessToken).to.eql('user-access-token');
      });

      it('returns the correct refreshToken', function () {
        expect(actual.refreshToken).to.eql('user-refresh-token')
      });
    });

    context('root object', function () {
      it('sets the user id as a root property', function () {
        expect(actual.params.id).to.eql('user-id');
      });

      it('sets the user scope as a root property', function () {
        expect(actual.params.scope).to.eql('user-scope-1,user-scope-2');
      });

      it('sets the user tokentype as a root property', function () {
        expect(actual.params.token_type).to.eql('user');
      });

      it('sets the user access_token as a root property', function () {
        expect(actual.params.access_token).to.eql('user-access-token');
      });

      it('sets the user refresh_token as a root property', function () {
        expect(actual.params.refresh_token).to.eql('user-refresh-token')
      });

      it("sets the user's access_token expires_in as a root property", function () {
        expect(actual.params.expires_in).to.eql(params.authed_user.expires_in)
      });
    });

    context('authed_user', function () {
      it('sets the user id on the authed_user property', function () {
        expect(actual.params.authed_user.id).to.eql('user-id');
      });

      it('sets the user scope on the authed_user property', function () {
        expect(actual.params.authed_user.scope).to.eql('user-scope-1,user-scope-2');
      });

      it('sets the user tokentype on the authed_user property', function () {
        expect(actual.params.authed_user.token_type).to.eql('user');
      });

      it('sets the user access_token on the authed_user property', function () {
        expect(actual.params.authed_user.access_token).to.eql('user-access-token');
      });

      it('sets the user refresh_token on the authed_user property', function () {
        expect(actual.params.authed_user.refresh_token).to.eql('user-refresh-token')
      });

      it("sets the user's access_token expires_in as an authed_user property", function () {
        expect(actual.params.authed_user.expires_in).to.eql(params.authed_user.expires_in)
      });
    });

    context('authed_bot', function () {
      it('sets the bot id on the authed_bot property', function () {
        expect(actual.params.authed_bot.id).to.eql('bot-user-id');
      });

      it('sets the bot scope on the authed_bot property', function () {
        expect(actual.params.authed_bot.scope).to.eql('bot-scope-1,bot-scope-2');
      });

      it('sets the bot tokentype on the authed_bot property', function () {
        expect(actual.params.authed_bot.token_type).to.eql('bot');
      });

      it('sets the bot access_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.access_token).to.eql('bot-access-token');
      });

      it('sets the bot refresh_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.refresh_token).to.eql('bot-refresh-token')
      });

      it("sets the bot's access_token's exipres_in on the authed_bot property", function () {
        expect(actual.params.authed_bot.expires_in).to.eql(params.expires_in)
      });
    });
  });
});
