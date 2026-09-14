import { SubjectType } from "../../../../generated/prisma/enums";


export interface ICreateSubject {
	code: string;
	title: string;
	description?: string;
	subjectType?: SubjectType;
	credit: number;
	isActive?: boolean;
}

