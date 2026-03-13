import { useMemo } from 'react';
import type { FormField, FormConditionalRule } from '@bytlinks/shared';

/** Returns a Set of field IDs that should be hidden based on conditional rules */
export function useConditionalLogic(
  fields: FormField[],
  rules: FormConditionalRule[] | undefined,
  values: Record<string, unknown>,
): Set<string> {
  return useMemo(() => {
    const hidden = new Set<string>();
    if (!rules?.length) return hidden;

    for (const rule of rules) {
      const fieldValue = String(values[rule.if_field] ?? '');
      let matches = false;

      switch (rule.operator) {
        case 'is':
          matches = fieldValue === rule.value;
          break;
        case 'is_not':
          matches = fieldValue !== rule.value;
          break;
        case 'contains':
          matches = fieldValue.includes(rule.value);
          break;
        case 'is_empty':
          matches = fieldValue === '';
          break;
        case 'is_not_empty':
          matches = fieldValue !== '';
          break;
      }

      if (rule.then_action === 'hide' && matches) {
        hidden.add(rule.target_field);
      }
      if (rule.then_action === 'show' && !matches) {
        hidden.add(rule.target_field);
      }
    }
    return hidden;
  }, [fields, rules, values]);
}
