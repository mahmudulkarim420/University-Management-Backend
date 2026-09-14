import { DegreeType } from "../../../../generated/prisma/enums";

export interface ICreateProgramPayload {
	departmentId: string;
	code: string;
	name: string;
	degreeType: DegreeType;
	durationYears: number;
	totalCredits: number;
	description?: string;
}

export interface IUpdateProgram {
	departmentId?: string;
	code?: string;
	name?: string;
	degreeType?: DegreeType;
	durationYears?: number;
	totalCredits?: number;
	description?: string;
	isActive?: boolean;
}
