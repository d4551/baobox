import { Code, Compile, Validator } from '../compile/index.js';
import { Schema, To } from './schema.js';

export { Code, Compile, Schema, To, Validator };
export type { JsonSchemaOptions, JsonSchemaResult } from './schema.js';

const SchemaModule = { Code, Compile, Schema, To, Validator };

export default SchemaModule;
