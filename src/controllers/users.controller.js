const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { toProfileData } = require('../utils/userProfile');

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest('Invalid user id');
  return id;
}

// The authenticated user's own account -- id comes from the token, so
// there's no path param to parse and no way to ask for someone else's.
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.user.id);
  res.status(200).json(user);
});

// Paginated, filterable list. req.validatedQuery is set by
// validateQuery -- Express 5 won't let the middleware replace
// req.query itself, so reading req.query here would get raw strings.
const list = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.validatedQuery);
  res.status(200).json(result);
});

// Any user by id. Same service call (and so the same response shape)
// as getMe -- only where the id comes from differs.
const getOne = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(parseId(req));
  res.status(200).json(user);
});

const create = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const result = await userService.createUser({
    email,
    profile: toProfileData(req.body),
    roleName: role,
  });
  res.status(201).json(result);
});

// Self-service: the id comes from the token, so a caller can only ever
// edit their own profile here.
const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user.id, toProfileData(req.body));
  res.status(200).json(user);
});

// Admin editing someone else's profile.
const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(parseId(req), toProfileData(req.body));
  res.status(200).json(user);
});

// Self-service password change. Verifies the current password, then
// ends every session -- including this one.
const changeMyPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await userService.changeOwnPassword(req.user.id, {
    currentPassword,
    newPassword,
  });
  res.status(200).json(result);
});

// Admin resetting someone else's password. No body: the new password
// is generated server-side and returned here so the admin can relay it
// if the email doesn't arrive.
const resetPassword = asyncHandler(async (req, res) => {
  const result = await userService.resetUserPassword(parseId(req));
  res.status(200).json(result);
});

const deactivate = asyncHandler(async (req, res) => {
  const result = await userService.setUserActive(parseId(req), false);
  res.status(200).json(result);
});

const reactivate = asyncHandler(async (req, res) => {
  const result = await userService.setUserActive(parseId(req), true);
  res.status(200).json(result);
});

const updateRole = asyncHandler(async (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetUserId)) {
    throw ApiError.badRequest('Invalid user id');
  }

  const { role } = req.body;
  const result = await userService.updateUserRole({
    targetUserId,
    newRoleName: role,
    changedByUserId: req.user.id,
  });

  res.status(200).json(result);
});

module.exports = {
  getMe,
  list,
  getOne,
  create,
  updateMe,
  update,
  changeMyPassword,
  resetPassword,
  deactivate,
  reactivate,
  updateRole,
};
