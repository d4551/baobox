import {
  HasArray,
  HasBoolean,
  HasObject,
  HasPropertyKey,
  HasString,
  IsSchema as isSchemaValue,
  IsSchemaObject as isSchemaObjectValue,
  type XSchema,
} from './shared.js';

function hasKeyword(keyword: string): (schema: XSchema) => boolean {
  return (schema) => isSchemaObjectValue(schema) && HasPropertyKey(schema, keyword);
}

export const IsSchemaObject = (schema: XSchema): boolean => isSchemaObjectValue(schema);
export const IsBooleanSchema = (schema: XSchema): boolean => typeof schema === 'boolean';
export const IsSchema = (schema: XSchema): boolean => isSchemaValue(schema);
export const IsAdditionalItems = hasKeyword('additionalItems');
export const IsAdditionalProperties = hasKeyword('additionalProperties');
export const IsAllOf = hasKeyword('allOf');
export const IsAnchor = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasString(schema, '$anchor');
export const IsAnyOf = hasKeyword('anyOf');
export const IsConst = hasKeyword('const');
export const IsContains = hasKeyword('contains');
export const IsContentEncoding = hasKeyword('contentEncoding');
export const IsContentMediaType = hasKeyword('contentMediaType');
export const IsDefault = hasKeyword('default');
export const IsDefs = hasKeyword('$defs');
export const IsDependencies = hasKeyword('dependencies');
export const IsDependentRequired = hasKeyword('dependentRequired');
export const IsDependentSchemas = hasKeyword('dependentSchemas');
export const IsDynamicAnchor = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasString(schema, '$dynamicAnchor');
export const IsDynamicRef = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasString(schema, '$dynamicRef');
export const IsElse = hasKeyword('else');
export const IsEnum = hasKeyword('enum');
export const IsExclusiveMaximum = hasKeyword('exclusiveMaximum');
export const IsExclusiveMinimum = hasKeyword('exclusiveMinimum');
export const IsFormat = hasKeyword('format');
export const IsGuard = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasObject(schema, '~guard');
export const IsGuardInterface = IsGuard;
export const IsId = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasString(schema, '$id');
export const IsIf = hasKeyword('if');
export const IsItems = hasKeyword('items');
export const IsItemsSized = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasArray(schema, 'prefixItems');
export const IsItemsUnsized = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasPropertyKey(schema, 'items') && !HasArray(schema, 'prefixItems');
export const IsMaxContains = hasKeyword('maxContains');
export const IsMaxItems = hasKeyword('maxItems');
export const IsMaxLength = hasKeyword('maxLength');
export const IsMaxProperties = hasKeyword('maxProperties');
export const IsMaximum = hasKeyword('maximum');
export const IsMinContains = hasKeyword('minContains');
export const IsMinItems = hasKeyword('minItems');
export const IsMinLength = hasKeyword('minLength');
export const IsMinProperties = hasKeyword('minProperties');
export const IsMinimum = hasKeyword('minimum');
export const IsMultipleOf = hasKeyword('multipleOf');
export const IsNot = hasKeyword('not');
export const IsOneOf = hasKeyword('oneOf');
export const IsPattern = hasKeyword('pattern');
export const IsPatternProperties = hasKeyword('patternProperties');
export const IsPrefixItems = hasKeyword('prefixItems');
export const IsProperties = hasKeyword('properties');
export const IsPropertyNames = hasKeyword('propertyNames');
export const IsRecursiveAnchor = hasKeyword('$recursiveAnchor');
export const IsRecursiveAnchorTrue = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasBoolean(schema, '$recursiveAnchor') && schema.$recursiveAnchor === true;
export const IsRecursiveRef = hasKeyword('$recursiveRef');
export const IsRef = hasKeyword('$ref');
export const IsRefine = (schema: XSchema): boolean => isSchemaObjectValue(schema) && HasArray(schema, '~refine');
export const IsRequired = hasKeyword('required');
export const IsThen = hasKeyword('then');
export const IsType = hasKeyword('type');
export const IsUnevaluatedItems = hasKeyword('unevaluatedItems');
export const IsUnevaluatedProperties = hasKeyword('unevaluatedProperties');
export const IsUniqueItems = hasKeyword('uniqueItems');
