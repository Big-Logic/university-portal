const programService = require('../services/program.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest('Invalid program id');
  return id;
}

const list = asyncHandler(async (req, res) => {
  const programs = await programService.listPrograms();
  res.json(programs);
});

const getOne = asyncHandler(async (req, res) => {
  const program = await programService.getProgramById(parseId(req));
  res.json(program);
});

const create = asyncHandler(async (req, res) => {
  const program = await programService.createProgram(req.body);
  res.status(201).json(program);
});

const update = asyncHandler(async (req, res) => {
  const program = await programService.updateProgram(parseId(req), req.body);
  res.json(program);
});

module.exports = { list, getOne, create, update };
