import { CheckSchemaValue } from './core.js';
import { CollectSchemaErrors } from './error-collector.js';
import { BuildContext, CheckContext, ErrorContext, Stack } from './engine.js';
import { ProjectSchema, type XSchema } from './shared.js';

type BuildFn = (stack: Stack, context: BuildContext, schema: XSchema, value: string) => string;
type CheckFn = (stack: Stack, context: CheckContext, schema: XSchema, value: unknown) => boolean;
type ErrorFn = (stack: Stack, context: ErrorContext, schemaPath: string, instancePath: string, schema: XSchema, value: unknown) => boolean;

function buildFromKeys(keys: readonly string[], defaults: Record<string, unknown> = {}): BuildFn {
  return (_stack, _context, schema, _value) => JSON.stringify(ProjectSchema(schema, keys, defaults));
}

function checkFromKeys(keys: readonly string[], defaults: Record<string, unknown> = {}): CheckFn {
  return (_stack, _context, schema, value) => CheckSchemaValue({}, ProjectSchema(schema, keys, defaults), value);
}

function errorFromKeys(keyword: string, check: CheckFn): ErrorFn {
  return (stack, context, schemaPath, instancePath, schema, value) => {
    if (check(stack, new CheckContext(), schema, value)) {
      return true;
    }
    const projectedErrors = CollectSchemaErrors({}, schema, value);
    projectedErrors.forEach((error) => {
      context.AddError({ keyword, schemaPath, instancePath, params: error });
    });
    return false;
  };
}

export const CanAdditionalPropertiesFast = (schema: XSchema): boolean => typeof schema !== 'boolean';

export const BuildBooleanSchema = buildFromKeys([]);
export const BuildConst = buildFromKeys(['const']);
export const BuildEnum = buildFromKeys(['enum']);
export const BuildType = buildFromKeys(['type']);
export const BuildMinLength = buildFromKeys(['type', 'minLength'], { type: 'string' });
export const BuildMaxLength = buildFromKeys(['type', 'maxLength'], { type: 'string' });
export const BuildPattern = buildFromKeys(['type', 'pattern'], { type: 'string' });
export const BuildFormat = buildFromKeys(['type', 'format'], { type: 'string' });
export const BuildMinimum = buildFromKeys(['type', 'minimum'], { type: 'number' });
export const BuildMaximum = buildFromKeys(['type', 'maximum'], { type: 'number' });
export const BuildExclusiveMinimum = buildFromKeys(['type', 'exclusiveMinimum'], { type: 'number' });
export const BuildExclusiveMaximum = buildFromKeys(['type', 'exclusiveMaximum'], { type: 'number' });
export const BuildMultipleOf = buildFromKeys(['type', 'multipleOf'], { type: 'number' });
export const BuildMinItems = buildFromKeys(['type', 'minItems'], { type: 'array' });
export const BuildMaxItems = buildFromKeys(['type', 'maxItems'], { type: 'array' });
export const BuildUniqueItems = buildFromKeys(['type', 'uniqueItems'], { type: 'array' });
export const BuildItems = buildFromKeys(['type', 'items', 'prefixItems'], { type: 'array' });
export const BuildPrefixItems = buildFromKeys(['type', 'prefixItems'], { type: 'array' });
export const BuildAdditionalItems = buildFromKeys(['type', 'prefixItems', 'items', 'additionalItems'], { type: 'array' });
export const BuildUnevaluatedItems = buildFromKeys(['type', 'prefixItems', 'items', 'unevaluatedItems'], { type: 'array' });
export const BuildContains = buildFromKeys(['type', 'contains'], { type: 'array' });
export const BuildMinContains = buildFromKeys(['type', 'contains', 'minContains'], { type: 'array' });
export const BuildMaxContains = buildFromKeys(['type', 'contains', 'maxContains'], { type: 'array' });
export const BuildMinProperties = buildFromKeys(['type', 'minProperties'], { type: 'object' });
export const BuildMaxProperties = buildFromKeys(['type', 'maxProperties'], { type: 'object' });
export const BuildRequired = buildFromKeys(['type', 'properties', 'required'], { type: 'object' });
export const BuildProperties = buildFromKeys(['type', 'properties', 'required'], { type: 'object' });
export const BuildPatternProperties = buildFromKeys(['type', 'patternProperties'], { type: 'object' });
export const BuildAdditionalProperties = buildFromKeys(['type', 'properties', 'patternProperties', 'additionalProperties'], { type: 'object' });
export const BuildAdditionalPropertiesFast = BuildAdditionalProperties;
export const BuildAdditionalPropertiesStandard = BuildAdditionalProperties;
export const BuildUnevaluatedProperties = buildFromKeys(['type', 'properties', 'patternProperties', 'unevaluatedProperties'], { type: 'object' });
export const BuildPropertyNames = buildFromKeys(['type', 'propertyNames'], { type: 'object' });
export const BuildDependencies = buildFromKeys(['type', 'dependencies'], { type: 'object' });
export const BuildDependentRequired = buildFromKeys(['type', 'dependentRequired'], { type: 'object' });
export const BuildDependentSchemas = buildFromKeys(['type', 'dependentSchemas'], { type: 'object' });
export const BuildAllOf = buildFromKeys(['allOf']);
export const BuildAnyOf = buildFromKeys(['anyOf']);
export const BuildOneOf = buildFromKeys(['oneOf']);
export const BuildNot = buildFromKeys(['not']);
export const BuildIf = buildFromKeys(['if', 'then', 'else']);
export const BuildRef = buildFromKeys(['$ref']);
export const BuildRecursiveRef = buildFromKeys(['$recursiveRef']);
export const BuildSchema = (_stack: Stack, _context: BuildContext, schema: XSchema, _value: string): string => JSON.stringify(schema);

export const CheckBooleanSchema = (_stack: Stack, _context: CheckContext, schema: XSchema, value: unknown): boolean => CheckSchemaValue({}, schema, value);
export const CheckConst = checkFromKeys(['const']);
export const CheckEnum = checkFromKeys(['enum']);
export const CheckType = checkFromKeys(['type']);
export const CheckMinLength = checkFromKeys(['type', 'minLength'], { type: 'string' });
export const CheckMaxLength = checkFromKeys(['type', 'maxLength'], { type: 'string' });
export const CheckPattern = checkFromKeys(['type', 'pattern'], { type: 'string' });
export const CheckFormat = checkFromKeys(['type', 'format'], { type: 'string' });
export const CheckMinimum = checkFromKeys(['type', 'minimum'], { type: 'number' });
export const CheckMaximum = checkFromKeys(['type', 'maximum'], { type: 'number' });
export const CheckExclusiveMinimum = checkFromKeys(['type', 'exclusiveMinimum'], { type: 'number' });
export const CheckExclusiveMaximum = checkFromKeys(['type', 'exclusiveMaximum'], { type: 'number' });
export const CheckMultipleOf = checkFromKeys(['type', 'multipleOf'], { type: 'number' });
export const CheckMinItems = checkFromKeys(['type', 'minItems'], { type: 'array' });
export const CheckMaxItems = checkFromKeys(['type', 'maxItems'], { type: 'array' });
export const CheckUniqueItems = checkFromKeys(['type', 'uniqueItems'], { type: 'array' });
export const CheckItems = checkFromKeys(['type', 'items', 'prefixItems'], { type: 'array' });
export const CheckPrefixItems = checkFromKeys(['type', 'prefixItems'], { type: 'array' });
export const CheckAdditionalItems = checkFromKeys(['type', 'prefixItems', 'items', 'additionalItems'], { type: 'array' });
export const CheckUnevaluatedItems = checkFromKeys(['type', 'prefixItems', 'items', 'unevaluatedItems'], { type: 'array' });
export const CheckContains = checkFromKeys(['type', 'contains'], { type: 'array' });
export const CheckMinContains = checkFromKeys(['type', 'contains', 'minContains'], { type: 'array' });
export const CheckMaxContains = checkFromKeys(['type', 'contains', 'maxContains'], { type: 'array' });
export const CheckMinProperties = checkFromKeys(['type', 'minProperties'], { type: 'object' });
export const CheckMaxProperties = checkFromKeys(['type', 'maxProperties'], { type: 'object' });
export const CheckRequired = checkFromKeys(['type', 'properties', 'required'], { type: 'object' });
export const CheckProperties = checkFromKeys(['type', 'properties', 'required'], { type: 'object' });
export const CheckPatternProperties = checkFromKeys(['type', 'patternProperties'], { type: 'object' });
export const CheckAdditionalProperties = checkFromKeys(['type', 'properties', 'patternProperties', 'additionalProperties'], { type: 'object' });
export const CheckUnevaluatedProperties = checkFromKeys(['type', 'properties', 'patternProperties', 'unevaluatedProperties'], { type: 'object' });
export const CheckPropertyNames = checkFromKeys(['type', 'propertyNames'], { type: 'object' });
export const CheckDependencies = checkFromKeys(['type', 'dependencies'], { type: 'object' });
export const CheckDependentRequired = checkFromKeys(['type', 'dependentRequired'], { type: 'object' });
export const CheckDependentSchemas = checkFromKeys(['type', 'dependentSchemas'], { type: 'object' });
export const CheckAllOf = checkFromKeys(['allOf']);
export const CheckAnyOf = checkFromKeys(['anyOf']);
export const CheckOneOf = checkFromKeys(['oneOf']);
export const CheckNot = checkFromKeys(['not']);
export const CheckIf = checkFromKeys(['if', 'then', 'else']);
export const CheckRef = (_stack: Stack, _context: CheckContext, schema: XSchema, value: unknown): boolean => CheckSchemaValue({}, schema, value);
export const CheckRecursiveRef = CheckRef;
export const CheckSchema = (_stack: Stack, _context: CheckContext, schema: XSchema, value: unknown): boolean => CheckSchemaValue({}, schema, value);

export const ErrorBooleanSchema = errorFromKeys('type', CheckBooleanSchema);
export const ErrorConst = errorFromKeys('const', CheckConst);
export const ErrorEnum = errorFromKeys('enum', CheckEnum);
export const ErrorType = errorFromKeys('type', CheckType);
export const ErrorMinLength = errorFromKeys('minLength', CheckMinLength);
export const ErrorMaxLength = errorFromKeys('maxLength', CheckMaxLength);
export const ErrorPattern = errorFromKeys('pattern', CheckPattern);
export const ErrorFormat = errorFromKeys('format', CheckFormat);
export const ErrorMinimum = errorFromKeys('minimum', CheckMinimum);
export const ErrorMaximum = errorFromKeys('maximum', CheckMaximum);
export const ErrorExclusiveMinimum = errorFromKeys('exclusiveMinimum', CheckExclusiveMinimum);
export const ErrorExclusiveMaximum = errorFromKeys('exclusiveMaximum', CheckExclusiveMaximum);
export const ErrorMultipleOf = errorFromKeys('multipleOf', CheckMultipleOf);
export const ErrorMinItems = errorFromKeys('minItems', CheckMinItems);
export const ErrorMaxItems = errorFromKeys('maxItems', CheckMaxItems);
export const ErrorUniqueItems = errorFromKeys('uniqueItems', CheckUniqueItems);
export const ErrorItems = errorFromKeys('items', CheckItems);
export const ErrorPrefixItems = errorFromKeys('prefixItems', CheckPrefixItems);
export const ErrorAdditionalItems = errorFromKeys('additionalItems', CheckAdditionalItems);
export const ErrorUnevaluatedItems = errorFromKeys('unevaluatedItems', CheckUnevaluatedItems);
export const ErrorContains = errorFromKeys('contains', CheckContains);
export const ErrorMinContains = errorFromKeys('minContains', CheckMinContains);
export const ErrorMaxContains = errorFromKeys('maxContains', CheckMaxContains);
export const ErrorMinProperties = errorFromKeys('minProperties', CheckMinProperties);
export const ErrorMaxProperties = errorFromKeys('maxProperties', CheckMaxProperties);
export const ErrorRequired = errorFromKeys('required', CheckRequired);
export const ErrorProperties = errorFromKeys('properties', CheckProperties);
export const ErrorPatternProperties = errorFromKeys('patternProperties', CheckPatternProperties);
export const ErrorAdditionalProperties = errorFromKeys('additionalProperties', CheckAdditionalProperties);
export const ErrorUnevaluatedProperties = errorFromKeys('unevaluatedProperties', CheckUnevaluatedProperties);
export const ErrorPropertyNames = errorFromKeys('propertyNames', CheckPropertyNames);
export const ErrorDependencies = errorFromKeys('dependencies', CheckDependencies);
export const ErrorDependentRequired = errorFromKeys('dependentRequired', CheckDependentRequired);
export const ErrorDependentSchemas = errorFromKeys('dependentSchemas', CheckDependentSchemas);
export const ErrorAllOf = errorFromKeys('allOf', CheckAllOf);
export const ErrorAnyOf = errorFromKeys('anyOf', CheckAnyOf);
export const ErrorOneOf = errorFromKeys('oneOf', CheckOneOf);
export const ErrorNot = errorFromKeys('not', CheckNot);
export const ErrorIf = errorFromKeys('if', CheckIf);
export const ErrorRef = errorFromKeys('$ref', CheckRef);
export const ErrorRecursiveRef = errorFromKeys('$recursiveRef', CheckRecursiveRef);
export const ErrorSchema = errorFromKeys('schema', CheckSchema);
