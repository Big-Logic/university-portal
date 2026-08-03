const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');

const OFFERING_INCLUDE = {
  courses: true,
  terms: true,
  users: {
    select: { id: true, email: true, first_name: true, middle_name: true, last_name: true },
  },
  rooms: true,
  meeting_times: true,
};

// Postgres TIME columns are modeled as full DateTime by Prisma. To
// avoid the result depending on the server's local timezone, always
// construct these explicitly in UTC (the "Z" suffix) rather than
// letting JS interpret a bare date-time string as local time.
function toTimeValue(hhmm) {
  const withSeconds = hhmm.length === 5 ? `${hhmm}:00` : hhmm;
  return new Date(`1970-01-01T${withSeconds}Z`);
}

// ...and convert back to a plain "HH:MM" string for API responses,
// rather than leaking the "1970-01-01T10:00:00.000Z" internal
// representation to clients.
function formatMeetingTime(mt) {
  return {
    ...mt,
    start_time: mt.start_time.toISOString().slice(11, 16),
    end_time: mt.end_time.toISOString().slice(11, 16),
  };
}

function formatOffering(offering) {
  if (!offering.meeting_times) return offering;
  return { ...offering, meeting_times: offering.meeting_times.map(formatMeetingTime) };
}

async function listCourseOfferings({ courseId, termId, instructorId } = {}) {
  const offerings = await prisma.course_offerings.findMany({
    where: {
      course_id: courseId,
      term_id: termId,
      instructor_id: instructorId,
    },
    include: OFFERING_INCLUDE,
    orderBy: [{ term_id: 'desc' }, { section: 'asc' }],
  });
  return offerings.map(formatOffering);
}

async function getCourseOfferingById(id) {
  const offering = await prisma.course_offerings.findUnique({
    where: { id },
    include: OFFERING_INCLUDE,
  });
  if (!offering) {
    throw ApiError.notFound('Course offering not found');
  }
  return formatOffering(offering);
}

async function createCourseOffering(data) {
  const offering = await prisma.course_offerings.create({
    data: {
      course_id: data.course_id,
      term_id: data.term_id,
      instructor_id: data.instructor_id,
      section: data.section,
      delivery_mode: data.delivery_mode,
      room_id: data.room_id ?? null,
      capacity: data.capacity,
    },
    include: OFFERING_INCLUDE,
  });
  return formatOffering(offering);
}

async function updateCourseOffering(id, changes) {
  await getCourseOfferingById(id); // clean 404 instead of Prisma's P2025 bubbling up
  const offering = await prisma.course_offerings.update({
    where: { id },
    data: changes,
    include: OFFERING_INCLUDE,
  });
  return formatOffering(offering);
}

async function addMeetingTime(offeringId, { day_of_week, start_time, end_time }) {
  await getCourseOfferingById(offeringId); // 404 if the offering doesn't exist

  // Deliberately NOT setting room_id/instructor_id here -- the
  // trg_sync_meeting_time_fields trigger populates both from the
  // parent course_offerings row. Setting them here would just be
  // overwritten (or worse, drift out of sync with the offering).
  const mt = await prisma.meeting_times.create({
    data: {
      course_offering_id: offeringId,
      day_of_week,
      start_time: toTimeValue(start_time),
      end_time: toTimeValue(end_time),
    },
  });
  return formatMeetingTime(mt);
}

async function listMeetingTimes(offeringId) {
  await getCourseOfferingById(offeringId);
  const rows = await prisma.meeting_times.findMany({
    where: { course_offering_id: offeringId },
    orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
  });
  return rows.map(formatMeetingTime);
}

module.exports = {
  listCourseOfferings,
  getCourseOfferingById,
  createCourseOffering,
  updateCourseOffering,
  addMeetingTime,
  listMeetingTimes,
};
