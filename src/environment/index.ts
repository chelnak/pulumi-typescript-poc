import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as network from '../shared/virtualnetwork';
import { getAppServicePlanSku } from '../util';
import * as sql from './sqlserver';
import { IEnvironmentLayerArgs } from '../interfaces/args';
import { IGlobalConfig, IEnvironmentConfig } from '../interfaces/config';

const logger = pulumi.log;

// Get configuration
const layers = new pulumi.Config('layers');
const global = layers.requireObject<IGlobalConfig>('global');
const environment = layers.requireObject<IEnvironmentConfig>('environment');

export class EnvironmentLayer extends pulumi.ComponentResource {
  /**
   * Creates cloud platform management layer
   * @param name The _unique_ name of the resource.
   * @param layerArgs The IEnvironmentLayerArgs to configure the resources in this layer.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, layerArgs: IEnvironmentLayerArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:EnvironmentLayer', name, inputs, opts);

    const prefix = `${global.program}-${layerArgs.name}-${environment.service}`;

    const resourceGroupName = `${prefix}-rg`;
    const resourceGroup = new azure.core.ResourceGroup(resourceGroupName, {
      name: resourceGroupName,
    }, { parent: this });

    const defaultResourceOptions: pulumi.ResourceOptions = { parent: resourceGroup };

    const storageAccoutnName = `${prefix.replace(/-/g, '')}str`;
    const storageAccount = new azure.storage.Account(storageAccoutnName, {
      resourceGroupName: resourceGroup.name,
      name: storageAccoutnName,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, defaultResourceOptions);

    // Improve
    const configStorageAccoutnName = `${global.program}${layerArgs.name}configstr`;
    const configStorageAccount = new azure.storage.Account(configStorageAccoutnName, {
      resourceGroupName: resourceGroup.name,
      name: configStorageAccoutnName,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, defaultResourceOptions);

    const vnetName = `${prefix}-vnet`;
    const vnet = new network.VirtualNetwork(vnetName, {
      name: vnetName,
      resourceGroupName: resourceGroup.name,
      virtualNetowrkPrefix: `10.${layerArgs.count}`,
      gatewaySubnetCount: 1,
      managementSubnetCount: 1,
      internalSubnetCount: 1,
      externalSubnetCount: 1,
    }, defaultResourceOptions);

    environment.appServicePlan.forEach((x) => {
      const appServicePlanName = `${prefix}${x.name}-asp`;
      const appServicePlan = new azure.appservice.Plan(appServicePlanName, {
        name: appServicePlanName,
        resourceGroupName: resourceGroup.name,
        sku: getAppServicePlanSku(x.size),
      }, defaultResourceOptions);
    });

    const redisCacheName = `${prefix}-rds`;
    const redisCache = new azure.redis.Cache(redisCacheName, {
      name: redisCacheName,
      resourceGroupName: resourceGroup.name,
      capacity: 1,
      family: 'C',
      skuName: 'Standard',
    }, defaultResourceOptions);

    const cdnProfileName = `${prefix}-cdn`;
    const cdnProfile = new azure.cdn.Profile(cdnProfileName, {
      name: cdnProfileName,
      resourceGroupName: resourceGroup.name,
      sku: 'Standard_Verizon',
    }, defaultResourceOptions);

    // investigate properties here: https://github.com/SkillsFundingAgency/das-shared-infrastructure/blob/7df7ae873e1a8393f98cf7d482fb6fc71051a309/templates/environment.template.json#L573
    const eventHubNamespaceName = `${prefix}-eh`;
    const eventHubNamespace = new azure.eventhub.Namespace(eventHubNamespaceName, {
      name: eventHubNamespaceName,
      resourceGroupName: resourceGroup.name,
      sku: 'Standard',
      capacity: 0,
    }, defaultResourceOptions);

    const serviceBusNamespaceName = `${prefix}-ns`;
    const serviceBusNamespace = new azure.servicebus.Namespace(serviceBusNamespaceName, {
      name: serviceBusNamespaceName,
      resourceGroupName: resourceGroup.name,
      sku: 'Standard',
    }, defaultResourceOptions);

    const sqlServer = new sql.SqlServer(`${prefix}-sql`, {
      prefix,
      resourceGroupName: resourceGroup.name,
      virtualNetworkFirewallRules: vnet.subnetResourceIds,
    }, { parent: resourceGroup, dependsOn: vnet });
  }
}
