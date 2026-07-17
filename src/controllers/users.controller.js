const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest('Invalid user id');
  return id;
}

const create = asyncHandler(async (req, res) => {
  const { email, full_name, role } = req.body;
  const result = await userService.createUser({ email, fullName: full_name, roleName: role });
  res.status(201).json(result);
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

module.exports = { create, deactivate, reactivate, updateRole };
