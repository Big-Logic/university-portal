const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

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

module.exports = { updateRole };
