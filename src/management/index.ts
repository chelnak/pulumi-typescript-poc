import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as network from '../shared/virtualnetwork';
import { ILayerArgs } from '../interfaces/args';

import password = require('generate-password');

const logger = pulumi.log;
const environments: string[] = new pulumi.Config('metadata').requireObject('environments');

export class ManagementLayer extends pulumi.ComponentResource {
  /**
   * Creates cloud platform management layer
   * @param name The _unique_ name of the resource.
   * @param layerArgs A bag of options that configure the resources in this layer.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, layerArgs: ILayerArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:ManagementLayer', name, inputs, opts);

    const resourceGroup = new azure.core.ResourceGroup('management-resource-group', {
      name: `${layerArgs.prefix}-rg`,
    }, { parent: this });

    const defaultResourceOptions: pulumi.ResourceOptions = { parent: resourceGroup };

    const storageAccountPrefix = layerArgs.prefix.replace(/-/g, '');
    const storageAccount = new azure.storage.Account('management-storage-account', {
      resourceGroupName: resourceGroup.name,
      name: `${storageAccountPrefix}str`,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, defaultResourceOptions);

    const keyVaultName = `${layerArgs.prefix}-kv`;
    const keyVault = new azure.keyvault.KeyVault(keyVaultName, {
      resourceGroupName: resourceGroup.name,
      name: keyVaultName,
      tenantId: '5f06358f-fd11-4754-94e0-20ee038c4f17',
      skuName: 'Standard',
    }, defaultResourceOptions);

    environments.forEach((x) => {
      const envPrefix = `${layerArgs.program}-${x}-${layerArgs.service}`;
      const sqlKeyVaultSecret = new azure.keyvault.Secret(`${envPrefix}-sql`, {
        name: `${layerArgs.prefix}-sql`,
        value: password.generate({
          length: 10,
          numbers: true,
        }),
        keyVaultId: keyVault.id,
      }, { parent: keyVault });
    });

    const vnet = new network.VirtualNetwork('management-vnet', {
      name: `${layerArgs.prefix}-vnet`,
      resourceGroupName: resourceGroup.name,
      managementSubnetCount: 3,
    }, defaultResourceOptions);
  }
}
