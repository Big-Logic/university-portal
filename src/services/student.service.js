const prisma = require('../db/prisma');
// const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { hashPassword, generateRandomPassword } = require('../utils/password');
// const env = require('../config/env');

// Generous window for a remote DB (Aiven, etc.) -- see user.service.js
// for the full reasoning; same trade-off applies here.
const TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

const STUDENT_INCLUDE = {
  users: { select: { id: true, email: true, full_name: true, is_active: true } },
  programs: true,
  terms: true,
};

function formatStudent(student) {
  return {
    id: student.id,
    studentId: student.student_id,
    status: student.status,
    email: student.users.email,
    fullName: student.users.full_name,
    isActive: student.users.is_active,
    program: student.programs,
    admissionTerm: student.terms,
  };
}

async function createStudent({ email, fullName, programId, admissionTermId }) {
  const role = await prisma.roles.findUnique({ where: { name: 'student' } });

  if (!role) {
    throw ApiError.badRequest('Unknown role: student');
  }

  const generatedPassword = generateRandomPassword();
  const passwordHash = await hashPassword(generatedPassword);

  // user.create and students.create are genuinely dependent (the
  // latter needs the former's id), so this can't be restructured into
  // the array-form $transaction we prefer elsewhere -- an interactive
  // transaction is the right tool, with a generous timeout from the
  // start given what building the role-update endpoint taught us.
  const student = await prisma.$transaction(async (tx) => {
    const user = await tx.users.create({
      data: { email, full_name: fullName, password_hash: passwordHash, role_id: role.id },
    });

    return tx.students.create({
      data: {
        user_id: user.id,
        program_id: programId ?? null,
        admission_term_id: admissionTermId ?? null,
      },
      include: STUDENT_INCLUDE,
    });
  }, TX_OPTIONS);

  return {
    ...formatStudent(student),
    generatedPassword,
  };
}

async function listStudents({ programId, status } = {}) {
  const students = await prisma.students.findMany({
    where: { program_id: programId, status },
    include: STUDENT_INCLUDE,
    orderBy: { created_at: 'desc' },
  });
  return students.map(formatStudent);
}

async function getStudentById(id) {
  const student = await prisma.students.findUnique({ where: { id }, include: STUDENT_INCLUDE });
  if (!student) {
    throw ApiError.notFound('Student not found');
  }
  return formatStudent(student);
}

async function getOwnStudentProfile(userId) {
  const student = await prisma.students.findUnique({
    where: { user_id: userId },
    include: STUDENT_INCLUDE,
  });
  if (!student) {
    throw ApiError.notFound('No student profile for this account');
  }
  return formatStudent(student);
}

async function updateStudent(id, changes) {
  await getStudentById(id); // clean 404 instead of Prisma's P2025
  const student = await prisma.students.update({
    where: { id },
    data: changes,
    include: STUDENT_INCLUDE,
  });
  return formatStudent(student);
}

async function deleteStudent(id) {
  await getStudentById(id); // clean 404 instead of Prisma's P2025
  // Removes the academic profile (and cascades to enrollments via the
  // FK) but deliberately leaves the underlying user account intact --
  // deleting login credentials/audit history is a separate, more
  // destructive decision than removing an academic record. If the
  // account itself needs disabling too, pair this with
  // PATCH /users/:id/deactivate.
  await prisma.students.delete({ where: { id } });
}

module.exports = {
  createStudent,
  listStudents,
  getStudentById,
  getOwnStudentProfile,
  updateStudent,
  deleteStudent,
};
