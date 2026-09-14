/**
 * University Management System
 * --------------------------------
 * Centralized Business ID Generator
 *
 * NOTE:
 * These IDs are NOT database primary keys.
 * Keep UUID/CUID as the internal database `id`.
 *
 * Example:
 * id        = "550e8400-e29b-41d4-a716-446655440000"
 * studentId = "STU-2026-CSE-0001"
 */

const padNumber = (number: number, length = 4): string => {
    return String(number).padStart(length, "0");
};

const getYear = (date: Date = new Date()): number => {
    return date.getFullYear();
};

/* ============================================================
   FACULTY ID
   Format: FAC-YYYY-XXXX

   Example:
   FAC-2026-0001
   FAC-2026-0002
============================================================ */

export const generateFacultyId = (
    sequence: number,
    date: Date = new Date(),
): string => {
    const year = getYear(date);

    return `FAC-${year}-${padNumber(sequence)}`;
};


/* ============================================================
   DEPARTMENT ID
   Format: DEPT-YYYY-CODE-XXXX

   Example:
   DEPT-2026-CSE-0001
   DEPT-2026-EEE-0001
============================================================ */

export const generateDepartmentId = (
    departmentCode: string,
    sequence: number,
    date: Date = new Date(),
): string => {
    const year = getYear(date);
    const code = departmentCode.toUpperCase();

    return `DEPT-${year}-${code}-${padNumber(sequence)}`;
};


/* ============================================================
   PROGRAM ID
   Format: PROG-YYYY-CODE-XXXX

   Example:
   PROG-2026-CSE-0001
   PROG-2026-BBA-0001
============================================================ */

export const generateProgramId = (
    programCode: string,
    sequence: number,
    date: Date = new Date(),
): string => {
    const year = getYear(date);
    const code = programCode.toUpperCase();

    return `PROG-${year}-${code}-${padNumber(sequence)}`;
};


/* ============================================================
   STUDENT ID
   Format: STU-YYYY-DEPT-XXXX

   Example:
   STU-2026-CSE-0001
   STU-2026-CSE-0002
   STU-2026-EEE-0001
============================================================ */

export const generateStudentId = (
    departmentCode: string,
    sequence: number,
    admissionYear: number = getYear(),
): string => {
    const code = departmentCode.toUpperCase();

    return `STU-${admissionYear}-${code}-${padNumber(sequence)}`;
};


/* ============================================================
   COURSE ID
   Format: CRS-DEPT-XXXX

   Example:
   CRS-CSE-0001
   CRS-EEE-0001
============================================================ */

export const generateCourseId = (
    departmentCode: string,
    sequence: number,
): string => {
    const code = departmentCode.toUpperCase();

    return `CRS-${code}-${padNumber(sequence)}`;
};


/* ============================================================
   SUBJECT ID
   Format: SUBJ-DEPT-XXXX

   Example:
   SUBJ-CSE-0001
   SUBJ-CSE-0002
============================================================ */

export const generateSubjectId = (
    departmentCode: string,
    sequence: number,
): string => {
    const code = departmentCode.toUpperCase();

    return `SUBJ-${code}-${padNumber(sequence)}`;
};


/* ============================================================
   SECTION ID
   Format: SEC-YYYY-COURSE-LETTER

   Example:
   SEC-2026-CSE101-A
   SEC-2026-CSE101-B
============================================================ */

export const generateSectionId = (
    courseCode: string,
    sectionName: string,
    academicYear: number = getYear(),
): string => {
    const course = courseCode.toUpperCase();
    const section = sectionName.toUpperCase();

    return `SEC-${academicYear}-${course}-${section}`;
};


/* ============================================================
   RESOURCE ID
   Format: RES-YYYY-XXXX

   Example:
   RES-2026-0001
   RES-2026-0002
============================================================ */

export const generateResourceId = (
    sequence: number,
    date: Date = new Date(),
): string => {
    const year = getYear(date);

    return `RES-${year}-${padNumber(sequence)}`;
};


/* ============================================================
   REQUEST ID
   Format: REQ-YYYY-TYPE-XXXX

   Example:
   REQ-2026-LEAVE-0001
   REQ-2026-COURSE-0001
   REQ-2026-TRANSFER-0001
============================================================ */

export const generateRequestId = (
    requestType: string,
    sequence: number,
    date: Date = new Date(),
): string => {
    const year = getYear(date);
    const type = requestType.toUpperCase();

    return `REQ-${year}-${type}-${padNumber(sequence)}`;
};















// User Example : 


// import {
//     generateFacultyId,
//     generateDepartmentId,
//     generateProgramId,
//     generateStudentId,
//     generateCourseId,
//     generateSubjectId,
//     generateSectionId,
//     generateResourceId,
//     generateRequestId,
// } from "@/utils/idGenerator";

// const facultyId = generateFacultyId(1);

// const departmentId = generateDepartmentId(
//     "CSE",
//     1,
// );

// const programId = generateProgramId(
//     "CSE",
//     1,
// );

// const studentId = generateStudentId(
//     "CSE",
//     1,
//     2026,
// );

// const courseId = generateCourseId(
//     "CSE",
//     1,
// );

// const subjectId = generateSubjectId(
//     "CSE",
//     1,
// );

// const sectionId = generateSectionId(
//     "CSE101",
//     "A",
//     2026,
// );

// const resourceId = generateResourceId(1);

// const requestId = generateRequestId(
//     "LEAVE",
//     1,
// );