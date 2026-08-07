const prisma = require('../db/prisma');
// const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const { hashPassword, generateRandomPassword } = require('../utils/password');
const { USER_PROFILE_SELECT, formatUserProfile } = require('../utils/userProfile');
// const env = require('../config/env');

const TX_OPTIONS = require('../db/txOptions');

const STUDENT_INCLUDE = {
  users: { select: USER_PROFILE_SELECT },
  programs: true,
  terms: true,
};

// The account lives under `user` rather than being flattened in: a
// student record and its user row each have their own id and their own
// timestamps (the users row updates independently of this one), so
// merging them would make `id` and `createdAt` ambiguous.
function formatStudent(student) {
  return {
    id: student.id,
    studentId: student.student_id,
    status: student.status,
    createdAt: student.created_at,
    user: formatUserProfile(student.users),
    program: student.programs,
    admissionTerm: student.terms,
  };
}

// `profile` is the validated set of users-table profile columns -- see
// utils/userProfile.js.
async function createStudent({ email, profile, programId, admissionTermId }) {
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
      data: { email, ...profile, password_hash: passwordHash, role_id: role.id },
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
