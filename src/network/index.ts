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
  for (let i = startFromAddress; i < (startFromAddress + numberOfSubnets); i += 1) {
    const subnetName = `${name}-${count}`;
    const addressPrefix = `${networkArgs.virtualNetowrkPrefix}.${i}.0${networkArgs.subnetCIDR}`;
    logger.info(`Creating subnet ${subnetName} with address prefix of ${addressPrefix}`);

    // Increment naming count
    count += 1;
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
      }, opts),
    );
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
    const n = networkArgs;
    n.virtualNetowrkPrefix = networkArgs.virtualNetowrkPrefix || '10.0';
    n.virtualNetworkCIDR = networkArgs.virtualNetworkCIDR || '/16';
    n.subnetCIDR = networkArgs.subnetCIDR || '/24';
    n.gatewaySubnetCount = networkArgs.gatewaySubnetCount || 0;
    n.managementSubnetCount = networkArgs.managementSubnetCount || 0;
    n.internalSubnetCount = networkArgs.internalSubnetCount || 0;
    n.externalSubnetCount = networkArgs.externalSubnetCount || 0;

    logger.info(`Creating virtual network ${n.name}`);
    const virtualNetwork = new azure.network.VirtualNetwork('virtual-network', {
      name: n.name,
      resourceGroupName: n.resourceGroupName,
      addressSpaces: [`${n.virtualNetowrkPrefix}.0.0${n.virtualNetworkCIDR}`],
    }, defaultResourceOptions);

    const gateway = subnet('gw-sn', n.gatewaySubnetCount, 0, virtualNetwork.name, n, defaultResourceOptions);
    const management = subnet('mgmt-sn', n.managementSubnetCount, 5, virtualNetwork.name, n, defaultResourceOptions);
    const external = subnet('ext-sn', n.externalSubnetCount, 10, virtualNetwork.name, n, defaultResourceOptions);
    const internal = subnet('int-sn', n.internalSubnetCount, 15, virtualNetwork.name, n, defaultResourceOptions);

    this.subnetResourceIds = gateway.concat(management, external, internal).map((s) => s.id);

    // For dependency tracking, register output properties for this component
    this.registerOutputs({
      subnetResourceIds: this.subnetResourceIds,
    });
  }
}
