import * as pulumi from '@pulumi/pulumi';
import * as management from './management';
import * as environment from './environment';

const stack = pulumi.getStack();
const config = new pulumi.Config('metadata');
const program = config.get('program');
const service = config.get('service');
const logger = pulumi.log;

logger.info(`Creating management layer for ${stack}`);
let prefix = `${program}-${stack}-${service}`;
const m = new management.ManagementLayer('management-resources', { prefix });

const environments: string[] = config.requireObject('environments');
environments.forEach((x) => {
  prefix = `${program}-${x}-${service}`;
  logger.info(`Creating environment layer for ${x}`);
  const env = new environment.EnvironmentLayer(`${x}-resources`, { prefix }, { parent: m });
});
