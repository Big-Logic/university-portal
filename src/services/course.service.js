const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');

async function listCourses({ programId } = {}) {
  return prisma.courses.findMany({
    where: programId ? { program_id: programId } : undefined,
    orderBy: { code: 'asc' },
    include: { programs: true },
  });
}

async function getCourseById(id) {
  const course = await prisma.courses.findUnique({
    where: { id },
    include: { programs: true },
  });
  if (!course) {
    throw ApiError.notFound('Course not found');
  }
  return course;
}

async function createCourse({ code, title, credit_hours, program_id }) {
  return prisma.courses.create({
    data: {
      code,
      title,
      credit_hours: credit_hours ?? undefined, // let the DB default (3) apply if omitted
      program_id: program_id ?? null,
    },
  });
}

async function updateCourse(id, changes) {
  await getCourseById(id); // clean 404 instead of Prisma's P2025 bubbling up
  return prisma.courses.update({ where: { id }, data: changes });
}

module.exports = { listCourses, getCourseById, createCourse, updateCourse };
