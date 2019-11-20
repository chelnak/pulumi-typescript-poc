import * as azure from '@pulumi/azure';

export function getAppServicePlanSku(size: string): azure.types.input.appservice.PlanSku {
  let s = size;
  let tier;
  switch (s.substring(0, 1).toUpperCase()) {
    case 'B':
      tier = 'Basic';
      break;

    case 'S':
      tier = 'Standard';
      break;

    case 'P':
      tier = 'Premium';
      break;

    default:
      s = 'B1';
      tier = 'Basic';
      break;
  }

  const sku = {
    size: s,
    tier,
  };

  return sku;
}
