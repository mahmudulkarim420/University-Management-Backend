export interface CreateDepartmentPayload {
	facultyId: string;
	code: string;
	name: string;
	description?: string;
    headUserId: string;
}



export interface GetAllDepartmentsPayload {
	page?: number;
	limit?: number;
	search?: string;
	facultyId?: string;
	isActive?: boolean;
}


export interface IUpdateDepartmentPayload {
  code?: string;
  name?: string;
  description?: string | null;
  headUserId?: string | null;
  isActive?: boolean;
};