import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure';
import * as network from '../network';
import { ILayerArgs } from '../interfaces/management';

const logger = pulumi.log;

export class EnvironmentLayer extends pulumi.ComponentResource {
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

    super('infrastructure:EnvironmentLayer', name, inputs, opts);
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

    const resourceGroupName = `${layerArgs.prefix}-rg`;
    const resourceGroup = new azure.core.ResourceGroup(resourceGroupName, {
      name: resourceGroupName,
    }, defaultResourceOptions);

    const storageAccoutnName = `${layerArgs.prefix.replace(/-/g, '')}str`;
    const storageAccount = new azure.storage.Account(storageAccoutnName, {
      resourceGroupName: resourceGroup.name,
      name: storageAccoutnName,
      accountTier: 'Standard',
      accountReplicationType: 'LRS',
    }, { parent: resourceGroup });

    const vnetName = `${layerArgs.prefix}-vnet`;
    const vnet = new network.VirtualNetwork(vnetName, {
      name: vnetName,
      resourceGroupName: resourceGroup.name,
      gatewaySubnetCount: 1,
      managementSubnetCount: 1,
      internalSubnetCount: 1,
      externalSubnetCount: 1,
    }, { parent: resourceGroup });
  }
}
