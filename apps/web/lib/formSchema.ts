import rawSchema from "../../api/src/form-schema/form-schema.json";

export type ScreenDef = (typeof rawSchema.screens)[number];
export const formSchema = rawSchema;
export default rawSchema;
