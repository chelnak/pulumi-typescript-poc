import * as pulumi from '@pulumi/pulumi';

export interface INetworkArgs {
  name: string;
  resourceGroupName: string | pulumi.OutputInstance<string>;
  virtualNetowrkPrefix?: string;
  virtualNetworkCIDR?: string;
  subnetCIDR?: string;
  gatewaySubnetCount?: number;
  managementSubnetCount?: number;
  externalSubnetCount?: number;
  internalSubnetCount?: number;
  serviceEndpointList?: string[];
}
