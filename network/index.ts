import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import { INetworkArgs } from '../interfaces/network';

const logger = pulumi.log;

function subnet(
  name: string,
  numberOfSubnets: any,
  startFromAddress: number,
  virtualNetworkName: string | pulumi.OutputInstance<string>,
  networkArgs: INetworkArgs,
  opts?: pulumi.ResourceOptions,
): azure.network.Subnet[] {

  const subnets = [];
  let count = 0;
  for (let i = startFromAddress; i < (startFromAddress + numberOfSubnets); i++) {
    const subnetName = `${name}-${count}`;
    const addressPrefix = `${networkArgs.virtualNetowrkPrefix}.${i}.0${networkArgs.subnetCIDR}`;
    logger.info(`Creating subnet ${subnetName} with address prefix of ${addressPrefix}`);

    // Increment naming count
    count++;
    subnets.push(
      new azure.network.Subnet(subnetName, {
        addressPrefix,
        virtualNetworkName,
        name: subnetName,
        serviceEndpoints: [
          'Microsoft.Sql',
          'Microsoft.Web',
        ],
        delegations: [{
          name: 'webapp',
          serviceDelegation: {
            name: 'Microsoft.Web/serverFarms',
            actions: [
              'Microsoft.Network/virtualNetworks/subnets/action',
            ],
          },
        }],
        resourceGroupName: networkArgs.resourceGroupName,
      }, opts));

  }
  return subnets;
}

export class VirtualNetwork extends pulumi.ComponentResource {

  readonly subnetResourceIds: pulumi.Output<string>[];

  /**
   * Creates virtual network
   * @param name The _unique_ name of the resource.
   * @param networkArgs The arguments to configure the virtual network.
   * @param opts A bag of options that control this resource's behavior.
   */

  constructor(name: string, networkArgs: INetworkArgs, opts?: pulumi.ResourceOptions) {
    const inputs: pulumi.Inputs = {
      options: opts,
    };

    super('infrastructure:VirtualNetwork', name, inputs, opts);
    const defaultResourceOptions: pulumi.ResourceOptions = { parent: this };

    // Set some reasonable defaults for networkArgs
    networkArgs.virtualNetowrkPrefix = networkArgs.virtualNetowrkPrefix || '10.0';
    networkArgs.virtualNetworkCIDR = networkArgs.virtualNetworkCIDR || '/16';
    networkArgs.subnetCIDR = networkArgs.subnetCIDR || '/24';
    networkArgs.gatewaySubnetCount = networkArgs.gatewaySubnetCount || 1;
    networkArgs.managementSubnetCount = networkArgs.managementSubnetCount || 1;
    networkArgs.internalSubnetCount = networkArgs.internalSubnetCount || 1;
    networkArgs.externalSubnetCount = networkArgs.externalSubnetCount || 1;

    logger.info(`Creating virtual network ${networkArgs.name}`);
    const virtualNetwork = new azure.network.VirtualNetwork('virtual-network', {
      name: networkArgs.name,
      resourceGroupName: networkArgs.resourceGroupName,
      addressSpaces: [`${networkArgs.virtualNetowrkPrefix}.0.0${networkArgs.virtualNetworkCIDR}`],
    }, defaultResourceOptions);

    const gateway = subnet('gw-sn', networkArgs.gatewaySubnetCount, 0, virtualNetwork.name, networkArgs, defaultResourceOptions);
    const management = subnet('mgmt-sn', networkArgs.managementSubnetCount, 5, virtualNetwork.name, networkArgs, defaultResourceOptions);
    const external = subnet('ext-sn', networkArgs.externalSubnetCount, 10, virtualNetwork.name, networkArgs, defaultResourceOptions);
    const internal = subnet('int-sn', networkArgs.internalSubnetCount, 15, virtualNetwork.name, networkArgs, defaultResourceOptions);

    this.subnetResourceIds = gateway.concat(management, external, internal).map(s => s.id);

    // For dependency tracking, register output properties for this component
    this.registerOutputs({
      subnetResourceIds: this.subnetResourceIds,
    });
  }
}
