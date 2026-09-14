

export interface ICreateCoursePayload {
	departmentId: string;
	programId: string;
	subjectId: string;
	code: string;
	title: string;
	description?: string;
	credit: number;
	level?: number;
	isActive?: boolean;
}
