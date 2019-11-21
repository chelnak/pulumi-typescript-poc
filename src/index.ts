import * as pulumi from '@pulumi/pulumi';
import * as m from './management';
import * as e from './environment';
import { IEnvironmentConfig } from './interfaces/config';

const logger = pulumi.log;

// Get configuration
const layers = new pulumi.Config('layers');
const environment = layers.requireObject<IEnvironmentConfig>('environment');

const managementLayer = new m.ManagementLayer('management-resources');

environment.names.forEach((x, i) => {
  const environmentLayer = new e.EnvironmentLayer(`${x}-resources`, {
    name: x,
    count: i + 1,
  }, { parent: managementLayer });
});
