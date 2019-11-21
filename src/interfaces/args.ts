import * as pulumi from '@pulumi/pulumi';

export interface IEnvironmentLayerArgs {
  name: string;
  count?: number;
}

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

export interface ISqlArgs {
  prefix: string;
  resourceGroupName: pulumi.Input<string>;
  virtualNetworkFirewallRules: pulumi.Input<string>[];
}
