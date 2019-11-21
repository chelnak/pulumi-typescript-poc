import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as network from '../shared/virtualnetwork';
import { IGlobalConfig, IEnvironmentConfig, IManagementConfig } from '../interfaces/config';

import password = require('generate-password');

const logger = pulumi.log;

// Get configuration
const layers = new pulumi.Config('layers');
const global = layers.requireObject< IGlobalConfig>('global');
const environment = layers.requireObject<IEnvironmentConfig>('environment');
const management = layers.requireObject<IManagementConfig>('management');
const prefix = `${global.program}-${management.name}-${management.service}`;

export class ManagementLayer extends pulumi.ComponentResource {
  /**
   * Creates cloud platform management layer
   * @param name The _unique_ name of the resource.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:ManagementLayer', name, inputs, opts);

    const resourceGroup = new azure.core.ResourceGroup('management-resource-group', {
      name: `${prefix}-rg`,
    }, { parent: this });

    const defaultResourceOptions: pulumi.ResourceOptions = { parent: resourceGroup };

    const storageAccountPrefix = prefix.replace(/-/g, '');
    const storageAccount = new azure.storage.Account('management-storage-account', {
      resourceGroupName: resourceGroup.name,
      name: `${storageAccountPrefix}str`,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, defaultResourceOptions);

    const keyVaultName = `${prefix}-kv`;
    const keyVault = new azure.keyvault.KeyVault(keyVaultName, {
      resourceGroupName: resourceGroup.name,
      name: keyVaultName,
      tenantId: '7a72e127-4c27-4128-88a2-f854ee260ef7',
      skuName: 'Standard',
    }, defaultResourceOptions);

    const defaultAccesPolicyName = `${prefix}-kv-default-access-policy`;
    const accessPolicy = new azure.keyvault.AccessPolicy(defaultAccesPolicyName, {
      keyVaultId: keyVault.id,
      tenantId: '7a72e127-4c27-4128-88a2-f854ee260ef7',
      objectId: '972e2b98-3a0b-4e9c-bdd7-f09b3ea4e720',
      secretPermissions: [
        'get',
        'set',
      ],
    }, { parent: keyVault });

    environment.names.forEach((x) => {
      const envPrefix = `${global.program}-${x}-${environment.service}`;
      const sqlKeyVaultSecret = new azure.keyvault.Secret(`${envPrefix}-sql`, {
        name: `${envPrefix}-sql`,
        value: password.generate({
          length: 10,
          numbers: true,
        }),
        keyVaultId: keyVault.id,
      }, { parent: keyVault, dependsOn: accessPolicy }); // Stupid?
    });

    const vnet = new network.VirtualNetwork('management-vnet', {
      name: `${prefix}-vnet`,
      resourceGroupName: resourceGroup.name,
      managementSubnetCount: 3,
    }, defaultResourceOptions);
  }
}
