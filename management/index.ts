import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as network from '../network';
import { LayerArgs } from '../interfaces/management';

const logger = pulumi.log;

export class ManagementLayer extends pulumi.ComponentResource {

  /**
   * Creates cloud platform management layer
   * @param name The _unique_ name of the resource.
   * @param layerArgs A bag of options that configure the resources in this layer.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, layerArgs: LayerArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:ManagementLayer', name, inputs, opts);
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

    const resourceGroup = new azure.core.ResourceGroup('management-resource-group', {
      name: `${layerArgs.prefix}-rg`,
    }, defaultResourceOptions);

    const storageAccountPrefix = layerArgs.prefix.replace(/-/g, '');
    const storageAccount = new azure.storage.Account('management-storage-account', {
      resourceGroupName: resourceGroup.name,
      name: `${storageAccountPrefix}str`,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, { parent: resourceGroup });

    const vnet = new network.VirtualNetwork('management-vnet', {
      name: `${layerArgs.prefix}-vnet`,
      resourceGroupName: resourceGroup.name,
      managementSubnetCount: 3,
    }, { parent: resourceGroup });

  }
}
