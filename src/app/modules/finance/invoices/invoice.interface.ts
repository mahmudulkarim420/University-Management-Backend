
// import { InvoiceStatus } from "@prisma/client";

import { InvoiceStatus } from "../../../../generated/prisma/browser";

export interface ICreateInvoiceInput {
    studentId: string;
    description?: string;
    amount: string;
    dueDate: string;
}

export interface IUpdateInvoiceInput {
    description?: string;
    amount?: string;
    dueDate?: string;
}

export interface IInvoiceQuery {
    searchTerm?: string;
    studentId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}


