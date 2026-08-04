import { IGenericErrorMassage } from "../utils/GlobalError";


export type IgenericErrorRespons = {
  statusCode: number;
  message: string;
  errorMessages: IGenericErrorMassage[];
};

// querys return value interface
export type IGenaricRespons<T> = {
  meta: {
    page: number;
    limit: number;
    total: number;
  };
  data: T;
};

export type IGenaricResponsSum<T> = {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalAmount?: number; // ⭐ add this
  };
  data: T;
  totalAmount?: number; // ⭐ add this
};

