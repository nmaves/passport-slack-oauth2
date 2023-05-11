const { expect } = require('chai');

const Strategy = require('../lib').Strategy;

describe('handleOAuthAccessTokenReponse', function () {
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
    accessToken = null;
    refreshToken = null;
    params = { /* define me in test */ };
  });

  context('on exception', function () {
    beforeEach(function(done) {
      strategy = new Strategy(options, () => {});

      strategy.handleOAuthAccessTokenResponse('at', 'rt', function () { /* force an error */}, function (err) {
        actual.error = err;
        done();
      });
    });

    it('passes an error into the callback on exception', function () {
      expect(actual.error).to.exist;
    });
  });

  context('pass thru params', function () {
    let property, value;
    beforeEach(function(done) {
      strategy = new Strategy(options, () => {});

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

      strategy.handleOAuthAccessTokenResponse(accessToken, refreshToken, params, function (err, _accessToken, _refreshToken, _params) {
        actual.error = err;
        actual.accessToken = _accessToken;
        actual.refreshToken = _refreshToken;
        actual.params = _params;
        done();
      });
    });

    context('root object', function () {
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
  });

  context('user auth', function () {
    beforeEach(function(done) {
      strategy = new Strategy(options, () => {});

      params = {
        authed_user: {
          id: 'user-id',
          scope: 'user-scope-1,user-scope-2',
          access_token: 'user-access-token',
          token_type: 'user'
        }
      };

      strategy.handleOAuthAccessTokenResponse(accessToken, refreshToken, params, function (err, _accessToken, _refreshToken, _params) {
        actual.error = err;
        actual.accessToken = _accessToken;
        actual.refresToken = _refreshToken;
        actual.params = _params;
        done();
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
        expect(actual.refreshToken).to.not.exist;
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
        expect(actual.params.refresh_token).to.not.exist;
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
        expect(actual.params.authed_user.refresh_token).to.not.exist;
      });
    });

    context('authed_bot', function () {
      it('sets an empty object for authed_bot', function () {
        expect(actual.params.authed_bot).to.be.an('object').that.is.empty;
      });
    });
  });

  context('user and bot auth', function (done) {
    beforeEach(function(done) {
      strategy = new Strategy(options, () => {});

      params = {
        authed_user: {
          id: 'user-id',
          scope: 'user-scope-1,user-scope-2',
          access_token: 'user-access-token',
          token_type: 'user'
        },
        bot_user_id: 'bot-user-id',
        scope: 'bot-scope-1,bot-scope-2',
        access_token: 'bot-token',
        token_type: 'bot',
      };

      accessToken = 'bot-token';

      strategy.handleOAuthAccessTokenResponse(accessToken, refreshToken, params, function (err, _accessToken, _refreshToken, _params) {
        actual.error = err;
        actual.accessToken = _accessToken;
        actual.refresToken = _refreshToken;
        actual.params = _params;
        done();
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
        expect(actual.refreshToken).to.not.exist;
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
        expect(actual.params.refresh_token).to.not.exist;
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
        expect(actual.params.authed_user.refresh_token).to.not.exist;
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
        expect(actual.params.authed_bot.access_token).to.eql('bot-token');
      });

      it('sets the bot refresh_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.refresh_token).to.not.exist;
      });
    });
  });

  context('bot auth', function () {
    beforeEach(function(done) {
      strategy = new Strategy(options, () => {});

      params = {
        authed_user: { id: 'user-id' },
        bot_user_id: 'bot-user-id',
        scope: 'bot-scope-1,bot-scope-2',
        access_token: 'bot-token',
        token_type: 'bot',
      };

      accessToken = 'bot-token';

      strategy.handleOAuthAccessTokenResponse(accessToken, refreshToken, params, function (err, _accessToken, _refreshToken, _params) {
        actual.error = err;
        actual.accessToken = _accessToken;
        actual.refresToken = _refreshToken;
        actual.params = _params;
        done();
      });
    });

    context('error', function () {
      it('does not return an error', function () {
        expect(actual.error).to.be.null;
      });
    });

    context('tokens', function () {
      it('returns the correct accessToken', function () {
        expect(actual.accessToken).to.eql('bot-token');
      });

      it('returns the correct refreshToken', function () {
        expect(actual.refreshToken).to.not.exist;
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
        expect(actual.params.access_token).to.eql('bot-token');
      });

      it('sets the bot refresh_token as a root property', function () {
        expect(actual.params.refresh_token).to.not.exist;
      });
    });

    context('authed_user', function () {
      it('sets the user id on the authed_user property', function () {
        expect(actual.params.authed_user.id).to.eql('user-id');
      });

      it('does not set any other properties on the authed_user object', function () {
        expect(Object.keys(actual.params.authed_user)).to.eql(['id']);
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
        expect(actual.params.authed_bot.access_token).to.eql('bot-token');
      });

      it('sets the bot refresh_token on the authed_bot property', function () {
        expect(actual.params.authed_bot.refresh_token).to.not.exist;
      });
    });
  });
});
