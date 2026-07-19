const studentService = require('../services/student.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function parseId(req) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest('Invalid student id');
  return id;
}

function parseOptionalIntQuery(value, label) {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) throw ApiError.badRequest(`Invalid ${label} query parameter`);
  return parsed;
}

const create = asyncHandler(async (req, res) => {
  const { email, full_name, program_id, admission_term_id } = req.body;
  const result = await studentService.createStudent({
    email,
    fullName: full_name,
    programId: program_id,
    admissionTermId: admission_term_id,
  });
  res.status(201).json(result);
});

const list = asyncHandler(async (req, res) => {
  const programId = parseOptionalIntQuery(req.query.program_id, 'program_id');
  const status = req.query.status;
  const students = await studentService.listStudents({ programId, status });
  res.json(students);
});

const getMe = asyncHandler(async (req, res) => {
  const student = await studentService.getOwnStudentProfile(req.user.id);
  res.json(student);
});

const getOne = asyncHandler(async (req, res) => {
  const student = await studentService.getStudentById(parseId(req));
  res.json(student);
});

const update = asyncHandler(async (req, res) => {
  const student = await studentService.updateStudent(parseId(req), req.body);
  res.json(student);
});

// const remove = asyncHandler(async (req, res) => {
//   await studentService.deleteStudent(parseId(req));
//   res.status(204).send();
// });

module.exports = { create, list, getMe, getOne, update };
