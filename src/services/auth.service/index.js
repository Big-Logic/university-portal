// Public surface of the auth service: the operations a controller can
// call, and nothing else. Consumers keep requiring
// '../services/auth.service' -- Node resolves that to this file now
// that the service is a directory. Everything in helpers.js stays
// internal to this directory.
const login = require('./auth.login');
const refresh = require('./auth.refresh');
const logout = require('./auth.logout');
const forgotPassword = require('./auth.forgotPassword');
const resetPassword = require('./auth.resetPassword');

module.exports = { login, refresh, logout, forgotPassword, resetPassword };
