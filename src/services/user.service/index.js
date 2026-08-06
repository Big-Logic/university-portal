// Public surface of the user service: the operations a controller can
// call, and nothing else. Consumers keep requiring
// '../services/user.service' -- Node resolves that to this file now
// that the service is a directory.
const changeOwnPassword = require('./user.changeOwnPassword');
const createUser = require('./user.createUser');
const getUserById = require('./user.getUserById');
const listUsers = require('./user.listUsers');
const resetUserPassword = require('./user.resetUserPassword');
const setUserActive = require('./user.setUserActive');
const updateUser = require('./user.updateUser');
const updateUserRole = require('./user.updateUserRole');

module.exports = {
  changeOwnPassword,
  createUser,
  getUserById,
  listUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
  updateUserRole,
};
