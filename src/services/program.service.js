const prisma = require('../db/prisma');
const ApiError = require('../utils/ApiError');

async function listPrograms() {
  return prisma.programs.findMany({ orderBy: { code: 'asc' } });
}

async function getProgramById(id) {
  const program = await prisma.programs.findUnique({ where: { id } });
  if (!program) {
    throw ApiError.notFound('Program not found');
  }
  return program;
}

async function createProgram({ name, code, department }) {
  return prisma.programs.create({
    data: { name, code, department: department || null },
  });
}

async function updateProgram(id, changes) {
  // Confirm it exists first so a bad id gets a clean 404 instead of
  // Prisma's P2025 bubbling up as a generic error.
  await getProgramById(id);
  return prisma.programs.update({ where: { id }, data: changes });
}

module.exports = { listPrograms, getProgramById, createProgram, updateProgram };
