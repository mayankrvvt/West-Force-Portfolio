import { z } from "zod";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined ? {} : value);

const optionalText = z.string().nullish();

/** POST /api/users — every field is optional; missing ones fall back to the Firebase token. */
export const createUserBody = z.preprocess(
  orEmpty,
  z.looseObject({
    email: optionalText,
    displayName: optionalText,
    photoURL: optionalText,
  })
);

/** PUT /api/users/me — only the fields that are sent are changed. */
export const updateUserBody = z.preprocess(
  orEmpty,
  z.looseObject({
    displayName: optionalText,
    photoURL: optionalText,
  })
);

export type CreateUserBody = z.output<typeof createUserBody>;
export type UpdateUserBody = z.output<typeof updateUserBody>;
