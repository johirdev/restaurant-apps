/* eslint-disable @typescript-eslint/no-explicit-any */
export const queryPick = (query: any, fields: string[]) => {
  const picked: any = {};
  fields.forEach(field => {
    if (query[field] !== undefined) {
      picked[field] = query[field];
    }
  });
  return picked;
};
