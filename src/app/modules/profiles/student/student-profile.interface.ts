
import { Gender, StudentAcademicStatus } from "../../../../generated/prisma/enums";

export interface ICreateStudentProfilePayload {
	studentId?: string;
	programId?: string;
	admissionDate?: Date;
	dateOfBirth?: Date;
	gender?: Gender;
	phone?: string;
	address?: string;
	bloodGroup?: string;
	guardianName?: string;
	guardianPhone?: string;
	academicStatus?: StudentAcademicStatus;
	currentSemesterNo?: number;
}