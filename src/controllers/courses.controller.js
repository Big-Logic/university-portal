const courseService = require('../services/course.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest('Invalid course id');
  return id;
}

const list = asyncHandler(async (req, res) => {
  const programId = req.query.program_id ? parseInt(req.query.program_id, 10) : undefined;
  if (req.query.program_id && Number.isNaN(programId)) {
    throw ApiError.badRequest('Invalid program_id query parameter');
  }
  const courses = await courseService.listCourses({ programId });
  res.json(courses);
});

const getOne = asyncHandler(async (req, res) => {
  const course = await courseService.getCourseById(parseId(req));
  res.json(course);
});

const create = asyncHandler(async (req, res) => {
  const course = await courseService.createCourse(req.body);
  res.status(201).json(course);
});

const update = asyncHandler(async (req, res) => {
  const course = await courseService.updateCourse(parseId(req), req.body);
  res.json(course);
});

module.exports = { list, getOne, create, update };
