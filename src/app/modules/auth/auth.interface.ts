import type { Gender, Role } from "../../../generated/prisma/browser";

export interface ILoginUserPayload {
	email: string;
	password: string;
}


export interface IRegisterStudentPayload {
  name: string;
  email: string;
  password: string;

  studentProfile?: {
    programId?: string;
    dateOfBirth?: string;
    gender?: Gender;
    phone?: string;
    address?: string;
    bloodGroup?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
}

export interface IRequestUser {
	id: string;
	email: string;
	name: string;
	role: Role;
}

export interface IGoogleLoginPayload {
	idToken: string;
}

export interface IForgotPasswordPayload {
	email : string
}
export interface IResetPasswordPayload {
	email : string;
	newPassword : string;
	otp : string;
}
