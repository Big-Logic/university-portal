const courseOfferingService = require('../services/courseOffering.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

function parseId(paramValue, label) {
  const id = parseInt(paramValue, 10);
  if (Number.isNaN(id)) throw ApiError.badRequest(`Invalid ${label}`);
  return id;
}

function parseOptionalIntQuery(value, label) {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) throw ApiError.badRequest(`Invalid ${label} query parameter`);
  return parsed;
}

const list = asyncHandler(async (req, res) => {
  const courseId = parseOptionalIntQuery(req.query.course_id, 'course_id');
  const termId = parseOptionalIntQuery(req.query.term_id, 'term_id');
  // Doubles as the "faculty's assigned offerings" story from the
  // backlog: a faculty member calls GET /course-offerings?instructor_id=<their own id>
  // rather than needing a separate dedicated endpoint.
  const instructorId = parseOptionalIntQuery(req.query.instructor_id, 'instructor_id');

  const offerings = await courseOfferingService.listCourseOfferings({
    courseId,
    termId,
    instructorId,
  });
  res.json(offerings);
});

const getOne = asyncHandler(async (req, res) => {
  const offering = await courseOfferingService.getCourseOfferingById(
    parseId(req.params.id, 'course offering id')
  );
  res.json(offering);
});

const create = asyncHandler(async (req, res) => {
  const offering = await courseOfferingService.createCourseOffering(req.body);
  res.status(201).json(offering);
});

const update = asyncHandler(async (req, res) => {
  const offering = await courseOfferingService.updateCourseOffering(
    parseId(req.params.id, 'course offering id'),
    req.body
  );
  res.json(offering);
});

const addMeetingTime = asyncHandler(async (req, res) => {
  const offeringId = parseId(req.params.id, 'course offering id');
  const meetingTime = await courseOfferingService.addMeetingTime(offeringId, req.body);
  res.status(201).json(meetingTime);
});

const listMeetingTimes = asyncHandler(async (req, res) => {
  const offeringId = parseId(req.params.id, 'course offering id');
  const meetingTimes = await courseOfferingService.listMeetingTimes(offeringId);
  res.json(meetingTimes);
});

module.exports = { list, getOne, create, update, addMeetingTime, listMeetingTimes };
